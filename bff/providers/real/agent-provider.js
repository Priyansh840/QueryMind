const axios = require('axios');
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_SERVICE_URL || 'http://localhost:8004';

const api = axios.create({ baseURL: ORCHESTRATOR_URL });

module.exports = {
  startRun: async (input) => {
    const res = await api.post('/v1/runs', input);
    return res.data;
  },
  getRun: async (runId) => {
    const res = await api.get(`/v1/runs/${runId}`);
    return res.data;
  },
  streamRun: async function* (runId) {
    const response = await axios({
      method: 'get',
      url: `${ORCHESTRATOR_URL}/v1/runs/${runId}/stream`,
      responseType: 'stream'
    });
    
    // In Node.js environment, response.data is a stream
    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            yield data;
          } catch (e) {
            // Ignore parse errors on incomplete chunks
          }
        }
      }
    }
  }
};
