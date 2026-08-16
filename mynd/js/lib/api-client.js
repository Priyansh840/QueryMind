/**
 * MYND Frontend API Client
 * 
 * Provides a unified, type-safe(ish) interface to the BFF.
 * The UI should NEVER use raw fetch() directly.
 */

class ApiClient {
  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async _fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
      }
    }

    const res = await fetch(url, { ...options, headers });
    
    if (!res.ok) {
      let errData;
      try { errData = await res.json(); } catch(e) { errData = { error: { message: res.statusText }}; }
      throw new Error(errData.error?.message || 'API request failed');
    }

    if (res.status === 204) return null;
    return res.json();
  }

  // ── Spaces ──
  spaces = {
    list: (params) => this._fetch(`/spaces?${new URLSearchParams(params || {})}`),
    get: (id) => this._fetch(`/spaces/${id}`),
    create: (data) => this._fetch(`/spaces`, { method: 'POST', body: data }),
    update: (id, data) => this._fetch(`/spaces/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => this._fetch(`/spaces/${id}`, { method: 'DELETE' }),
    listObjects: (id, params) => this._fetch(`/spaces/${id}/objects?${new URLSearchParams(params || {})}`),
    getGraph: (id) => this._fetch(`/spaces/${id}/graph`)
  };

  // ── Objects ──
  objects = {
    get: (id) => this._fetch(`/objects/${id}`),
    create: (data) => this._fetch(`/objects`, { method: 'POST', body: data }),
    update: (id, data) => this._fetch(`/objects/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => this._fetch(`/objects/${id}`, { method: 'DELETE' }),
    getRelationships: (id) => this._fetch(`/objects/${id}/relationships`),
    getActivity: (id) => this._fetch(`/objects/${id}/activity`),
    getConnections: (id) => this._fetch(`/objects/${id}/connections`),
    getMemories: (id) => this._fetch(`/objects/${id}/memories`)
  };

  // ── Search ──
  search = {
    query: (params) => this._fetch(`/search?${new URLSearchParams(params)}`)
  };

  // ── Activity ──
  activity = {
    list: (params) => this._fetch(`/activity?${new URLSearchParams(params || {})}`),
    get: (id) => this._fetch(`/activity/${id}`)
  };

  // ── Capture ──
  capture = {
    create: (data) => this._fetch(`/capture`, { method: 'POST', body: data })
  };

  // ── Agents ──
  agent = {
    startRun: (data) => this._fetch(`/agent/runs`, { method: 'POST', body: data }),
    getRun: (id) => this._fetch(`/agent/runs/${id}`),
    getStreamUrl: (id) => `${this.baseUrl}/agent/runs/${id}/stream`
  };

  // ── Memory ──
  memory = {
    search: (params) => this._fetch(`/memory/search?${new URLSearchParams(params)}`),
    get: (id) => this._fetch(`/memory/${id}`)
  };

  // ── Files ──
  files = {
    upload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return this._fetch(`/files`, { method: 'POST', body: formData });
    },
    get: (id) => this._fetch(`/files/${id}`)
  };
}

// Global instance for frontend
window.myndApi = new ApiClient();
