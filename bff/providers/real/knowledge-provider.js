const axios = require('axios');
const KNOWLEDGE_URL = process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:8003';

const api = axios.create({ baseURL: KNOWLEDGE_URL });

module.exports = {
  getConnections: async (objectId) => {
    const res = await api.get(`/v1/objects/${objectId}/connections`);
    return res.data;
  },
  getGraph: async (spaceId) => {
    const res = await api.get(`/v1/spaces/${spaceId}/graph`);
    return res.data;
  }
};
