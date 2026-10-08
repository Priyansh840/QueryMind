# QueryMind — Current Frontend Screens Inventory & Catalog

This document is a snapshot catalog of all existing screens in `frontend/src/app`, documenting the route, UI purpose, and exact functionality of each screen before restructuring from scratch.

---

## 1. Authentication & Onboarding

| Route | Screen Name | What This Screen Does | Key Components & APIs |
| :--- | :--- | :--- | :--- |
| `/login` | **Sign In** | Authenticates users via Supabase email/password or OAuth. Redirects to `/dashboard` upon success. | Supabase Auth, login form, remember me, error alerts. |
| `/signup` / `/register` | **Sign Up** | User registration flow with email confirmation. | Supabase Auth signup flow. |
| `/onboarding` | **Workspace Onboarding** | Multi-step interactive wizard introducing workspace concepts, asking for default space preferences, and initial profile setup. | Step wizard, space creation preview, user role selection. |

---

## 2. Core Dashboard Screens (`/app/(dashboard)/*`)

| Route | Screen Name | What This Screen Does |
| :--- | :--- | :--- |
| `/dashboard` | **Home Dashboard** | High-level overview: displays recent workspaces, quick metrics, pending actions, recent activity feed, and quick prompts to ask AI. |
| `/chat` | **Global Chat & Reasoning** | Interactive conversation interface. Supports streaming AI reasoning, markdown answers, citations to uploaded documents, voice mode, and action proposal buttons. |
| `/vault` | **Documents (Vault)** | Document repository: Drag-and-drop file upload, file format support (PDF, Word, Markdown, Code), space categorization, bulk export/download, and document list/grid views. |
| `/spaces` | **Spaces Hub (All Spaces)** | Grid & list view of all created spaces/workspaces. Allows creating a space, viewing space descriptions, colors, icons, and document counts. |
| `/spaces/[id]` | **Space Detail View** | Deep dive into a single workspace: Space-specific documents, interactive knowledge map (graph visualization), milestone tracking, scratchpad notes, and space briefing. |
| `/goals` | **Goals Tracker** | Tracks active and completed milestones/objectives across spaces. Allows toggling completion, creating new goals, and linking goals to spaces. |
| `/projects` | **Merged into Spaces** | Unified directly into Spaces (`/spaces`). Every Project is modeled as an isolated domain Space with dedicated goals and document vaults. |
| `/intelligence` | **Intelligence Briefings** | Executive summaries, cross-document synthesized insights, auto-detected patterns, and recommended next steps generated from the space knowledge base. |
| `/memory` | **Retained Memory & Facts** | Shows facts, user preferences, and knowledge nuggets extracted and remembered by the AI during conversations. Allows reinforcing or removing memories. |
| `/search` | **Global Search** | Modal / page-level deep semantic search across all indexed documents, memories, and past conversations. |
| `/timeline` | **Timeline / Feed** | Chronological feed of events: document uploads, AI recommendations, goal completions, and decisions made. |
| `/activity` | **Audit & Activity Log** | Detailed audit trail of user actions, file ingestion events, and AI executions. |
| `/reflection` | **System Reflection** | Periodic synthesized reflections on user workflow habits, knowledge gaps, and productivity patterns. |
| `/personalization` | **AI Persona & Behavior** | Settings for adjusting AI reasoning style, tone, response depth, and domain focus. |
| `/settings` | **App & Account Settings** | User account management, theme customization (Dark/Light/Focus), API keys, notifications, and storage management. |
| `/profile` | **User Profile** | User avatar, display name, email, workspace role, and account credentials. |
| `/workspace` | **Workspace Switcher & Settings**| Multi-tenant workspace selector, member management, and workspace settings. |

---

## 3. Global Modal Overlays (Mounted in AppShell)

| Modal Name | Trigger | What It Does |
| :--- | :--- | :--- |
| **Spotlight Command Palette** | `⌘K` / `Ctrl+K` | Quick launcher to navigate to any screen, jump to a space, search files, or trigger actions. |
| **Global Copilot (Ask AI)** | `Alt+K` | Floating omni-AI assistant overlay accessible from any page without leaving context. |
| **Voice Chat Modal** | Mic button | Real-time speech-to-text / voice conversation overlay. |
| **Create Space Modal** | "+ New Space" | Modal to name, describe, choose color/icon, and create a new workspace. |
| **Object Detail Modal** | Clicking document chunk | Detailed inspector showing exact excerpt text, metadata, and citation details. |
