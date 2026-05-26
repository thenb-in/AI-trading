// In-process invocation of an existing express report handler with a
// fake req/res pair.
//
// Why this exists: every report controller in app/server/src/views/reports/
// is shaped as `async (req, res) => { ...; sendSuccess(res, { data }) }`.
// The runner needs to call the same logic without HTTP. Refactoring every
// controller to a callable service function would touch dozens of files
// for the same payload; this shim achieves zero-touch reuse by faking the
// req/res surface those handlers actually use (req.user, req.query, plus
// res.status().json()).
//
// The shim is deliberately narrow — it does NOT impersonate full Express
// (no cookies, no middleware chain, no streaming). If a controller ever
// reaches for something missing here, add it explicitly and document the
// reason. Don't expand the surface speculatively.

function invokeExpressHandler(handler, { user, filters }) {
  if (typeof handler !== 'function') {
    throw new Error(`invokeExpressHandler: handler must be a function got : ${typeof handler}`);
  }
  return new Promise((resolve, reject) => {
    // processFilters() mutates req.query in place, so hand it a fresh copy.
    const fakeReq = {
      user,
      query: { ...(filters || {}) },
      headers: {},
      params: {},
      body: {},
      cookies: {}
    };

    let settled = false;
    const settle = (fn, value) => {
      if (settled) {
        return;
      }
      settled = true;
      fn(value);
    };

    const fakeRes = {
      statusCode: 200,
      _headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      set(name, value) {
        this._headers[name] = value;
        return this;
      },
      setHeader(name, value) {
        this._headers[name] = value;
        return this;
      },
      getHeader(name) {
        return this._headers[name];
      },
      json(body) {
        if (this.statusCode >= 400) {
          return settle(reject, new Error(body?.message || body?.error || `HTTP ${this.statusCode}`));
        }
        // The reportApi response envelope is { success, message, data: <api> }
        // where <api> is what processApiData() consumes on the client. The
        // socket handler resolves with that inner payload so client-side
        // processApiData stays the only thing that knows the shape.
        return settle(resolve, body?.data ?? body);
      },
      send(body) {
        return this.json(body);
      },
      end() {
        return settle(resolve, this._lastJson ?? null);
      }
    };

    Promise.resolve()
      .then(() => handler(fakeReq, fakeRes, (err) => {
        // Express `next(err)` path — controllers normally don't hit this
        // because they handle errors in-handler, but support it anyway.
        if (err) {
          settle(reject, err);
        }
      }))
      .catch((err) => settle(reject, err));
  });
}

module.exports = { invokeExpressHandler };
