import { ApiService } from './ApiService';

const nbnextDriveService = {
  async getAllFiles() {
    const response = await ApiService.request('GET', '/nbnext-drive');
    return response.data;
  },

  async getFileById(id) {
    const response = await ApiService.request('GET', `/nbnext-drive/${id}`);
    return response.data;
  },

  async getFilesByObject(objectName, objectId, startDate, endDate) {
    const params = { objectName, objectId: String(objectId) };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await ApiService.request('GET', '/nbnext-drive/by-object', null, { params });
    return response.data;
  },

  async uploadFile(file, objectName = null, objectId = null, endDate = null, permissionName = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (objectName) {
      formData.append('objectName', objectName);
    }
    if (objectId) {
      formData.append('objectId', objectId);
    }
    if (endDate) {
      formData.append('endDate', endDate);
    }
    // When a file's object name is not a master (a letter head's header/footer),
    // the master whose attachment permission governs it travels with the upload
    // so every later request can read it back from the stored file.
    if (permissionName) {
      formData.append('permissionName', permissionName);
    }

    const response = await ApiService.request('POST', '/nbnext-drive', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async deleteFile(id) {
    const response = await ApiService.request('DELETE', `/nbnext-drive/${id}`);
    return response.data;
  },

  async downloadFile(id) {
    const response = await ApiService.request('GET', `/nbnext-drive/${id}/download`, null, {
      responseType: 'blob'
    });
    return response;
  }
};

export { nbnextDriveService };

