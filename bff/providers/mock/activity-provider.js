/**
 * MYND BFF — Mock Activity Provider
 * @implements {import('../interfaces').ActivityProvider}
 */
const { v4: uuid } = require('uuid');
const now = new Date().toISOString();

const events = [
  { id: 'evt_1', type: 'OBJECT_UPDATED', actor: 'user', objectId: 'obj_car_1', spaceId: 'space_career', message: 'Resume 2026 updated with latest metrics', timestamp: now },
  { id: 'evt_2', type: 'CONNECTION_CREATED', actor: 'agent', objectId: 'obj_car_1', spaceId: 'space_career', message: 'Connected Resume ↔ Projects', timestamp: now },
  { id: 'evt_3', type: 'OBJECT_UPDATED', actor: 'user', objectId: 'obj_car_2', spaceId: 'space_career', message: 'Kalyra Engine commit pushed (7 commits)', timestamp: now },
  { id: 'evt_4', type: 'OBJECT_UPDATED', actor: 'user', objectId: 'obj_lrn_1', spaceId: 'space_learning', message: 'Completed lesson 18 of System Design Basics', timestamp: now },
  { id: 'evt_5', type: 'CAPTURE_RECEIVED', actor: 'user', spaceId: 'space_research', message: 'ArXiv paper parsed: 14 theorems extracted', timestamp: now }
];

/** @type {import('../interfaces').ActivityProvider} */
const mockActivityProvider = {
  async list({ spaceId, objectId, page = 1, pageSize = 20 } = {}) {
    let filtered = events;
    if (spaceId) filtered = filtered.filter(e => e.spaceId === spaceId);
    if (objectId) filtered = filtered.filter(e => e.objectId === objectId);
    const start = (page - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize), total: filtered.length };
  },

  async get(id) {
    return events.find(e => e.id === id) || null;
  }
};

module.exports = mockActivityProvider;
