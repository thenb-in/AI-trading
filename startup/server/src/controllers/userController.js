const logger = require('../../logger');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const authService = require('../services/authService');
const userService = require('../services/userService');
const { getWalletUserManagementUrl } = require('../sso/utils/walletUrl');
const authController = require('./authController');
const { connectionsByUser } = require('../socket/utils/presence');
const { sendSuccess, sendError } = require('../utils/response');
const allowedPermissions = require('../utils/allowedPermissions');
const { withExtendedCompany } = require('../services/companyPayloadRegistry');

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

    // Deactivate user
    user.is_approved = false;

    user.refresh_token=null;
    await user.save();

    res.status(200).json({ message: `User deactivated successfully ${user.username}` });  // todo: show username instead of userId
  } catch (error) {
    logger.error('Deactivate user error', error);
    res.status(500).json({ error: `Error in deactivating user ${user.username} ${error.message}` });
  }
};

// Who is signed in and who is at the keyboard. Two different facts: a token on
// the user row means the account can come straight back in without a password,
// a live socket means someone has the app open right now.
const getUserSessions = async (req, res) => {
  const companyId = req.user.company_id;
  try {
    const rows = await userService.getSessionState(companyId);
    const connections = connectionsByUser(companyId);
    const sessions = Object.fromEntries(rows.map((row) => {
      const devices = connections.get(String(row.id)) || [];
      return [row.id, {
        online: devices.length > 0,
        signedIn: Boolean(row.refresh_token),
        lastActive: row.last_active,
        devices
      }];
    }));
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
  deactivateUser,
  getMe,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess,
  updateUserProfile,
  updateUser
};
