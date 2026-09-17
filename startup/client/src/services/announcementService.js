import { ApiService } from './ApiService';

// Announcements — the banner the whole company reads, and the rules behind it.
const announcementService = {
  async list() {
    return ApiService.request('GET', '/announcements');
  },

  // What this user should be shown right now. Everyone may ask; the server
  // decides by role and by the window each announcement runs in.
  async active() {
    return ApiService.request('GET', '/announcements/active');
  },

  async create(payload) {
    return ApiService.request('POST', '/announcements', payload);
  },

  async update(id, payload) {
    return ApiService.request('PUT', `/announcements/${id}`, payload);
  },

  async remove(id) {
    return ApiService.request('DELETE', `/announcements/${id}`);
  }
};

export { announcementService };
