const { Op } = require('sequelize');
const {
  sequelize,
  GroupOfCompanies,
  GroupOfCompaniesCompany,
  GroupOfCompaniesUser,
  Company,
  User
} = require('../models');

// Every group with its member companies and users, newest first. The join
// rows carry nothing of their own, so they are dropped from the include.
const companyInclude = { model: Company, as: 'companies', attributes: ['id', 'name'], through: { attributes: [] } };
const userInclude = {
  model: User,
  as: 'users',
  attributes: ['id', 'name', 'username', 'isSupportUser'],
  through: { attributes: [] }
};

// Which group ids a company belongs to — the hinge the assignment screen turns
// on ("show me the business users of the groups this company is in").
const groupIdsForCompany = async (companyId) => {
  const rows = await GroupOfCompaniesCompany.findAll({
    where: { companyId },
    attributes: ['groupId']
  });
  return rows.map((row) => row.groupId);
};

const groupOfCompaniesService = {
  list: () =>
    GroupOfCompanies.findAll({
      include: [companyInclude, userInclude],
      order: [['name', 'ASC']]
    }),

  // The companies a support user picks from when building a group. The users
  // are not listed here — they are scoped to the companies the group picks (see
  // usersForCompanies), since a group's users are the users of its companies.
  options: async () => {
    const companies = await Company.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
    return { companies };
  },

  // The active users of the given companies — whom the group may name. A user
  // belongs to a company by their home company_id.
  usersForCompanies: (companyIds) => {
    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return [];
    }
    return User.findAll({
      where: { company_id: companyIds, isActive: true },
      attributes: ['id', 'name', 'username', 'isSupportUser'],
      order: [['name', 'ASC']]
    });
  },

  getById: (id) =>
    GroupOfCompanies.findByPk(id, { include: [companyInclude, userInclude] }),

  create: ({ name, companyIds = [], userIds = [] }, createdBy) =>
    sequelize.transaction(async (transaction) => {
      const group = await GroupOfCompanies.create({ name: name.trim(), createdBy }, { transaction });
      await group.setCompanies(companyIds, { transaction });
      await group.setUsers(userIds, { transaction });
      return group;
    }),

  update: (id, { name, companyIds, userIds }) =>
    sequelize.transaction(async (transaction) => {
      const group = await GroupOfCompanies.findByPk(id, { transaction });
      if (!group) {
        return null;
      }
      if (name !== undefined) {
        await group.update({ name: name.trim() }, { transaction });
      }
      if (companyIds !== undefined) {
        await group.setCompanies(companyIds, { transaction });
      }
      if (userIds !== undefined) {
        await group.setUsers(userIds, { transaction });
      }
      return group;
    }),

  remove: (id) => GroupOfCompanies.destroy({ where: { id } }),

  // The active business (non-support) users of every group that contains this
  // company — the people whose names show up for assignment next to the
  // support users. De-duplicated, since a user may be in two of the company's
  // groups.
  listBusinessUsersForCompany: async (companyId) => {
    const groupIds = await groupIdsForCompany(companyId);
    if (groupIds.length === 0) {
      return [];
    }
    const links = await GroupOfCompaniesUser.findAll({
      where: { groupId: groupIds },
      include: [{
        model: User,
        as: 'user',
        // A user whose home company IS this one already belongs to it directly,
        // so they are not offered for assignment here.
        where: { isSupportUser: false, isActive: true, company_id: { [Op.ne]: companyId } },
        attributes: ['id', 'name', 'username', 'isSupportUser']
      }]
    });
    const byId = new Map();
    for (const link of links) {
      if (link.user) {
        byId.set(link.user.id, link.user);
      }
    }
    return Array.from(byId.values());
  },

  // Whether a business user may be assigned to a company at all: they must be
  // in a group that holds that company. Support users bypass this (they are
  // allowed on any company), so callers only ask for business users.
  isUserEligibleForCompany: async (userId, companyId) => {
    const groupIds = await groupIdsForCompany(companyId);
    if (groupIds.length === 0) {
      return false;
    }
    const link = await GroupOfCompaniesUser.findOne({ where: { groupId: groupIds, userId } });
    return Boolean(link);
  },

  // Whether the user is named in any group — what lets a non-support user reach
  // the company switcher.
  isUserInAnyGroup: async (userId) => {
    const link = await GroupOfCompaniesUser.findOne({ where: { userId } });
    return Boolean(link);
  }
};

module.exports = groupOfCompaniesService;
