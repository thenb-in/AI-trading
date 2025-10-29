const db = require('../../models');
const { Op } = require('sequelize');
const { User, Company, Role, UserProfile } = require('../../models');


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
      throw new Error(`Admin role not found in the system ${userId}.`);
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
      throw new Error(`No other admin user found to reassign rooms ${userId}.`);
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
    throw new Error(`User not found ${userId}.`);
  }
  const role = await db.Role.findByPk(newRoleId);
  if (!role) {
    throw new Error(`Role not found ${newRoleId}.`);
  }

  user.roleId = newRoleId;
  await user.save();
}

async function updateUserDeviceAccess(userId, deviceAccess) {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error(`User not found ${userId}.`);
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



const getAllUsers = async (companyId) => {
  if (!companyId) {
    throw new Error(`Company ID is required ${companyId}.`);
  }
  const users = await User.findAll({
    where: { isActive: true, companyId: companyId },
    attributes: ['id', 'phone', 'name', 'companyId', 'isActive', 'last_active', 'is_approved', 'mobileApp', 'desktopWeb', 'mobileWeb', 'username'],
    include: [
      { model: Company, as: 'company', attributes: ['name'] },
      { model: Role, as: 'role', attributes: ['id', 'name'] },
      { model: UserProfile, as: 'userProfile', required: false }
    ],
    order: [['last_active', 'DESC']]
  });

  // Fetch all roles separately
  const roles = await Role.findAll({
    attributes: ['id', 'name'],
    order: [['name', 'ASC']]
  });

  return { users, roles };
};

const getUserById = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error(`User not found ${userId}.`);
  }
  return user;
};

module.exports = {
  getAllUsers,
  getUserById,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess
};
