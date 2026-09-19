# MYND — FRONTEND ARCHITECT & UI MASTER SPECIFICATION

> **Target Audience**: AI Coding Agent / Frontend Specialist  
> **Mission**: Build, maintain, and polish the user-facing interface for **MYND** with zero hallucinations, strict backend adherence, and world-class product design.

---

## 1. PRODUCT ESSENCE & THE CORE MENTAL MODEL

### What is MYND?
**MYND** is an **Intelligent Autonomous Workspace**. It is NOT a generic chat interface, not a document repository, and not a technical AI pipeline visualizer.

MYND helps teams ingest context, reason about complex decisions, approve high-confidence proposals, and track real project outcomes.

### The 4-Pillar Mental Model (Non-Negotiable)
The entire user journey is organized into exactly **four primary navigation destinations**:

```text
MYND WORKSPACE
├── 1. Overview      (/spaces/[spaceId])               → Daily command center & synthesized pulse
├── 2. Work          (/spaces/[spaceId]/work)          → Outcome layer: Projects, Goals, Decisions, Background Work
├── 3. Knowledge     (/spaces/[spaceId]/knowledge)     → Grounding evidence: Documents & Retained Memory
└── 4. Sessions      (/spaces/[spaceId]/conversations) → Contextual reasoning threads & proposal generation
```

### The Human Journey
```text
Knowledge (Evidence)
       ↓
Sessions (Reasoning & Synthesis)
       ↓
Decision (Action Proposal)
       ↓
User Approves (1-Click Execution)
       ↓
Outcome Tracked in Work (Projects & Goals)
```

### Forbidden AI Jargon (Strict Rule)
Users are business operators, engineers, and product leaders. **Never expose technical AI plumbing in the primary UI**:
* ❌ FORBIDDEN: *RAG, embeddings, Qdrant, vector chunks, token counts, LangGraph, agent execution graphs, nodes, subagents, prompt engineering.*
* ✅ PREFERRED: *Grounding knowledge, excerpts, evidence citations, MYND is researching, research completed, decision rationale, tracked outcomes.*

---

## 2. TECHNOLOGY STACK & ARCHITECTURE

### Frontend Stack (`frontend-v2/`)
* **Framework**: Next.js 16.3+ (App Router with Turbopack)
* **Runtime / React**: React 19
* **Language**: TypeScript 5+ (Strict Mode)
* **Styling**: Tailwind CSS v4 + Semantic CSS Custom Properties (`var(--bg-app)`, `var(--surface-primary)`, etc.)
* **Icons**: `lucide-react`
* **Authentication**: Supabase Auth (`@supabase/ssr` / `@supabase/supabase-js`)
* **State Management**: React Server State via custom `apiClient` (`lib/api/client.ts`), React Context for Auth/Active Space (`lib/auth/AuthContext.tsx`).

### Backend Stack (`backend/`) — *Read-Only Source of Truth*
* **API Framework**: FastAPI (Python 3.12+, Async SQLAlchemy)
* **Database**: PostgreSQL (Core tables: `spaces`, `projects`, `goals`, `documents`, `document_chunks`, `knowledge`, `conversations`, `messages`, `action_proposals`, `memories`, `workflows`)
* **Vector Store**: Qdrant (Internal only, never exposed to user)
* **Orchestrator**: LangGraph (Multi-agent workflow execution, abstracted on frontend)

---

## 3. COMPLETE SCREEN & ROUTE SPECIFICATION

### Route 1: Space Overview
* **Path**: `/spaces/[spaceId]`
* **Purpose**: Space Command Center. Synthesizes what is active, what requires immediate decision, and recent knowledge.
* **Sections**:
  1. **Space Header**: Name, description, quick actions ("Add File", "Space Settings").
  2. **Pending Decisions Banner**: Action proposals awaiting user approval. Cards contain Approve/Reject buttons and link to Decision Trace.
  3. **Active Work Grid**: Real projects and goals active in this space with direct links to `/work/projects/[id]` and `/work/goals/[id]`. Link to "View All Work" (`/work`).
  4. **Ask MYND Input Bar**: Unified natural-language textarea. Submitting creates a new conversation with `initialMessage` and routes directly to `/conversations/[id]`.
  5. **Grounding Knowledge & Activity**: Top 4 recent documents (`/knowledge/documents/[id]`) and audit activity log.

---

### Route 2: Work & Initiatives Hub
* **Path**: `/spaces/[spaceId]/work`
* **Purpose**: The Outcome Layer. Where the consequences of MYND's reasoning live.
* **Filter Tabs**:
  * `All Work`
  * `Projects` (Count)
  * `Goals` (Count)
  * `Decisions` (Count)
  * `Background Work` (Count)
