import { ApiService } from '@services/ApiService';

// Thin client for the OIDC identity-provider interaction endpoints
const ssoApi = {
  getInteraction(uid) {
    return ApiService.request('GET', `/oidc/interaction/${uid}/details`);
  },

  login(uid, data) {
    return ApiService.request('POST', `/oidc/interaction/${uid}/login`, data);
  },

  signup(uid, data) {
    return ApiService.request('POST', `/oidc/interaction/${uid}/signup`, data);
  },

  resetPassword(uid, data) {
    return ApiService.request('POST', `/oidc/interaction/${uid}/forgot-password`, data);
  }
};

export { ssoApi };
