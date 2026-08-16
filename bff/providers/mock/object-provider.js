/**
 * MYND BFF — Mock Object Provider
 * @implements {import('../interfaces').ObjectProvider}
 */
const { v4: uuid } = require('uuid');
const now = new Date().toISOString();

/** @type {Map<string, import('../../types/models').KnowledgeObject>} */
const objects = new Map();

// Seed
[
  { id: 'obj_car_1', type: 'document', title: 'Resume 2026 Final Draft', spaceId: 'space_career', description: 'Tailored for Staff AI Systems Engineering roles.', content: '# Resume 2026', tags: ['Staff AI', 'Distributed Systems'] },
  { id: 'obj_car_2', type: 'code', title: 'Kalyra Engine — Architecture', spaceId: 'space_career', description: 'Full-stack streaming engine.', tags: ['Project'] },
  { id: 'obj_car_3', type: 'note', title: 'Google Interview Prep — Notes', spaceId: 'space_career', description: 'System design patterns.', tags: ['Preparation'] },
  { id: 'obj_res_1', type: 'document', title: 'Multi-agent Systems: A Survey', spaceId: 'space_research', description: 'Multi-agent RL foundations.', tags: ['Multi-agent', 'Survey'] },
  { id: 'obj_res_2', type: 'document', title: 'Spatial Memory in LLM Agents', spaceId: 'space_research', description: 'Memory consolidation architectures.', tags: ['Spatial Memory'] },
  { id: 'obj_per_1', type: 'note', title: 'Daily Reflection — May 12', spaceId: 'space_personal', description: 'Grateful for progress.', tags: ['Reflection'] },
  { id: 'obj_per_2', type: 'note', title: 'Reading List', spaceId: 'space_personal', description: 'Books to read.', tags: ['Books'] },
  { id: 'obj_lrn_1', type: 'note', title: 'Time Complexity', spaceId: 'space_learning', description: 'Big O notation analysis.', tags: ['Algorithms'] },
  { id: 'obj_lrn_2', type: 'note', title: 'Ownership in Rust', spaceId: 'space_learning', description: 'Borrowing and lifetimes.', tags: ['Rust'] },
  { id: 'obj_lrn_3', type: 'note', title: 'Neural Networks', spaceId: 'space_learning', description: 'Layers, activation functions.', tags: ['Machine Learning'] }
].forEach(o => objects.set(o.id, { ...o, createdAt: now, updatedAt: now }));

/** @type {import('../interfaces').ObjectProvider} */
const mockObjectProvider = {
  async get(id) {
    return objects.get(id) || null;
  },

  async create(data) {
    const id = `obj_${uuid().slice(0, 8)}`;
    const obj = { id, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    objects.set(id, obj);
    return obj;
  },

  async update(id, data) {
    const obj = objects.get(id);
    if (!obj) return null;
    Object.assign(obj, data, { updatedAt: new Date().toISOString() });
    return obj;
  },

  async delete(id) {
    const existed = objects.has(id);
    objects.delete(id);
    return existed;
  },

  async getActivity(id) {
    if (!objects.has(id)) return [];
    return [
      { id: `evt_${uuid().slice(0, 8)}`, type: 'OBJECT_UPDATED', actor: 'user', objectId: id, message: `Updated ${objects.get(id).title}`, timestamp: now }
    ];
  },

  async getRelationships(id) {
    if (!objects.has(id)) return [];
    const all = Array.from(objects.values()).filter(o => o.id !== id && o.spaceId === objects.get(id)?.spaceId).slice(0, 3);
    return all.map(o => ({ id: o.id, type: o.type, title: o.title, relationship: 'related' }));
  }
};

module.exports = mockObjectProvider;
