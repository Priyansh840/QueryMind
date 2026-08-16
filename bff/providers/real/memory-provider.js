const axios = require('axios');
const MEMORY_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:8002';

const api = axios.create({ baseURL: MEMORY_URL });

module.exports = {
  search: async (query, params = {}) => {
    const res = await api.get('/v1/memory/search', { params: { q: query, ...params } });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/v1/memory/${id}`);
    return res.data;
  },
  getRelated: async (objectId) => {
    const res = await api.get(`/v1/objects/${objectId}/memories`);
    return res.data;
  }
};
