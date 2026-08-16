const axios = require('axios');
const DATA_URL = process.env.DATA_SERVICE_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: DATA_URL });

module.exports = {
  list: async (params) => {
    const res = await api.get('/v1/spaces', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/v1/spaces/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/v1/spaces', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/v1/spaces/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    await api.delete(`/v1/spaces/${id}`);
    return true;
  },
  listObjects: async (spaceId, params) => {
    const res = await api.get(`/v1/spaces/${spaceId}/objects`, { params });
    return res.data;
  }
};
