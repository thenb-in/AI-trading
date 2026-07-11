import { api } from "@services/axiosConfig";


const notificationApi = {
  async list({ limit = 20, offset = 0 } = {}) {
    const res = await api.get("/notifications", { params: { limit, offset } });
    return res.data?.data?.notifications ?? [];
  },

  async markRead(id) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data?.data?.updated ?? false;
  },

  async markAllRead() {
    const res = await api.patch("/notifications/read-all");
    return res.data?.data?.updatedCount ?? 0;
  },
};

export { notificationApi };