* **Content Sections**:
  1. **Active Work**:
     - **Projects**: Real projects with status badge (`active`, `completed`), creation date, associated goal count, and link to Project Detail.
     - **Goals**: Real goals with status badge, parent project link, and link to Goal Detail.
  2. **Decisions**: Real action proposals recorded in this space. Reuses `DecisionCard`. Displays proposal reason, confidence, parameters, approve/reject controls (if pending), and outcome banner (if executed).
  3. **Background Work**: Long-running MYND workflows in human language:
     - *"MYND is researching..."* / *"Research completed"* / *"Needs your review"*
     - Step progress: `Step X of Y • [current step]`
     - "Execution Details" button linking to secondary inspector `/spaces/[spaceId]/tasks/[workflowId]`.
* **Empty States**: Explanatory text guiding users to ask MYND questions or approve proposals to populate initiatives.

---

### Route 3: Project Detail
* **Path**: `/spaces/[spaceId]/work/projects/[projectId]`
* **Purpose**: Inspect a tracked initiative created from MYND's reasoning or directly established.
* **Core Questions Answered**:
  1. **WHAT?**: Project Name, status badge, created timestamp.
  2. **WHY?**: Originating decision provenance. Strictly matched via `action.executed_target_id === projectId`. Links to full decision trace and session thread. If no decision exists, displays neutral text: *"Related decision information unavailable"*.
  3. **WHAT BELONGS TO IT?**: Real associated goals fetched via `GET /api/v1/goals?project_id=[projectId]`. Interactive status toggle (`active` ↔ `completed`) using real `PATCH /api/v1/goals/[id]`.
  4. **WHAT NEXT?**: List of pending incomplete goals.
* **Route Safety**: Enforces `project.space_id === spaceId`. If ID is invalid or belongs to another space, renders clean `Project Not Found` empty state with `Return to Work` button.

---

### Route 4: Goal Detail
* **Path**: `/spaces/[spaceId]/work/goals/[goalId]`
* **Purpose**: Inspect an objective or milestone.
* **Core Questions Answered**:
  1. **WHAT?**: Objective text, status badge (`active`, `completed`), creation timestamp.
  2. **STATUS ACTION**: 1-Click button to toggle status (`Mark Completed` / `Mark Active`) calling real `PATCH /api/v1/goals/[goalId]`.
  3. **PART OF?**: If `goal.project_id` exists, fetches parent project and displays: `Part of Project: [Name]` with `View Project →` button.
  4. **WHY?**: Originating decision provenance strictly matched via `action.executed_target_id === goalId`.
  5. **LIFECYCLE**: Timestamp and UUID identifier.
* **Route Safety**: Validates parent project space ownership or action origin in the space.

---

### Route 5: Knowledge Hub
* **Path**: `/spaces/[spaceId]/knowledge`
* **Purpose**: Primary evidence layer. Everything MYND knows about this Space.
* **Header & Action**:
  - Title: *"Knowledge"*
  - Subtitle: *"What MYND knows about this Space and uses as evidence when reasoning and proposing actions."*
  - Primary Action: `[ Add Knowledge ]` button (opens `DocumentUploadDialog`).
* **Space-Scoped Search Bar**:
  - Natural language search calling `/api/v1/search?query=...&space_id=...&types=document,knowledge,memory`.
  - Displays excerpt matches with direct links to documents or memories without technical vector scores.
* **Filter Tabs**:
  * `All Knowledge`
  * `Documents` (Count)
  * `Retained Knowledge` (Count)
* **Sources Grid**:
  - **Documents**: File icon, title, format, upload date, plain-language status:
    - `completed` → `Ready for MYND` (Green badge)
    - `processing` / `pending` → `Processing document...` (Amber badge)
    - `failed` → `Needs attention` (Red badge)
    - Action: Link to `/spaces/[spaceId]/knowledge/documents/[id]` and delete button (`DELETE /api/v1/documents/[id]`).
  - **Retained Knowledge (Memory)**: Facts and patterns MYND remembered from sessions:
    - Retained text content, memory type badge (`fact`, `preference`, `pattern`), date.
    - 1-Click `Reinforce` button calling `POST /api/v1/memories/[id]/reinforce`.
* **Empty State**: *"MYND doesn't know much about this Space yet. Add your first document."*

---

