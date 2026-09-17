import { ApiService } from './ApiService';

// Geography — the tree of places every address, filter and report reads from.
const geographyService = {
  async list() {
    return ApiService.request('GET', '/geography');
  },

  async create(payload) {
    return ApiService.request('POST', '/geography', payload);
  },

  async update(id, payload) {
    return ApiService.request('PUT', `/geography/${id}`, payload);
  },

  async remove(id) {
    return ApiService.request('DELETE', `/geography/${id}`);
  }
};

export { geographyService };
