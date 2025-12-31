const logger = require('../../../logger');
const { MASTER_PERMISSION_CONSTANTS } = require('../../constants/permissions');
const authService = require('../../services/startup/authService');
const multiCompanyService = require('../../services/startup/multiCompanyService');
const userService = require('../../services/startup/userService');
const allowedPermissions = require('../../utils/startup/allowedPermissions');

const getAllUsers = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Get All Users']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  const companyId = req.user.company_id;

  try {
    const users = await multiCompanyService.getAllUsers(companyId);
    res.status(200).json(users);
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

const getMe = async (req, res) => {
  try {
    const userData=req.user;
    const user = await authService.getCurrentUser(userData.id);
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

module.exports = {
  getAllUsers,
  deactivateUser,
  getMe,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess,
  updateUserProfile
};