### Route 6: Document Detail
* **Path**: `/spaces/[spaceId]/knowledge/documents/[documentId]`
* **Purpose**: Detailed evidence inspection of an uploaded document.
* **Core Questions Answered**:
  1. **WHAT IS THIS?**: Title, type, upload date.
  2. **CAN MYND USE IT?**: Status badge (`Ready for MYND`) and plain-language explanation of how it serves as evidence.
  3. **WHERE IS THIS USED?**: Checks decisions in this space that cite this document as evidence. Links to those decisions.
  4. **EXTRACTED KNOWLEDGE EXCERPTS**: Displays human-readable text chunks with page numbers (`Excerpt #1 • Page 2`).
  5. **MANAGEMENT**: Delete document button (`DELETE /api/v1/documents/[id]`).
* **Route Safety**: Enforces `doc.space_id === spaceId`.

---

### Route 7: Sessions (Reasoning Threads)
* **Path**: `/spaces/[spaceId]/conversations` & `/spaces/[spaceId]/conversations/[conversationId]`
* **Purpose**: Interactive multi-agent reasoning, deep contextual Q&A, and proposal generation.
* **Features**:
  - Chat stream with Markdown rendering.
  - Source citations linking to document details.
  - Action Proposals embedded directly in assistant messages using `ActionProposalCard`.
  - 1-Click Approve / Reject triggers backend execution and immediately renders outcome banner (`✓ Project created: [Name] [View Project →]`).

---

### Route 8: Decision Intelligence Detail
* **Path**: `/spaces/[spaceId]/decisions/[decisionId]`
* **Purpose**: Full forensic audit of a decision.
* **Sections**:
  1. **Decision Brief**: Title, proposed action type, status, conclusion, and parameters.
  2. **Outcome Banner**: If executed, prominent link to the created Project (`/work/projects/[targetId]`) or Goal (`/work/goals/[targetId]`).
  3. **Evidence Lineage Graph**: Visual trace connecting Source Documents → Synthesis → Decision → Outcome.
  4. **Supporting Citations**: Clickable document citations routing to `/knowledge/documents/[id]`.
  5. **Timeline**: Chronological audit events.

---

### Route 9: Advanced Technical Inspector (Secondary)
* **Path**: `/spaces/[spaceId]/tasks/[workflowId]`
* **Purpose**: Deep technical inspection for long-running workflows (LangGraph agent runs, step iterations, tool calls).
* **Navigation rule**: Kept strictly secondary. Accessed only via "Execution Details" on Background Work cards. Never listed in top-level navigation.

---

## 4. REAL BACKEND API CONTRACTS (SOURCE OF TRUTH)

The frontend must strictly interact with these verified endpoints. **Never invent endpoints or fake fields.**

### Spaces
* `GET /api/v1/spaces` → `Space[]`
* `GET /api/v1/spaces/{id}` → `Space`
* `GET /api/v1/spaces/{id}/workspace` → `SpaceWorkspaceSummary` (Overview aggregation)
* `POST /api/v1/spaces` → Body: `{ name, description?, icon?, color? }`
* `PATCH /api/v1/spaces/{id}` → Body: `{ name?, description? }`
* `DELETE /api/v1/spaces/{id}`

### Projects
* `GET /api/v1/projects?space_id={id}` → `ProjectItem[]`
* `GET /api/v1/projects/{id}` → `ProjectItem` (`{ id, space_id, name, status, created_at }`)
* *Gap Note*: Projects currently have NO `PATCH` endpoint for manual status modification.

### Goals
* `GET /api/v1/goals` → `GoalItem[]`
* `GET /api/v1/goals?project_id={id}` → `GoalItem[]`
* `GET /api/v1/goals/{id}` → `GoalItem` (`{ id, user_id, project_id, description, status, created_at }`)
* `PATCH /api/v1/goals/{id}` → Body: `{ status?: "active" | "completed", description?: string }` *(Fully authenticated and verified)*
* `DELETE /api/v1/goals/{id}`

### Actions & Decisions
* `GET /api/v1/actions?space_id={id}&limit=50` → `ActionProposalListResponse`
* `GET /api/v1/actions/{proposal_id}/decision` → `DecisionDetail`
* `POST /api/v1/actions/{proposal_id}/approve` → `ActionExecutionResult` (`{ success, proposal_id, action_type, status: "executed", target_id: "<UUID_OF_CREATED_RESOURCE>", message }`)
* `POST /api/v1/actions/{proposal_id}/reject` → `ActionProposal`

### Documents & Knowledge
* `GET /api/v1/documents/?space_id={id}` → `DocumentItem[]`
* `GET /api/v1/documents/{id}` → `DocumentItem` with `chunks: DocumentChunk[]`
* `POST /api/v1/documents/upload` → Multipart Form: `file`, `space_id`
* `DELETE /api/v1/documents/{id}`
* `GET /api/v1/knowledge?space_id={id}` → `KnowledgeItem[]`
* `DELETE /api/v1/knowledge/{id}`

