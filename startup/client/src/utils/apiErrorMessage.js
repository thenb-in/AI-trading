/**
 * Build a readable message from an API failure.
 *
 * The axios interceptor rejects with the response body, so a rejection is one of:
 *  - { errors: [...] }   express-validator (400) - entries are strings or { msg }/{ message }
 *  - { message }         sendError responses
 *  - Error               network / thrown client-side
 */
const getApiErrorMessage = (error, fallback = 'Request failed') => {
  const body = error?.response?.data ?? error;

  const details = (Array.isArray(body?.errors) ? body.errors : [])
    .map((e) => (typeof e === 'string' ? e : e?.msg || e?.message || e?.error))
    .filter(Boolean);

  if (details.length > 0) {
    return `Validation error: ${details.join('; ')}`;
  }

  return body?.message || error?.message || fallback;
};

export { getApiErrorMessage };
