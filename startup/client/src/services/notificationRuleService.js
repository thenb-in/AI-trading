import { ApiService } from './ApiService';

// Notification rules — 
const notificationRuleService = {
  async list() {
    return ApiService.request('GET', '/notification-rules');
  },

  async create(payload) {
    return ApiService.request('POST', '/notification-rules', payload);
  },

  async update(id, payload) {
    return ApiService.request('PUT', `/notification-rules/${id}`, payload);
  },

  async remove(id) {
    return ApiService.request('DELETE', `/notification-rules/${id}`);
  },
  async sendNow(id) {
    return ApiService.request('POST', `/notification-rules/${id}/send-now`);
  }
};

export { notificationRuleService };
