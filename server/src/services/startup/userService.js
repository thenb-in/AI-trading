const db = require('../../models');
const { User, Company, Role, UserProfile } = require('../../models');
const { Op } = require('sequelize');

async function deleteUser(userId) {
  // Delete user profile
  await UserProfile.destroy({ where: { userId: userId } });

  // Delete multi-company module associations if they exist
  await db.MultiCompanyModule.destroy({ where: { user_id: userId } });

  // Finally, delete the user
  await db.User.destroy({ where: { id: userId } });
}

async function updateUserRole(userId, newRoleId) {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error(`User not found ${userId}.`);
  }

  // Allow null roleId (no role assigned)
  if (newRoleId) {
    const role = await db.Role.findByPk(newRoleId);
    if (!role) {
      throw new Error(`Role not found ${newRoleId}.`);
    }

    user.roleId = newRoleId;
  } else {
    user.roleId = null;
  }

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

  // Fetch all roles separately - get global roles (companyId is null) and company-specific roles

  const roles = await Role.findAll({
    where: {
      [Op.or]: [
        { companyId: null }, // Global roles
        { companyId: companyId } // Company-specific roles
      ]
    },
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

const updateUserProfile = async (userId, userProfile) => {
  const user = await User.findByPk(userId, {
    include: [
      { model: UserProfile, as: 'userProfile', required: false }
    ]
  });

  if (!user) {
    throw new Error(`User not found ${userId}.`);
  }

  try {
    if (user.userProfile) {
      // UserProfile exists, update it
      await user.userProfile.update(userProfile);
    } else {
      // UserProfile doesn't exist, create it
      await UserProfile.create({
        userId: user.id,
        currentCompany: user.companyId,
        ...userProfile
      });
    }

    // Reload user with updated userProfile
    const updatedUser = await User.findByPk(userId, {
      include: [
        { model: UserProfile, as: 'userProfile', required: false }
      ]
    });

    return updatedUser;
  } catch (error) {
    throw new Error(`Error updating user profile: ${error.message}`);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  deleteUser,
  updateUserRole,
  updateUserDeviceAccess,
  updateUserProfile
};
