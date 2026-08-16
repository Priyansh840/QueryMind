/**
 * MYND BFF — Mock Memory Provider
 * @implements {import('../interfaces').MemoryProvider}
 */
const mockMemoryProvider = {
  async search(query, { spaceId, objectId, limit = 10 } = {}) {
    const now = new Date().toISOString();
    const memories = [
      { id: 'mem_1', content: 'Resume was updated with Redis streaming metrics for Staff AI role alignment.', objectId: 'obj_car_1', spaceId: 'space_career', type: 'episodic', relevance: 0.95, createdAt: now },
      { id: 'mem_2', content: 'System design patterns frequently referenced across Career and Research spaces.', spaceId: 'space_career', type: 'semantic', relevance: 0.88, createdAt: now },
      { id: 'mem_3', content: 'User prefers deep-work blocks of 90 minutes with breaks.', spaceId: 'space_personal', type: 'procedural', relevance: 0.72, createdAt: now }
    ];
    let filtered = memories;
    if (spaceId) filtered = filtered.filter(m => m.spaceId === spaceId);
    if (objectId) filtered = filtered.filter(m => m.objectId === objectId);
    if (query) filtered = filtered.filter(m => m.content.toLowerCase().includes(query.toLowerCase()));
    return filtered.slice(0, limit);
  },
  async get(id) {
    const all = await this.search('');
    return all.find(m => m.id === id) || null;
  },
  async getRelated(objectId) {
    return this.search('', { objectId });
  }
};

module.exports = mockMemoryProvider;