### Memory
* `GET /api/v1/memories?space_id={id}` → `MemoryItem[]`
* `POST /api/v1/memories/{id}/reinforce` → `MemoryItem`
* `DELETE /api/v1/memories/{id}`

### Search
* `GET /api/v1/search?query={q}&space_id={id}&types=document,knowledge,memory` → `SearchResponse`

### Workflows
* `GET /api/v1/workflows?space_id={id}` → `WorkflowListItem[]` (`{ id, goal, status, steps_count, completed_steps_count, current_step }`)
* `GET /api/v1/workflows/{id}` → `WorkflowDetail`

---

## 5. UI DESIGN SYSTEM & DESIGN TOKENS

The interface must feel **calm, structured, authoritative, and fast**. Avoid hyperactive animations or dashboard clutter.

### Semantic Color Tokens (CSS Variables)
* **Backgrounds**:
  * `--bg-app`: Main canvas background (`#090d16` in dark mode)
  * `--surface-primary`: Main card/panel surface (`#111827`)
  * `--surface-secondary`: Muted inner containers, chips, tags (`#1f2937`)
  * `--surface-hover`: Hover state for surfaces
* **Borders**:
  * `--border-subtle`: Subtle separation borders (`rgba(255,255,255,0.08)`)
  * `--border-default`: Default card borders (`rgba(255,255,255,0.15)`)
  * `--border-strong`: Focused or highlighted borders
* **Typography & Accents**:
  * `--text-primary`: Pure readable headings and active text (`#f9fafb`)
  * `--text-secondary`: Body descriptions, explanations (`#9ca3af`)
  * `--text-muted`: Meta tags, timestamps, secondary labels (`#6b7280`)
  * `--accent-primary`: Brand accent (`#0f766e` / Teal)
  * `--accent-text`: Accent text highlighting (`#2dd4bf`)
  * Status Colors: Success (`#10b981`), Warning/Running (`#f59e0b`), Error (`#ef4444`)

### Core Reusable UI Components
All located in `frontend-v2/src/components/ui/`:
* `Surface`: Foundational card container with variants `primary`, `secondary`, `interactive`.
* `Button`: Primary, secondary, outline, ghost, danger variants. Supports `isLoading`, `leftIcon`, `rightIcon`.
* `Badge`: Pill badges (`default`, `accent`, `outline`, `success`).
* `StatusIndicator`: Standardized dot + text status indicator (`running`, `completed`, `failed`, `pending`).
* `EmptyState`: Clean icon, title, description, and action button.
* `Skeleton`: Pulsing placeholders for zero layout shifts during data fetching.
* `Dialog`: Accessible modal container with backdrop blur and escape key handlers.

---

## 6. NON-NEGOTIABLE IMPLEMENTATION RULES

1. **NO FAKE DATA**:
   - Never fabricate progress percentages (e.g., "68% complete") unless the backend explicitly provides that exact number.
   - Never generate random UUIDs for outcomes. All IDs must come directly from real API responses.
2. **STRICT SPACE ISOLATION**:
   - Every page under `/spaces/[spaceId]/*` must strictly filter data by `spaceId`.
   - On detail routes (`/work/projects/[id]`, `/work/goals/[id]`, `/knowledge/documents/[id]`), verify that `resource.space_id === spaceId`. If mismatched, throw an unauthorized error and display the "Not Found" state.
3. **PRESERVE ESTABLISHED UX**:
   - Never add "Tasks", "Workflows", "Goals", "Projects", "RAG", or "Memories" as top-level sidebar navigation items.
   - Top-level remains: **Overview · Work · Knowledge · Sessions**.
4. **NO DUPLICATE EXECUTIONS**:
   - Always guard approval/rejection buttons with `if (isProcessing || status !== "pending") return;` and disable the button while async requests are in-flight.
5. **ZERO BUILD / LINT COMPROMISES**:
   - Every UI change must pass `npm run build` with exit code `0` and clean TypeScript typing.

---

## 7. QUICK INTERVIEW GUIDE (HOW TO PROMPT THIS AGENT)

When talking to the UI agent for any new feature or tweak, refer to these anchors:
* *"Work on Route X according to the UI Master Spec."*
* *"Ensure the decision-to-outcome link follows Section 4 contracts."*
* *"Check space isolation on this new detail view."*
* *"Adopt the design tokens in Section 5 with zero AI jargon."*
