const jwt = require('jsonwebtoken');
const logger = require('../../../logger');
const db = require('../../models');
const sessionService = require('../../services/auth/sessionService');
const { generateAccessToken, generateRefreshToken } = require('../authUtils');
const { validateRefreshToken } = require('./tokenUtils');
const { REFRESH_ROTATION_GRACE_MS } = require('../../constants/auth');


const handleRefreshToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = await validateRefreshToken(refreshToken);
  } catch (err) {
    const stale = jwt.decode(refreshToken);
    if (stale?.sid && stale?.id) {
      try {
        await sessionService.revokeSessions({ userId: stale.id, sessionId: stale.sid });
      } catch (revokeErr) {
        logger.warn(`Could not retire expired session ${stale.sid}: ${revokeErr.message}`);
      }
    }
    throw err;
  }

  const tx = await db.sequelize.transaction();
  try {
    const session = await sessionService.findSessionForRefresh({ sid: decoded.sid, refreshToken }, tx);

    if (!session || session.revoked_at) {
      throw new Error(`No active session for refresh (user ${decoded.id})`);
    }

    const user = await db.User.findByPk(session.user_id, {
      attributes: ['id', 'isActive', 'company_id'],
      transaction: tx
    });
    if (!user || !user.isActive) {
      throw new Error(`User missing or inactive ${session.user_id}`);
    }

    const claims = { id: user.id, company_id: decoded.company_id || user.company_id, sid: session.id };

    // Current token → rotate to a fresh pair.
    if (session.refresh_token === refreshToken) {
      const access = await generateAccessToken(claims, session.id);
      const refresh = await generateRefreshToken(claims, session.id);
      await sessionService.rotateSessionToken(session, refresh, tx);
      await tx.commit();
      return { user: claims, tokens: { access, refresh }, isRefresher: true };
    }

    // The just-superseded token, still inside the grace window → a parallel
    // request that raced the winner. Converge: hand back the CURRENT tokens
    // (fresh access, current refresh) without rotating again.
    const withinGrace = session.previous_refresh_token === refreshToken
      && session.rotated_at
      && (Date.now() - new Date(session.rotated_at).getTime()) <= REFRESH_ROTATION_GRACE_MS;
    if (withinGrace) {
      const access = await generateAccessToken(claims, session.id);
      await sessionService.markSessionActive(session, tx);
      await tx.commit();
      return { user: claims, tokens: { access, refresh: session.refresh_token }, isRefresher: true };
    }
    logger.warn(`Refresh token reuse detected for session ${session.id} (user ${session.user_id}) — revoking`);
    await sessionService.revokeSessions({ userId: session.user_id, sessionId: session.id }, tx);
    await tx.commit();
    throw new Error(`Refresh token reuse detected for session ${session.id} of user ${session.user_id}`);
  } catch (err) {
    if (!tx.finished) {
      try {
        await tx.rollback();
      } catch (rb) {
        logger.error(`Rollback failed for refresh of user ${decoded.id}: ${rb.message}`, rb);
      }
    }
    throw err;
  }
};

module.exports = {
  handleRefreshToken
};
