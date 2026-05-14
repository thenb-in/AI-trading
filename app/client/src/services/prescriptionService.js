import { ApiService } from './ApiService';

const prescriptionService = {
  async getAllPrescriptions() {
    const response = await ApiService.request('GET', '/prescription');
    return response.data;
  },

  async getPrescriptionById(id) {
    const response = await ApiService.request('GET', `/prescription/${id}`);
    return response.data;
  },

  async createPrescription(prescriptionData) {
    const response = await ApiService.request('POST', '/prescription', prescriptionData);
    return response.data;
  },

  async updatePrescription(id, prescriptionData) {
    const response = await ApiService.request('PUT', `/prescription/${id}`, prescriptionData);
    return response.data;
  },

  async deletePrescription(id) {
    const response = await ApiService.request('DELETE', `/prescription/${id}`);
    return response.data;
  }
};

export { prescriptionService };
