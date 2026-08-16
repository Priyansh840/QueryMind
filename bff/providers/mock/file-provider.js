/**
 * MYND BFF — Mock File Provider
 * @implements {import('../interfaces').FileProvider}
 */
const { v4: uuid } = require('uuid');

const files = new Map();

const mockFileProvider = {
  async upload(file) {
    const fileId = `file_${uuid().slice(0, 8)}`;
    const record = { fileId, name: file.originalname, size: file.size, mimeType: file.mimetype, status: 'uploaded' };
    files.set(fileId, record);
    return record;
  },
  async get(fileId) {
    return files.get(fileId) || null;
  }
};

module.exports = mockFileProvider;
