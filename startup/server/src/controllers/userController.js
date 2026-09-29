const logger = require('../../logger');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const authService = require('../services/authService');
const userService = require('../services/userService');
const { getWalletUserManagementUrl } = require('../sso/utils/walletUrl');
const authController = require('./authController');
const { connectionsByUser, disconnectSession } = require('../socket/utils/presence');
const { sendSuccess, sendError } = require('../utils/response');
const allowedPermissions = require('../utils/allowedPermissions');
const { withExtendedCompany } = require('../services/companyPayloadRegistry');
const sessionService = require('../services/auth/sessionService');
const env = require('../config/env');

const getAllUsers = async (req, res) => {
  const companyId = req.user.company_id;

  try {
    // Two different questions arrive here. Pickers and report filters ask "who
    // is in this company" to show names; the user screen asks for the roster
    // itself. Only the second one comes with contact details, device access and
    // roles, and only for whoever may open that screen.
    const canManageUsers = await allowedPermissions(req.user.id, [MASTER_PERMISSION_CONSTANTS.USER.read.name]);
    if (!canManageUsers) {
      return res.status(200).json({ users: await userService.getUserRoster(companyId), roles: [] });
    }

    const users = await userService.getAllUsers(companyId);
    res.status(200).json({ ...users, walletUserManagementUrl: getWalletUserManagementUrl() });
  } catch (error) {
    logger.error('Get all users error', error);
    res.status(500).json({ error: `Error in getting all users from company ${companyId} ${error.message}` });
  }
};

const deactivateUser = async (req, res) => {
  const requiredPermission = MASTER_PERMISSION_CONSTANTS.USER.deactivate.name;
  const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
  }
  const { userId } = req.params;
  const user = await userService.getUserById(userId);
  try {
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // One way to deactivate: ends the user's sessions and runs what apps hooked onto deactivation.
    await userService.setUserApproved(userId, false);

    res.status(200).json({ message: `User deactivated successfully ${user.username}` });  // todo: show username instead of userId
  } catch (error) {
    logger.error('Deactivate user error', error);
    res.status(500).json({ error: `Error in deactivating user ${user.username} ${error.message}` });
  }
};

// Who is signed in and on which devices, plus who is at the keyboard right now.
// Two facts: a live login session (a device that can refresh back in without a
// password — the durable half) and a live socket (someone has the app open this
// moment). Devices carry their session id so a single one can be signed out.
const getUserSessions = async (req, res) => {
  const companyId = req.user.company_id;
  try {
    const activeSince = new Date(Date.now() - env.MAX_JWT_REFRESH_EXPIRATION_MS);
    const durableByUser = await sessionService.listActiveSessionsByCompany(companyId, activeSince);
    const liveByUser = connectionsByUser(companyId);

    const sessions = {};
    for (const userId of new Set([...durableByUser.keys(), ...liveByUser.keys()])) {
      const devices = durableByUser.get(userId) || [];
      const live = liveByUser.get(userId) || [];
      sessions[userId] = {
        online: live.length > 0,
        signedIn: devices.length > 0,
        lastActive: devices[0]?.lastActive ?? null, // rows come newest-first
        devices
      };
    }
    return sendSuccess(res, { data: { sessions } });
  } catch (error) {
    logger.error(`Get user sessions error for company ${companyId}: ${error.message}`, error);
    return sendError(res, { message: `Error in reading sessions for company ${companyId}: ${error.message}` });
  }
};

// Signing someone out is the same operation as their own Logout — the one in
// authController — so it is that one being called, not a second version of it.
// The account stays approved: this is the "signed in on a device they no longer
// have" button, not a deactivation.
const signOutUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await userService.getUserById(userId);
    await authController.logout(userId);
    return sendSuccess(res, { message: `${user.username} has been signed out of every device` });
  } catch (error) {
    logger.error(`Sign out user ${userId} error: ${error.message}`, error);
    return sendError(res, { message: `Error in signing out user ${userId}: ${error.message}` });
  }
};

const signOutDevice = async (req, res) => {
  const { userId, sessionId } = req.params;
  try {
    const revoked = await sessionService.revokeSessions({ userId, sessionId });
    if (!revoked) {
      return sendError(res, { message: `Device session ${sessionId} of user ${userId} was not found or is already signed out` });
    }
    // Its open tabs go quiet now, not when their access token lapses.
    disconnectSession(sessionId);
    return sendSuccess(res, { message: 'Device signed out' });
  } catch (error) {
    logger.error(`Sign out device ${sessionId} for user ${userId} error: ${error.message}`, error);
    return sendError(res, { message: `Error in signing out device ${sessionId}: ${error.message}` });
  }
};

const getMe = async (req, res) => {
  try {
    const userData=req.user;
    const user = await withExtendedCompany(await authService.getCurrentUser(userData.id));
    res.status(200).json(user);
  } catch (error) {
    logger.error('Error in getMe', error);
    res.status(401).json({ error: error.message });
  }
};


const deleteUser = async (req, res) => {
  const requiredPermission = MASTER_PERMISSION_CONSTANTS.USER.delete.name;
  const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
  }
  const { userId } = req.params;
  try {
    await userService.deleteUser(userId);
    res.status(200).json({ message: `User deleted successfully ${userId}` });  // todo: show username instead of userId
  } catch (error) {
    logger.error('Delete user', error);
    res.status(500).json({ error: `Error in deleting user ${userId} ${error.message}` });
  }
};

const updateUserRole=async(req,res)=>{
  try {
    const { userId } = req.params;
    const { role } = req.body;
    await userService.updateUserRole(userId, role);
    res.status(200).json({ message: `User role updated successfully ${userId}` });  // todo: show username instead of userId
  } catch (error) {
    logger.error('Update user role', error);
    res.status(500).json({ error: `Error in updating user role ${error.message}` });
  }
};
const updateUserDeviceAccess=async(req,res)=>{
  try {
    const { userId } = req.params;
    const { deviceAccess } = req.body;
    await userService.updateUserDeviceAccess(userId, deviceAccess);
    res.status(200).json({ message: `User device access updated successfully ${userId}` });  // todo: show username instead of userId
  } catch (error) {
    logger.error('Update user device access', error);
    res.status(500).json({ error: `Error in updating user device access ${error.message}` });
  }
};

const updateUserProfile=async(req,res)=>{
  try {

    const { userId,userProfile } = req.body;
    await userService.updateUserProfile(userId, userProfile);
    res.status(200).json({ message: `User profile updated successfully ${userId}` });  // todo: show username instead of userId
  } catch (error) {
    logger.error('Update user profile error', error);
    res.status(500).json({ error: `Error in updating user profile ${error.message}` });
  }
};


const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, username, email } = req.body;
    const user = await userService.updateUserBasic(userId, { name, phone, username, email });
    res.status(200).json({
      message: `User updated successfully for userid : ${userId}`,
      user: { id: user.id, name: user.name, phone: user.phone, username: user.username, email: user.email }
    });
  } catch (error) {
    logger.error('Update user error', error);
    res.status(400).json({ error: error.message || 'Error updating user' });
  }
};

module.exports = {
  getAllUsers,
  getUserSessions,
  signOutUser,
  signOutDevice,
  deactivateUser,
  getMe,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess,
  updateUserProfile,
  updateUser
};
