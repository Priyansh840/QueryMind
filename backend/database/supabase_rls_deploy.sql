-- =====================================================================
-- QueryMind - Supabase Cloud Relational Schema & PostgreSQL RLS Policies
-- Target: Supabase Cloud PostgreSQL (where auth.users exists)
-- Safe, Idempotent, Non-Destructive Deployment
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BASE TABLES (Created only if they do not already exist)
-- ---------------------------------------------------------------------

-- Table 1: users (Canonical link to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure Foreign Key to auth.users exists if table was created previously without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_auth_users' AND table_name = 'users'
    ) THEN
        BEGIN
            ALTER TABLE public.users 
            ADD CONSTRAINT fk_auth_users 
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

-- Table 2: spaces
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure partial unique index for single default space per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_user_one_default 
ON public.spaces (user_id) 
WHERE is_default = TRUE;

-- Ensure scoped slug uniqueness per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_user_slug 
ON public.spaces (user_id, slug) 
WHERE slug IS NOT NULL;

-- Table 3: projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 4: goals
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 5: documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 6: document_chunks
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content_text TEXT NOT NULL,
    page_number INTEGER,
    token_count INTEGER,
    embedding_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 7: knowledge
CREATE TABLE IF NOT EXISTS public.knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    source_chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE SET NULL,
    source_id UUID,
    title VARCHAR(255),
    content TEXT NOT NULL,
    knowledge_type VARCHAR(50) NOT NULL,
    page_number INTEGER,
    confidence FLOAT NOT NULL DEFAULT 1.0,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON public.knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_space_id ON public.knowledge(space_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_id ON public.knowledge(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_source_chunk_id ON public.knowledge(source_chunk_id);

-- Table 8: memories
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 1.0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    importance VARCHAR(50) NOT NULL DEFAULT 'medium',
    reinforcement_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 9: connections
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    relation VARCHAR(100) NOT NULL,
    reason TEXT,
    confidence FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 10: objectives
CREATE TABLE IF NOT EXISTS public.objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    raw_input TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 11: workflows
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 12: workflow_steps
CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    intent_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
);

-- Table 13: agent_runs
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    input_context JSONB,
    output_summary TEXT,
    tokens_used INTEGER,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Table 14: syntheses
CREATE TABLE IF NOT EXISTS public.syntheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
    findings JSONB,
    recommendations JSONB,
    evidence JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 15: workflow_events
CREATE TABLE IF NOT EXISTS public.workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL 15 TABLES
-- ---------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syntheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. DIRECT OWNERSHIP POLICIES (auth.uid() = user_id / auth.uid() = id)
-- ---------------------------------------------------------------------

-- users
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
CREATE POLICY "Users can manage their own profile" ON public.users
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- spaces
DROP POLICY IF EXISTS "Users can manage their own spaces" ON public.spaces;
CREATE POLICY "Users can manage their own spaces" ON public.spaces
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- goals
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals" ON public.goals
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- knowledge
DROP POLICY IF EXISTS "Users can manage their own knowledge" ON public.knowledge;
CREATE POLICY "Users can manage their own knowledge" ON public.knowledge
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- memories
DROP POLICY IF EXISTS "Users can manage their own memories" ON public.memories;
CREATE POLICY "Users can manage their own memories" ON public.memories
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- connections
DROP POLICY IF EXISTS "Users can manage their own connections" ON public.connections;
CREATE POLICY "Users can manage their own connections" ON public.connections
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- objectives
DROP POLICY IF EXISTS "Users can manage their own objectives" ON public.objectives;
CREATE POLICY "Users can manage their own objectives" ON public.objectives
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workflow_events
DROP POLICY IF EXISTS "Users can manage their own workflow events" ON public.workflow_events;
CREATE POLICY "Users can manage their own workflow events" ON public.workflow_events
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. NESTED OWNERSHIP POLICIES (EXISTS CHAINING)
-- ---------------------------------------------------------------------

-- projects (Project -> Space -> User)
DROP POLICY IF EXISTS "Users can manage projects in their spaces" ON public.projects;
CREATE POLICY "Users can manage projects in their spaces" ON public.projects
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.spaces WHERE public.spaces.id = space_id AND public.spaces.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.spaces WHERE public.spaces.id = space_id AND public.spaces.user_id = auth.uid())
);

-- documents (Document -> Space -> User)
DROP POLICY IF EXISTS "Users can manage documents in their spaces" ON public.documents;
CREATE POLICY "Users can manage documents in their spaces" ON public.documents
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.spaces WHERE public.spaces.id = space_id AND public.spaces.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.spaces WHERE public.spaces.id = space_id AND public.spaces.user_id = auth.uid())
);

-- document_chunks (Chunk -> Document -> Space -> User)
DROP POLICY IF EXISTS "Users can manage their document chunks" ON public.document_chunks;
CREATE POLICY "Users can manage their document chunks" ON public.document_chunks
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.documents d 
        JOIN public.spaces s ON s.id = d.space_id 
        WHERE d.id = document_id AND s.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.documents d 
        JOIN public.spaces s ON s.id = d.space_id 
        WHERE d.id = document_id AND s.user_id = auth.uid()
    )
);

-- workflows (Workflow -> Objective -> User)
DROP POLICY IF EXISTS "Users can manage workflows for their objectives" ON public.workflows;
CREATE POLICY "Users can manage workflows for their objectives" ON public.workflows
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
);

-- syntheses (Synthesis -> Objective -> User)
DROP POLICY IF EXISTS "Users can manage syntheses for their objectives" ON public.syntheses;
CREATE POLICY "Users can manage syntheses for their objectives" ON public.syntheses
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
);

-- workflow_steps (Step -> Workflow -> Objective -> User)
DROP POLICY IF EXISTS "Users can manage steps for their workflows" ON public.workflow_steps;
CREATE POLICY "Users can manage steps for their workflows" ON public.workflow_steps
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workflows w 
        JOIN public.objectives o ON o.id = w.objective_id 
        WHERE w.id = workflow_id AND o.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workflows w 
        JOIN public.objectives o ON o.id = w.objective_id 
        WHERE w.id = workflow_id AND o.user_id = auth.uid()
    )
);

-- agent_runs (Run -> Step -> Workflow -> Objective -> User)
DROP POLICY IF EXISTS "Users can manage runs for their steps" ON public.agent_runs;
CREATE POLICY "Users can manage runs for their steps" ON public.agent_runs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workflow_steps ws
        JOIN public.workflows w ON w.id = ws.workflow_id
        JOIN public.objectives o ON o.id = w.objective_id
        WHERE ws.id = workflow_step_id AND o.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workflow_steps ws
        JOIN public.workflows w ON w.id = ws.workflow_id
        JOIN public.objectives o ON o.id = w.objective_id
        WHERE ws.id = workflow_step_id AND o.user_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- 5. VERIFICATION QUERY (Run this to verify RLS enabled and policies active)
-- ---------------------------------------------------------------------
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    COUNT(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN (
    'users', 'spaces', 'projects', 'goals', 'documents', 'document_chunks',
    'knowledge', 'memories', 'connections', 'objectives', 'workflows',
    'workflow_steps', 'agent_runs', 'syntheses', 'workflow_events'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
