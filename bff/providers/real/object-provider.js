const axios = require('axios');
const DATA_URL = process.env.DATA_SERVICE_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: DATA_URL });

module.exports = {
  get: async (id) => {
    const res = await api.get(`/v1/objects/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/v1/objects', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/v1/objects/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    await api.delete(`/v1/objects/${id}`);
    return true;
  },
  getActivity: async (id) => {
    const res = await api.get(`/v1/objects/${id}/activity`);
    return res.data;
  },
  getRelationships: async (id) => {
    const res = await api.get(`/v1/objects/${id}/relationships`);
    return res.data;
  }
};
