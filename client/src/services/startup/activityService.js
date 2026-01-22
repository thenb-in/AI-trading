import { ApiService } from './ApiService';

const activityService = {
  async getAllActivities(limit = 100) {
    const response = await ApiService.request('GET', `/activity?limit=${limit}`);
    return response.data;
  },

  async getActivitiesByHead(head, limit = 100) {
    const response = await ApiService.request('GET', `/activity/head/${head}?limit=${limit}`);
    return response.data;
  },

  async createActivity(head, log, timestamp, objectName = null, objectId = null) {
    const response = await ApiService.request('POST', '/activity', {
      head,
      log,
      timestamp,
      objectName,
      objectId
    });
    return response.data;
  }
};

export { activityService };
