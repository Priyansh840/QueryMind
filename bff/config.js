/**
 * MYND BFF — Config & Provider Registry
 * Selects mock or real providers based on environment.
 */
const useMock = process.env.USE_MOCK_SERVICES !== 'false';

function loadProviders() {
  if (useMock) {
    console.log('[config] Using MOCK providers');
    return {
      spaces: require('./providers/mock/space-provider'),
      objects: require('./providers/mock/object-provider'),
      search: require('./providers/mock/search-provider'),
      activity: require('./providers/mock/activity-provider'),
      capture: require('./providers/mock/capture-provider'),
      agent: require('./providers/mock/agent-provider'),
      memory: require('./providers/mock/memory-provider'),
      knowledge: require('./providers/mock/knowledge-provider'),
      files: require('./providers/mock/file-provider')
    };
  }

  // Real providers — teams plug in here
  console.log('[config] Using REAL providers');
  return {
    spaces: require('./providers/real/space-provider'),
    objects: require('./providers/real/object-provider'),
    search: require('./providers/real/search-provider'),
    activity: require('./providers/real/activity-provider'),
    capture: require('./providers/real/capture-provider'),
    agent: require('./providers/real/agent-provider'),
    memory: require('./providers/real/memory-provider'),
    knowledge: require('./providers/real/knowledge-provider'),
    files: require('./providers/real/file-provider')
  };
}

module.exports = { providers: loadProviders(), useMock };
