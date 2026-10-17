# AI Autonomous Agent Architecture Manifesto
Project QueryMind is an enterprise second-brain and autonomous multi-agent cognitive architecture.
It features hierarchical multi-agent orchestration, live semantic chunking, and dual-layer vector search.

### Section 1: Ingestion and Partitioning
Documents ingested into QueryMind undergo recursive character and semantic partitioning.
Each chunk is calibrated to 256-512 token windows with 10% overlap to preserve cross-boundary semantics.
Embeddings are computed using BAAI/bge-small-en-v1.5 and stored in Qdrant collections.

### Section 2: Retrieval and Cross-Encoder Re-Ranking
Queries submitted by the user are routed through the Query Analyzer agent.
Hybrid dense and sparse retrieval gathers the top 20 candidate chunks.
A cross-encoder re-ranks the candidates to select the top 5 most grounded passages.

### Section 3: Synthesis and Action Planning
The Synthesizer agent aggregates evidence with citations, strictly grounding answers to prevent hallucinations.
Execution subagents autonomously plan tasks, update timelines, and commit knowledge nodes.
