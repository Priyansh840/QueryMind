/**
 * MYND BFF — Mock Agent Provider
 * Simulates agent runs with delayed progress events.
 * Does NOT implement actual agent logic.
 * @implements {import('../interfaces').AgentProvider}
 */
const { v4: uuid } = require('uuid');

/** @type {Map<string, import('../../types/models').AgentRun>} */
const runs = new Map();

/** @type {import('../interfaces').AgentProvider} */
const mockAgentProvider = {
  async startRun(input) {
    const runId = `run_${uuid().slice(0, 8)}`;
    const run = { runId, status: 'started', startedAt: new Date().toISOString() };
    runs.set(runId, run);

    // Simulate progression
    setTimeout(() => { const r = runs.get(runId); if (r) r.status = 'running'; }, 500);
    setTimeout(() => { const r = runs.get(runId); if (r) { r.status = 'completed'; r.completedAt = new Date().toISOString(); r.result = `Analysis complete for intent: ${input.intent}`; } }, 3000);

    return run;
  },

  async getRun(runId) {
    return runs.get(runId) || null;
  },

  async *streamRun(runId) {
    const steps = [
      { type: 'agent.started', message: 'Agent run initiated', progress: 0 },
      { type: 'agent.progress', message: 'Analyzing context...', progress: 25 },
      { type: 'agent.progress', message: 'Processing knowledge graph...', progress: 50 },
      { type: 'agent.progress', message: 'Synthesizing results...', progress: 75 },
      { type: 'agent.completed', message: 'Analysis complete', progress: 100 }
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600));
      yield { ...step, runId, timestamp: new Date().toISOString() };
    }
  }
};

module.exports = mockAgentProvider;
