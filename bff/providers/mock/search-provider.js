/**
 * MYND BFF — Mock Search Provider
 * @implements {import('../interfaces').SearchProvider}
 */
const objectProvider = require('./object-provider');

/** @type {import('../interfaces').SearchProvider} */
const mockSearchProvider = {
  async search(query, { spaceId, type, page = 1, pageSize = 20 } = {}) {
    const start = Date.now();
    const q = query.toLowerCase();

    // Search across all objects by title/description/tags
    const allIds = ['obj_car_1', 'obj_car_2', 'obj_car_3', 'obj_res_1', 'obj_res_2', 'obj_per_1', 'obj_per_2', 'obj_lrn_1', 'obj_lrn_2', 'obj_lrn_3'];
    const matched = [];

    for (const id of allIds) {
      const obj = await objectProvider.get(id);
      if (!obj) continue;
      if (spaceId && obj.spaceId !== spaceId) continue;
      if (type && obj.type !== type) continue;

      const text = `${obj.title} ${obj.description || ''} ${(obj.tags || []).join(' ')}`.toLowerCase();
      if (!q || text.includes(q)) {
        const score = q ? (text.indexOf(q) === 0 ? 0.99 : 0.8 + Math.random() * 0.15) : 0.5;
        matched.push({
          id: obj.id,
          type: obj.type,
          title: obj.title,
          description: obj.description,
          spaceId: obj.spaceId,
          updatedAt: obj.updatedAt,
          score: Math.round(score * 100) / 100
        });
      }
    }

    matched.sort((a, b) => b.score - a.score);
    const offset = (page - 1) * pageSize;

    return {
      query,
      results: matched.slice(offset, offset + pageSize),
      total: matched.length,
      took: Date.now() - start
    };
  }
};

module.exports = mockSearchProvider;
