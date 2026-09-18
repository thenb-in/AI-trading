const requirePermission = require('./requirePermission');

/**
 * Approve (status 1) needs the master's approve permission; anything else sent to a status
 * route is a reject and needs its reject permission. The status is read as a number, so "1"
 * from a form and 1 from JSON ask for the same grant.
 */
const statusPermission = (master) => (req, res, next) =>
  requirePermission(Number(req.body?.status) === 1 ? master.approve.name : master.reject.name)(req, res, next);

module.exports = statusPermission;
