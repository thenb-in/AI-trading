/**
 * Build a readable message from an API failure.
 *
 * The axios interceptor rejects with the response body, so a rejection is one of:
 *  - { errors: [...] }   express-validator (400) - entries are strings or { msg }/{ message }
 *  - { message }         sendError responses
 *  - { error }           controllers that reply with a bare error string
 *  - Error               network / thrown client-side
 *  - string              a plain-text response body
 */
const getApiErrorMessage = (error, fallback = 'Request failed') => {
  const body = error?.response?.data ?? error;
  if (typeof body === 'string') return body || fallback;

  const details = (Array.isArray(body?.errors) ? body.errors : [])
    .map((e) => (typeof e === 'string' ? e : e?.msg || e?.message || e?.error))
    .filter(Boolean);

  if (details.length > 0) {
    return `Validation error: ${details.join('; ')}`;
  }

  return body?.error || body?.message || error?.message || fallback;
};

export { getApiErrorMessage };
