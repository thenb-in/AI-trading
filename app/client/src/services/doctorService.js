import { ApiService } from './ApiService';

const doctorService = {
  async getAllDoctors(limit = 100, offset = 0) {
    const response = await ApiService.request('GET', `/doctor?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getDoctorById(doctorId) {
    const response = await ApiService.request('GET', `/doctor/${doctorId}`);
    return response.data;
  },

  async createDoctor(doctorData, timingsArray = []) {
    const response = await ApiService.request('POST', '/doctor', {
      doctorData,
      timingsArray
    });
    return response.data;
  },

  async updateDoctor(doctorId, doctorData, timingsArray = []) {
    const response = await ApiService.request('PUT', `/doctor/${doctorId}`, {
      doctorData,
      timingsArray
    });
    return response.data;
  },

  async deleteDoctor(doctorId) {
    const response = await ApiService.request('DELETE', `/doctor/${doctorId}`);
    return response.data;
  },

  async deleteDoctorTiming(doctorId, timingId) {
    const response = await ApiService.request('DELETE', `/doctor/${doctorId}/timing/${timingId}`);
    return response.data;
  }
};

export { doctorService };
