// View layer for the Zerodha auth + diagnostics endpoints.
//
// NOTE: the OAuth login redirect and the callback success/error HTML are
// browser responses, carried over verbatim from source (no envelope). The
// diagnostic JSON endpoints wrap their payload in the framework { success, data }
// envelope (failures: { success:false, error, message } with the same codes).
const env = require('../config/env');
const zerodhaAuthController = require('../controllers/zerodhaAuthController');

function loginView(_req, res) {
  try {
    const loginUrl = zerodhaAuthController.getLoginURL();
    res.redirect(loginUrl);
  } catch (err) {
    const message = zerodhaAuthController.getErrorMessage(err);
    res.status(500).json({ success: false, error: 'Zerodha login failed', message });
  }
}

async function callbackView(req, res) {
  try {
    const requestToken = req.query.request_token;
    if (typeof requestToken !== 'string' || !requestToken.trim()) {
      res.status(400).send('Missing request_token');
      return;
    }
    await zerodhaAuthController.generateSession(requestToken);
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2;url=${frontendUrl}">
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4}
.box{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.1)}
h2{color:#0d9488;margin:0 0 .5rem}p{color:#6b7280;margin:0 0 1rem}a{color:#2563eb}</style></head>
<body><div class="box"><h2>✓ Zerodha Login Successful</h2>
<p>Redirecting to dashboard in 2 seconds…</p>
<a href="${frontendUrl}">Click here if not redirected</a></div></body></html>`);
  } catch (err) {
    const message = zerodhaAuthController.getErrorMessage(err);
    res.status(502).send(`Login failed: ${message}. <a href="javascript:history.back()">Go back</a>`);
  }
}

async function profileView(_req, res) {
  try {
    const profile = await zerodhaAuthController.getProfile();
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(502).json({ success: false, error: `Zerodha profile fetch failed`, message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

async function instrumentsView(_req, res) {
  try {
    const instruments = await zerodhaAuthController.getInstruments();
    res.json({ success: true, data: instruments });
  } catch (err) {
    res.status(502).json({ success: false, error: `Zerodha instruments fetch failed`, message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

async function ltpView(req, res) {
  try {
    const token = req.params.token;
    if (!token?.trim()) {
      res.status(400).json({ success: false, error: 'Missing token' }); return;
    }
    const ltp = await zerodhaAuthController.getLTP(token);
    res.json({ success: true, data: ltp });
  } catch (err) {
    res.status(502).json({ success: false, error: `Zerodha LTP fetch failed`, message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

async function debugNiftyView(_req, res) {
  try {
    res.json({ success: true, data: await zerodhaAuthController.debugNifty() });
  } catch (err) {
    res.status(502).json({ success: false, error: 'Debug fetch failed', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

async function debugNiftyIndicesView(_req, res) {
  try {
    res.json({ success: true, data: await zerodhaAuthController.debugNiftyIndices() });
  } catch (err) {
    res.status(502).json({ success: false, error: 'Debug fetch failed', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

module.exports = {
  loginView,
  callbackView,
  profileView,
  instrumentsView,
  ltpView,
  debugNiftyView,
  debugNiftyIndicesView
};
