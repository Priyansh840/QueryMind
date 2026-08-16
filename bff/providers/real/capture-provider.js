const axios = require('axios');
const PIPELINE_URL = process.env.PIPELINE_SERVICE_URL || 'http://localhost:8005';

const api = axios.create({ baseURL: PIPELINE_URL });

module.exports = {
  create: async (input) => {
    const res = await api.post('/v1/capture', input);
    return res.data;
  }
};
