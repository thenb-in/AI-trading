import { ApiService } from './ApiService';

const activityService = {
  async getAllActivities(limit = 100, offset = 0) {
    const response = await ApiService.request('GET', `/activity?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getActivitiesByHead(head, limit = 100, offset = 0) {
    const response = await ApiService.request('GET', `/activity/head/${head}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getActivitiesByHeadAndObjectId(head, objectId, limit = 100, offset = 0) {
    const safeHead = encodeURIComponent(head);
    const safeObjectId = encodeURIComponent(objectId);
    const response = await ApiService.request(
      'GET',
      `/activity/head/${safeHead}/object/${safeObjectId}?limit=${limit}&offset=${offset}`
    );
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
