const { User, Company, Role, UserProfile } = require('../models');
const logger = require('../../logger');
const { findModelByIdOrThrow, getUserWithRoleInclude } = require('../utils/modelHelpers');
const { verifyValidSubscribedPermission } = require('../utils/subscriptionPermissionUtils');

const normalize = (val) => val?.trim().toLowerCase();

const approveUser = async (userId, requirePasswordReset = false, role_id = null) => {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');

  user.is_approved = true;

  // If role_id is provided, validate and assign it
  if (role_id) {
    await findModelByIdOrThrow(Role, role_id, {}, 'Role');
    user.role_id = role_id;
    logger.info(`User approved with role assignment: ${userId} - Role: ${role_id}`);
  }

  // If requirePasswordReset is false, set last_active to now so user doesn't need to reset password
  if (!requirePasswordReset) {
    user.last_active = new Date();
    logger.info(`User approved without password reset: ${userId} - Setting last_active to now`);
  } else {
    // If requirePasswordReset is true, keep last_active as null so user must reset password
    logger.info(`User approved with password reset required: ${userId} - Keeping last_active as null`);
  }

  await user.save();
};

const getCurrentUser = async (userId) => {
  try {
    // Fetch user with associated company
    const user = await findModelByIdOrThrow(User, userId, {
      include: getUserWithRoleInclude()
    }, 'User');

    if (!user.isActive) {
      throw new Error(`User account is deactivated ${userId}.`);
    }

    const profile = await UserProfile.findOne({ where: { userId } });
    const activeCompanyId = profile?.currentCompany || user.company_id;
    const activeCompany = activeCompanyId
      ? await Company.findByPk(activeCompanyId, { attributes: ['id', 'name','latitude','longitude','geofence_radius_meters'] })
      : null;

    // Filter permissions based on subscription status
    const userWithFilteredPermissions = await verifyValidSubscribedPermission(user, activeCompanyId);

    return {
      id: userWithFilteredPermissions.id,
      mobileApp: userWithFilteredPermissions.mobileApp,
      desktopWeb: userWithFilteredPermissions.desktopWeb,
      mobileWeb: userWithFilteredPermissions.mobileWeb,
      default_screen_mode: profile?.default_screen_mode || 'location_mode',
      office_latitude:profile?.office_latitude,
      office_longitude: profile?.office_longitude,
      username: userWithFilteredPermissions.username,
      phone: userWithFilteredPermissions.phone,
      name: userWithFilteredPermissions.name,
      companyId: activeCompanyId || null,
      role_id: userWithFilteredPermissions.role_id,
      isActive: userWithFilteredPermissions.isActive,
      is_approved: userWithFilteredPermissions.is_approved,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name ,longitude:activeCompany.longitude,latitude:activeCompany.latitude, geofence_radius_meters: activeCompany.geofence_radius_meters} : null,
      isSupportUser: user.isSupportUser,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions || []
      } : null
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new Error(`Invalid or expired token ${userId}.`);
    }
    throw new Error(`Error in getting current user ${userId} ${error.message} ${error.stack}`);
  }
};

const getAllRoles = async () => {
  const roles = await Role.findAll({
    attributes: ['id', 'name', 'description']
  });
  return roles;
};

/**
 * Live uniqueness check for a field, so a UI can tell the user a company name /
 * username is taken WHILE typing — before any create/onboard call. Uses the same
 * normalisation as persistence (username lower-cased, both trimmed) so the
 * answer matches what creation will actually see.
 */
const checkAvailability = async ({ type, value }) => {
  const raw = (value || '').trim();
  if (!raw) {
    throw { status: 400, message: 'Nothing to check' };
  }

  if (type === 'username') {
    const username = normalize(raw);
    const existing = await User.findOne({
      where: { username },
      attributes: ['id', 'is_totp_enabled', 'wallet_user_id']
    });
    return {
      type,
      value: username,
      available: !existing,
      isTotpEnabled: Boolean(existing?.is_totp_enabled),
      isSso: Boolean(existing?.wallet_user_id)
    };
  }
  if (type === 'company') {
    const existing = await Company.findOne({ where: { name: raw }, attributes: ['id'] });
    return { type, value: raw, available: !existing };
  }

  throw { status: 400, message: 'Unknown field to check' };
};

module.exports = {
  approveUser,
  getCurrentUser,
  getAllRoles,
  checkAvailability
};
