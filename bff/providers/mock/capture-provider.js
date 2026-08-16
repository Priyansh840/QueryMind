/**
 * MYND BFF — Mock Capture Provider
 * @implements {import('../interfaces').CaptureProvider}
 */
const { v4: uuid } = require('uuid');

/** @type {import('../interfaces').CaptureProvider} */
const mockCaptureProvider = {
  async create(input) {
    return { captureId: `cap_${uuid().slice(0, 8)}`, status: 'received' };
  }
};

module.exports = mockCaptureProvider;
