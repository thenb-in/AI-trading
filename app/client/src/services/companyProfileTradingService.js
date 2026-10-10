import { api } from "@startup/services/axiosConfig";

// HTTP surface for the company-level trading config. The framework axios
// instance already carries the /api/v1 base URL and auth cookies, so paths here
// are relative. Mounted server-side at /api/v1/company-profile/trading.
const companyProfileTradingService = {
  getTradingConfig: () => api.get("/company-profile/trading"),
  updateTradingConfig: (payload) => api.put("/company-profile/trading", payload),
};

export { companyProfileTradingService };
