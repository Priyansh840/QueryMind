/**
 * MYND BFF — Canonical Type Definitions
 * 
 * These are FRONTEND/API CONTRACT types.
 * They do NOT represent internal database schemas.
 * The BFF normalizes backend responses into these shapes.
 * 
 * @module types/models
 */

// ─── Knowledge Object ──────────────────────────────────────────────

/**
 * @typedef {Object} KnowledgeObject
 * @property {string} id
 * @property {string} type - 'note' | 'document' | 'meeting' | 'project' | 'idea' | 'research' | 'file' | 'link' | 'conversation' | 'code' | 'reference' | 'memory' | 'course' | string
 * @property {string} title
 * @property {string} [spaceId]
 * @property {string} [description]
 * @property {string} [content]
 * @property {string[]} [tags]
 * @property {string} createdAt - ISO 8601
 * @property {string} updatedAt - ISO 8601
 * @property {Record<string, unknown>} [metadata]
 */

// ─── Space ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} Space
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} [type] - 'career' | 'research' | 'personal' | 'learning' | string
 * @property {number} objectCount
 * @property {string} [color]
 * @property {string} [icon]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

// ─── Search Result ──────────────────────────────────────────────────

/**
 * @typedef {Object} SearchResult
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} [description]
 * @property {string} [spaceId]
 * @property {string} [spaceName]
 * @property {string} updatedAt
 * @property {number} [score] - Relevance score 0..1
 */

/**
 * @typedef {Object} SearchResponse
 * @property {string} query
 * @property {SearchResult[]} results
 * @property {number} total
 * @property {number} took - Time in ms
 */

// ─── Activity Event ─────────────────────────────────────────────────

/**
 * @typedef {Object} ActivityEvent
 * @property {string} id
 * @property {string} type - 'OBJECT_CREATED' | 'OBJECT_UPDATED' | 'CONNECTION_CREATED' | 'AGENT_RUN_COMPLETED' | 'MEMORY_UPDATED' | 'CAPTURE_RECEIVED' | string
 * @property {string} actor - 'user' | 'agent' | 'system'
 * @property {string} [objectId]
 * @property {string} [spaceId]
 * @property {string} message
 * @property {string} timestamp - ISO 8601
 * @property {Record<string, unknown>} [metadata]
 */

// ─── Capture ────────────────────────────────────────────────────────

/**
 * @typedef {Object} CaptureInput
 * @property {string} type - 'text' | 'url' | 'file' | 'image' | 'voice'
 * @property {string} content
 * @property {string} [spaceId]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} CaptureResponse
 * @property {string} captureId
 * @property {string} status - 'received' | 'processing' | 'completed' | 'failed'
 */

// ─── Agent Run ──────────────────────────────────────────────────────

/**
 * @typedef {Object} AgentRunInput
 * @property {string} intent - 'analyze' | 'summarize' | 'connect' | 'explain' | 'research' | string
 * @property {string} [objectId]
 * @property {string} [spaceId]
 * @property {string} [query]
 * @property {Record<string, unknown>} [context]
 */

/**
 * @typedef {Object} AgentRun
 * @property {string} runId
 * @property {string} status - 'started' | 'running' | 'completed' | 'failed'
 * @property {string} [result]
 * @property {string} startedAt
 * @property {string} [completedAt]
 */

/**
 * @typedef {Object} AgentEvent
 * @property {string} type - 'agent.started' | 'agent.progress' | 'agent.completed' | 'agent.failed'
 * @property {string} runId
 * @property {string} [message]
 * @property {number} [progress] - 0..100
 * @property {string} timestamp
 */

// ─── Memory ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} Memory
 * @property {string} id
 * @property {string} content
 * @property {string} [objectId]
 * @property {string} [spaceId]
 * @property {string} type - 'episodic' | 'semantic' | 'procedural' | string
 * @property {number} [relevance] - 0..1
 * @property {string} createdAt
 */

// ─── Graph / Connections ────────────────────────────────────────────

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {string} label
 * @property {string} type
 * @property {string} [spaceId]
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} source
 * @property {string} target
 * @property {string} [relationship]
 * @property {number} [weight]
 */

/**
 * @typedef {Object} GraphData
 * @property {GraphNode[]} nodes
 * @property {GraphEdge[]} edges
 */

// ─── File Upload ────────────────────────────────────────────────────

/**
 * @typedef {Object} FileUploadResponse
 * @property {string} fileId
 * @property {string} name
 * @property {number} size
 * @property {string} mimeType
 * @property {string} status - 'uploaded' | 'processing' | 'ready' | 'failed'
 */

// ─── API Error ──────────────────────────────────────────────────────

/**
 * @typedef {Object} ApiError
 * @property {string} code - 'NOT_FOUND' | 'VALIDATION_ERROR' | 'SERVICE_UNAVAILABLE' | 'UNAUTHORIZED' | 'INTERNAL_ERROR' | 'TIMEOUT' | 'AGENT_FAILED' | 'UPLOAD_FAILED'
 * @property {string} message
 * @property {string} requestId
 */

// ─── Pagination ─────────────────────────────────────────────────────

/**
 * @typedef {Object} PaginatedResponse
 * @property {Array} data
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 * @property {boolean} hasMore
 */

module.exports = {};
