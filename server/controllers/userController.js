const authService = require('../services/authService');
const { Message: _Message, Room: _Room } = require('../models');
const { sequelize: _sequelize } = require('../models');
const allowedPermissions = require('../utils/allowedPermissions');
const userService = require('../services/userService');
const logger = require('../logger');

const getAllUsers = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Get All Users']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const users = await authService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    logger.error(`Get all users error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deactivateUser = async (req, res) => {
  const requiredPermission = 'Deactivate User';
  const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(403).json({ error: 'You are not authorized to access this resource ' + requiredPermission });
  }
  try {
    const { userId } = req.params;
    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete messages
    // await Message.destroy({ where: { senderId: userId } });

    // // Remove from room participants
    // await sequelize.models.RoomParticipants.destroy({ where: { userId } });

    // // Delete rooms created by user
    // await Room.destroy({ where: { creatorId: userId } });

    // Deactivate user
    user.is_approved = false;

    user.refresh_token=null;
    await user.save();

    res.status(200).json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error(`Deactivate user error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const userData=req.user;
    const user = await authService.getCurrentUser(userData.id);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error in getMe: ${error.message} - Stack: ${error.stack}`);
    res.status(401).json({ error: error.message });
  }
};


const deleteUser = async (req, res) => {
  const requiredPermission = 'Delete User';
  const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(403).json({ error: 'You are not authorized to access this resource ' + requiredPermission });
  }
  try {
    const { userId } = req.params;
    await userService.deleteUser(userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Delete user error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserRole=async(req,res)=>{
  try {
    const { userId } = req.params;
    const { role } = req.body;
    await userService.updateUserRole(userId, role);
    res.status(200).json({ message: 'User role updated successfully' });
  } catch (error) {
    logger.error(`Update user role error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const updateUserDeviceAccess=async(req,res)=>{
  try {
    const { userId } = req.params;
    const { deviceAccess } = req.body;
    await userService.updateUserDeviceAccess(userId, deviceAccess);
    res.status(200).json({ message: 'User device access updated successfully' });
  } catch (error) {
    logger.error(`Update user device access error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};
module.exports = {
  getAllUsers,
  deactivateUser,
  getMe,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess
};
