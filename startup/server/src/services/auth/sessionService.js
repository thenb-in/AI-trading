const { Op } = require('sequelize');
const db = require('../../models');
const { describeDevice } = require('../../utils/describeDevice');
const { UserSession } = db;

// A fresh login's session; the caller picks the id (sid) so it is already in the tokens.
const createSession = ({ id, userId, refreshToken, ip, userAgent }) => {
  const now = new Date();
  return UserSession.create({
    id,
    user_id: userId,
    refresh_token: refreshToken,
    rotated_at: now,
    device_label: describeDevice(userAgent),
    ip: ip || null,
    user_agent: userAgent || null,
    created_at: now,
    last_active: now
  });
};

// The session a refresh token belongs to, locked: by its sid, or by the token for pre-sid tokens.
const findSessionForRefresh = ({ sid, refreshToken }, transaction) => {
  const locked = { lock: transaction.LOCK.UPDATE, transaction };
  return sid
    ? UserSession.findByPk(sid, locked)
    : UserSession.findOne({ where: { refresh_token: refreshToken, revoked_at: null }, ...locked });
};

// Put a new refresh token on a session, keeping the old one as previous for the grace window.
const rotateSessionToken = (session, refreshToken, transaction) => {
  const now = new Date();
  return session.update({
    previous_refresh_token: session.refresh_token,
    refresh_token: refreshToken,
    rotated_at: now,
    last_active: now
  }, { transaction });
};

// Mark a session used just now, without a new token.
const markSessionActive = (session, transaction) =>
  session.update({ last_active: new Date() }, { transaction });

// A new token on a device's existing session (e.g. switching company); a signed-out one stays out.
const reissueSessionToken = async ({ id, userId, refreshToken, ip, userAgent }) => {
  const session = await UserSession.findByPk(id);
  if (!session) {
    return createSession({ id, userId, refreshToken, ip, userAgent });
  }
  if (session.revoked_at) {
    return null;
  }
  return rotateSessionToken(session, refreshToken);
};

// Sign out one session (sessionId) or every live one of the user; returns how many.
const revokeSessions = async ({ userId, sessionId }, transaction) => {
  const [count] = await UserSession.update(
    { revoked_at: new Date() },
    {
      where: { user_id: userId, revoked_at: null, ...(sessionId ? { id: sessionId } : {}) },
      transaction
    }
  );
  return count;
};

// Whether a session is signed out; a missing row counts as signed out.
const isSessionRevoked = async (sessionId) => {
  const session = await UserSession.findByPk(sessionId, { attributes: ['revoked_at'] });
  return !session || Boolean(session.revoked_at);
};

// A company's signed-in sessions by user id, newest first; `activeSince` drops ones idle past it.
const listActiveSessionsByCompany = async (companyId, activeSince = null) => {
  const rows = await UserSession.findAll({
    where: {
      revoked_at: null,
      ...(activeSince ? { last_active: { [Op.gte]: activeSince } } : {})
    },
    include: [{
      model: db.User,
      as: 'user',
      attributes: [],
      where: { company_id: companyId },
      required: true
    }],
    attributes: ['id', 'user_id', 'device_label', 'ip', 'created_at', 'last_active'],
    order: [['last_active', 'DESC']]
  });

  const byUser = new Map();
  for (const row of rows) {
    const key = String(row.user_id);
    const list = byUser.get(key) || [];
    list.push({
      id: row.id,
      label: row.device_label || 'Unknown device',
      ip: row.ip,
      since: row.created_at,
      lastActive: row.last_active
    });
    byUser.set(key, list);
  }
  return byUser;
};

module.exports = {
  createSession,
  findSessionForRefresh,
  rotateSessionToken,
  markSessionActive,
  reissueSessionToken,
  revokeSessions,
  isSessionRevoked,
  listActiveSessionsByCompany
};
