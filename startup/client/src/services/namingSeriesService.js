import { ApiService } from './ApiService';

const namingSeriesService = {
  async list() {
    return ApiService.request('GET', '/naming-series');
  },

  // Masters that number their rows from a naming series (registered by the server at boot).
  async masters() {
    return ApiService.request('GET', '/naming-series/master-for-series');
  },

  async create(payload) {
    return ApiService.request('POST', '/naming-series', payload);
  },

  async update(id, payload) {
    return ApiService.request('PUT', `/naming-series/${id}`, payload);
  },

  async remove(id) {
    return ApiService.request('DELETE', `/naming-series/${id}`);
  }
};

export { namingSeriesService };
