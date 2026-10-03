import { ApiService } from './ApiService';

const groupOfCompaniesService = {
  async list() {
    return ApiService.request('GET', '/group-of-companies');
  },

  // The companies a support user picks from when building a group.
  async options() {
    return ApiService.request('GET', '/group-of-companies/options');
  },

  // The users of the given companies — the only users a group may name.
  async usersForCompanies(companyIds) {
    return ApiService.request('GET', `/group-of-companies/users?companyIds=${encodeURIComponent((companyIds || []).join(','))}`);
  },

  async create(payload) {
    return ApiService.request('POST', '/group-of-companies', payload);
  },

  async update(id, payload) {
    return ApiService.request('PUT', `/group-of-companies/${id}`, payload);
  },

  async remove(id) {
    return ApiService.request('DELETE', `/group-of-companies/${id}`);
  }
};

export { groupOfCompaniesService };
