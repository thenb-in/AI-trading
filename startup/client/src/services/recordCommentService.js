import { ApiService } from './ApiService';

/**
 * Comments left on one record of any master — the same shape the Drive uses to
 * attach a file to a record: what kind of thing it is, and which one.
 */
const recordCommentService = {
  async getComments(objectName, objectId) {
    const response = await ApiService.request('GET', '/record-comments', null, {
      params: { objectName, objectId: String(objectId) }
    });
    return response.data;
  },

  async addComment(objectName, objectId, body) {
    const response = await ApiService.request('POST', '/record-comments', {
      objectName,
      objectId: String(objectId),
      body
    });
    return response.data;
  },

  async deleteComment(id) {
    const response = await ApiService.request('DELETE', `/record-comments/${id}`);
    return response.data;
  }
};

export { recordCommentService };
