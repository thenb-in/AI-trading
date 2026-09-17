const announcementService = require('../services/announcementService');
const roleService = require('../services/roleService');
const userService = require('../services/userService');
const { formatResponse, plain } = require('../data_formatters/formatResponse');
const announcementColumns = require('../constants/columns/announcementColumns');
const { ANNOUNCEMENT_EVERYONE_LABEL } = require('../constants/announcements');

/** What the form sends, as the model spells it. */
const toModelAttributes = (payload = {}) => ({
  title: payload.title,
  body: payload.body,
  severity: payload.severity,
  roleIds: payload.role_ids || [],
  startsAt: payload.starts_at || null,
  endsAt: payload.ends_at || null,
  isActive: payload.is_active ?? true
});

const format = (row, roleNames = {}) => {
  const announcement = plain(row);
  const roleIds = announcement.roleIds || [];
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    severity: announcement.severity,
    audienceLabel: roleIds.length
      ? roleIds.map((id) => roleNames[String(id)] || `role ${id}`).join(', ')
      : ANNOUNCEMENT_EVERYONE_LABEL,
    starts_at: announcement.startsAt,
    ends_at: announcement.endsAt,
    is_active: announcement.isActive,
    createdAt: announcement.createdAt,
    updated_at: announcement.updatedAt,

    // What the form edits.
    role_ids: roleIds
  };
};

const announcementController = {
  async list(companyId) {
    const [rows, roles] = await Promise.all([
      announcementService.listForCompany(companyId),
      roleService.getAllRoles(companyId)
    ]);
    const roleNames = Object.fromEntries(roles.map((role) => [String(role.id), role.display_name || role.name]));
    return formatResponse(rows, announcementColumns, (row) => format(row, roleNames));
  },

  /**
   * What this reader should see right now: the announcements running, narrowed
   * to the ones meant for them. An announcement with no roles is for everyone.
   * The token carries no role, so the reader's own is read here.
   */
  async active(companyId, userId) {
    const [rows, user] = await Promise.all([
      announcementService.listRunning(companyId, new Date()),
      userService.getUserById(userId)
    ]);
    const roleId = user?.role_id;
    return rows
      .map((row) => format(row))
      .filter((announcement) => announcement.role_ids.length === 0
        || announcement.role_ids.map(String).includes(String(roleId)));
  },

  async create(payload, companyId, userId) {
    const row = await announcementService.create(toModelAttributes(payload), companyId, userId);
    return format(row);
  },

  async update(id, companyId, payload) {
    const updated = await announcementService.update(id, companyId, toModelAttributes(payload));
    if (!updated) {
      return null;
    }
    return format(await announcementService.getById(id, companyId));
  },

  async remove(id, companyId) {
    return announcementService.remove(id, companyId);
  }
};

module.exports = announcementController;
