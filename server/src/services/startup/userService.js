const db = require('../../models');
const { Op } = require('sequelize');


async function deleteUser(userId) {
  // Find rooms where the user is admin or creator
  const userRooms = await db.Room.findAll({
    where: {
      [Op.or]: [
        { adminId: userId },
        { creatorId: userId }
      ]
    }
  });

  // If user is admin/creator of any rooms, reassign to another admin
  if (userRooms.length > 0) {
    const adminRoles = await db.Role.findAll({
      // name = admin or sadmin
      where: {
        name: {
          [Op.in]: ['admin', 'sadmin']
        }
      } // todo: make this dynamic if needed
    });

    if (!adminRoles.length) {
      throw new Error('Admin role not found in the system');
    }

    const options = {
      roleId: { [Op.in]: adminRoles.map(role => role.id) },
      id: { [Op.ne]: userId }
    };
    const adminUser = await db.User.findOne({
      where: options
    });

    if (!adminUser) {
      // if only 1 user, delete it instead of error
      const userCount = await db.User.count();
      if (userCount === 1) {
        await db.User.destroy({ where: { id: userId } });  // cascade delete messages and rooms
        return;
      }
      throw new Error('No other admin user found to reassign rooms');
    }

    await db.Room.update(
      {
        adminId: adminUser.id,
        creatorId: adminUser.id
      },
      {
        where: {
          [Op.or]: [
            { adminId: userId },
            { creatorId: userId }
          ]
        }
      }
    );
  }

  await db.Message.destroy({ where: { senderId: userId } });

  await db.RoomParticipants.destroy({ where: { userId } });

  await db.User.destroy({ where: { id: userId } });
}

async function updateUserRole(userId, newRoleId) {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const role = await db.Role.findByPk(newRoleId);
  if (!role) {
    throw new Error('Role not found');
  }

  user.roleId = newRoleId;
  await user.save();
}
async function updateUserDeviceAccess(userId, deviceAccess) {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update only fields present in the payload
  if (deviceAccess.desktopWeb !== undefined) {
    user.desktopWeb = !!deviceAccess.desktopWeb;
  }
  if (deviceAccess.mobileWeb !== undefined) {
    user.mobileWeb = !!deviceAccess.mobileWeb;
  }
  if (deviceAccess.mobileApp !== undefined) {
    user.mobileApp = !!deviceAccess.mobileApp;
  }

  await user.save();
  return user;
}



module.exports = {
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess
};
