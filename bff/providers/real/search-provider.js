const axios = require('axios');
const DATA_URL = process.env.DATA_SERVICE_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: DATA_URL });

module.exports = {
  search: async (query, params = {}) => {
    const res = await api.get('/v1/search', { params: { q: query, ...params } });
    return res.data;
  }
};
