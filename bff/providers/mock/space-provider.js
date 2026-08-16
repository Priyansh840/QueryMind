/**
 * MYND BFF — Mock Space Provider
 * Seeded with data matching the existing frontend store.
 * @implements {import('../interfaces').SpaceProvider}
 */
const { v4: uuid } = require('uuid');

const now = new Date().toISOString();

/** @type {Map<string, import('../../types/models').Space>} */
const spaces = new Map();

/** @type {Map<string, import('../../types/models').KnowledgeObject[]>} */
const spaceObjects = new Map();

// ── Seed data ──────────────────────────────────────────────────────
const seed = [
  { id: 'space_career', name: 'Career', description: 'Staff AI Systems role, Resume 2026, Kalyra engine & Technical Screen', type: 'career', objectCount: 126, color: '#7C3AED' },
  { id: 'space_research', name: 'Research', description: 'Explore, analyze and contribute to knowledge.', type: 'research', objectCount: 148, color: '#10B981' },
  { id: 'space_personal', name: 'Personal', description: 'Notes, habits, reflections and everything about me.', type: 'personal', objectCount: 36, color: '#14B8A6' },
  { id: 'space_learning', name: 'Learning', description: 'Explore, learn and grow every day.', type: 'learning', objectCount: 42, color: '#7C3AED' }
];

seed.forEach(s => {
  spaces.set(s.id, { ...s, createdAt: now, updatedAt: now });
  spaceObjects.set(s.id, []);
});

// Seed some objects per space
const seedObjects = [
  { id: 'obj_car_1', type: 'document', title: 'Resume 2026 Final Draft', spaceId: 'space_career', description: 'Tailored for Staff AI Systems Engineering roles.', tags: ['Staff AI', 'Distributed Systems'], createdAt: now, updatedAt: now },
  { id: 'obj_car_2', type: 'code', title: 'Kalyra Engine — Architecture', spaceId: 'space_career', description: 'Full-stack streaming engine architecture.', tags: ['Project', 'Architecture'], createdAt: now, updatedAt: now },
  { id: 'obj_car_3', type: 'note', title: 'Google Interview Prep — Notes', spaceId: 'space_career', description: 'System design patterns and behavioral prep.', tags: ['Preparation'], createdAt: now, updatedAt: now },
  { id: 'obj_res_1', type: 'document', title: 'Multi-agent Systems: A Survey', spaceId: 'space_research', description: 'Comprehensive foundation on multi-agent RL.', tags: ['Multi-agent', 'Survey'], createdAt: now, updatedAt: now },
  { id: 'obj_res_2', type: 'document', title: 'Spatial Memory in LLM Agents', spaceId: 'space_research', description: 'Structured notes on continuous background memory.', tags: ['Spatial Memory', 'LLMs'], createdAt: now, updatedAt: now },
  { id: 'obj_per_1', type: 'note', title: 'Daily Reflection — May 12', spaceId: 'space_personal', description: 'Grateful for continuous progress.', tags: ['Reflection', 'Daily'], createdAt: now, updatedAt: now },
  { id: 'obj_per_2', type: 'note', title: 'Reading List', spaceId: 'space_personal', description: 'Books to read this year.', tags: ['Books', 'Learning'], createdAt: now, updatedAt: now },
  { id: 'obj_lrn_1', type: 'note', title: 'Time Complexity', spaceId: 'space_learning', description: 'Big O notation, best case, average case and worst case analysis.', tags: ['Algorithms'], createdAt: now, updatedAt: now },
  { id: 'obj_lrn_2', type: 'note', title: 'Ownership in Rust', spaceId: 'space_learning', description: 'Borrowing, lifetimes and memory safety.', tags: ['Rust'], createdAt: now, updatedAt: now },
  { id: 'obj_lrn_3', type: 'note', title: 'Neural Networks', spaceId: 'space_learning', description: 'Basics of neurons, layers, activation functions.', tags: ['Machine Learning'], createdAt: now, updatedAt: now }
];

seedObjects.forEach(obj => {
  const list = spaceObjects.get(obj.spaceId) || [];
  list.push(obj);
  spaceObjects.set(obj.spaceId, list);
});

// ── Provider ────────────────────────────────────────────────────────

/** @type {import('../interfaces').SpaceProvider} */
const mockSpaceProvider = {
  async list({ page = 1, pageSize = 20 } = {}) {
    const all = Array.from(spaces.values());
    const start = (page - 1) * pageSize;
    return { data: all.slice(start, start + pageSize), total: all.length };
  },

  async get(id) {
    return spaces.get(id) || null;
  },

  async create(data) {
    const id = `space_${uuid().slice(0, 8)}`;
    const space = { id, name: data.name, description: data.description || '', type: data.type || 'custom', objectCount: 0, color: data.color || '#6B7280', createdAt: now, updatedAt: now };
    spaces.set(id, space);
    spaceObjects.set(id, []);
    return space;
  },

  async update(id, data) {
    const space = spaces.get(id);
    if (!space) return null;
    Object.assign(space, data, { updatedAt: new Date().toISOString() });
    return space;
  },

  async delete(id) {
    const existed = spaces.has(id);
    spaces.delete(id);
    spaceObjects.delete(id);
    return existed;
  },

  async listObjects(spaceId, { page = 1, pageSize = 20, type } = {}) {
    let objs = spaceObjects.get(spaceId) || [];
    if (type) objs = objs.filter(o => o.type === type);
    const start = (page - 1) * pageSize;
    return { data: objs.slice(start, start + pageSize), total: objs.length };
  }
};

module.exports = mockSpaceProvider;
