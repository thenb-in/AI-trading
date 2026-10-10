const groupOfCompaniesService = require('../services/groupOfCompaniesService');

const companyWire = (company) => ({ id: company.id, name: company.name });
const userWire = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  is_support_user: user.isSupportUser
});

const toWire = (group) => ({
  id: group.id,
  name: group.name,
  companies: (group.companies || []).map(companyWire),
  users: (group.users || []).map(userWire)
});

const groupOfCompaniesController = {
  async list() {
    const groups = await groupOfCompaniesService.list();
    return { groupOfCompanies: groups.map(toWire) };
  },

  async options() {
    const { companies } = await groupOfCompaniesService.options();
    return { companies: companies.map(companyWire) };
  },

  async usersForCompanies(companyIds) {
    const users = await groupOfCompaniesService.usersForCompanies(companyIds);
    return { users: users.map(userWire) };
  },

  async create(payload, createdBy) {
    const group = await groupOfCompaniesService.create(payload, createdBy);
    return toWire(await groupOfCompaniesService.getById(group.id));
  },

  async update(id, payload) {
    const group = await groupOfCompaniesService.update(id, payload);
    return group ? toWire(await groupOfCompaniesService.getById(id)) : null;
  },

  remove: (id) => groupOfCompaniesService.remove(id)
};

module.exports = groupOfCompaniesController;
