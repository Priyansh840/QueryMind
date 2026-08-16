/**
 * MYND BFF — Provider Interfaces
 * 
 * These interfaces define the contract between the BFF routes
 * and the underlying services (mock or real).
 * 
 * Each provider is a plain object with async methods.
 * The BFF depends on these interfaces — NEVER on implementations directly.
 * 
 * @module providers/interfaces
 */

/**
 * @typedef {Object} SpaceProvider
 * @property {(params?: { page?: number, pageSize?: number }) => Promise<{ data: import('../types/models').Space[], total: number }>} list
 * @property {(id: string) => Promise<import('../types/models').Space | null>} get
 * @property {(data: { name: string, description?: string, type?: string, color?: string }) => Promise<import('../types/models').Space>} create
 * @property {(id: string, data: Partial<{ name: string, description: string, type: string, color: string }>) => Promise<import('../types/models').Space | null>} update
 * @property {(id: string) => Promise<boolean>} delete
 * @property {(spaceId: string, params?: { page?: number, pageSize?: number, type?: string }) => Promise<{ data: import('../types/models').KnowledgeObject[], total: number }>} listObjects
 */

/**
 * @typedef {Object} ObjectProvider
 * @property {(id: string) => Promise<import('../types/models').KnowledgeObject | null>} get
 * @property {(data: { type: string, title: string, spaceId?: string, description?: string, content?: string, tags?: string[], metadata?: Record<string, unknown> }) => Promise<import('../types/models').KnowledgeObject>} create
 * @property {(id: string, data: Partial<{ title: string, description: string, content: string, tags: string[], metadata: Record<string, unknown> }>) => Promise<import('../types/models').KnowledgeObject | null>} update
 * @property {(id: string) => Promise<boolean>} delete
 * @property {(id: string) => Promise<import('../types/models').ActivityEvent[]>} getActivity
 * @property {(id: string) => Promise<{ id: string, type: string, title: string, relationship: string }[]>} getRelationships
 */

/**
 * @typedef {Object} SearchProvider
 * @property {(query: string, params?: { spaceId?: string, type?: string, page?: number, pageSize?: number }) => Promise<import('../types/models').SearchResponse>} search
 */

/**
 * @typedef {Object} ActivityProvider
 * @property {(params?: { spaceId?: string, objectId?: string, page?: number, pageSize?: number }) => Promise<{ data: import('../types/models').ActivityEvent[], total: number }>} list
 * @property {(id: string) => Promise<import('../types/models').ActivityEvent | null>} get
 */

/**
 * @typedef {Object} CaptureProvider
 * @property {(input: import('../types/models').CaptureInput) => Promise<import('../types/models').CaptureResponse>} create
 */

/**
 * @typedef {Object} AgentProvider
 * @property {(input: import('../types/models').AgentRunInput) => Promise<import('../types/models').AgentRun>} startRun
 * @property {(runId: string) => Promise<import('../types/models').AgentRun | null>} getRun
 * @property {(runId: string) => AsyncGenerator<import('../types/models').AgentEvent>} streamRun
 */

/**
 * @typedef {Object} MemoryProvider
 * @property {(query: string, params?: { spaceId?: string, objectId?: string, limit?: number }) => Promise<import('../types/models').Memory[]>} search
 * @property {(id: string) => Promise<import('../types/models').Memory | null>} get
 * @property {(objectId: string) => Promise<import('../types/models').Memory[]>} getRelated
 */

/**
 * @typedef {Object} KnowledgeProvider
 * @property {(objectId: string) => Promise<{ id: string, type: string, title: string, relationship: string }[]>} getConnections
 * @property {(spaceId: string) => Promise<import('../types/models').GraphData>} getGraph
 */

/**
 * @typedef {Object} FileProvider
 * @property {(file: { originalname: string, size: number, mimetype: string, buffer: Buffer }) => Promise<import('../types/models').FileUploadResponse>} upload
 * @property {(fileId: string) => Promise<import('../types/models').FileUploadResponse | null>} get
 */

module.exports = {};
