const axios = require('axios');
const DATA_URL = process.env.DATA_SERVICE_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: DATA_URL });

module.exports = {
  list: async (params) => {
    const res = await api.get('/v1/activity', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/v1/activity/${id}`);
    return res.data;
  }
};
