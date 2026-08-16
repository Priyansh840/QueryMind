const axios = require('axios');
const DATA_URL = process.env.DATA_SERVICE_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: DATA_URL });

module.exports = {
  upload: async (file) => {
    // For file uploads in Node using Axios
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', file.buffer, file.originalname);
    
    const res = await api.post('/v1/files', form, {
      headers: form.getHeaders()
    });
    return res.data;
  },
  get: async (fileId) => {
    const res = await api.get(`/v1/files/${fileId}`);
    return res.data;
  }
};
