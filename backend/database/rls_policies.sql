-- =====================================================================
-- QueryMind - RLS Policies and Supabase Auth Foreign Key
-- Run this directly in the Supabase SQL Editor or via an Alembic migration
-- =====================================================================

-- 1. Foreign Key mapping to Supabase Auth
ALTER TABLE public.users 
ADD CONSTRAINT fk_auth_users 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Enable RLS on all 15 tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Direct Ownership Tables
-- ==========================================

-- users
CREATE POLICY "Users can manage their own profile" ON users
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- spaces
CREATE POLICY "Users can manage their own spaces" ON spaces
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- goals
CREATE POLICY "Users can manage their own goals" ON goals
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- knowledge
CREATE POLICY "Users can manage their own knowledge" ON knowledge
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- memories
CREATE POLICY "Users can manage their own memories" ON memories
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- connections
CREATE POLICY "Users can manage their own connections" ON connections
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- objectives
CREATE POLICY "Users can manage their own objectives" ON objectives
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workflow_events
CREATE POLICY "Users can manage their own workflow events" ON workflow_events
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. Nested Ownership Tables (EXISTS chaining)
-- ==========================================

-- projects (Project -> Space -> User)
CREATE POLICY "Users can manage projects in their spaces" ON projects
FOR ALL USING (
    EXISTS (SELECT 1 FROM spaces WHERE spaces.id = space_id AND spaces.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM spaces WHERE spaces.id = space_id AND spaces.user_id = auth.uid())
);

-- documents (Document -> Space -> User)
CREATE POLICY "Users can manage documents in their spaces" ON documents
FOR ALL USING (
    EXISTS (SELECT 1 FROM spaces WHERE spaces.id = space_id AND spaces.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM spaces WHERE spaces.id = space_id AND spaces.user_id = auth.uid())
);

-- document_chunks (Chunk -> Document -> Space -> User)
CREATE POLICY "Users can manage their document chunks" ON document_chunks
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM documents d 
        JOIN spaces s ON s.id = d.space_id 
        WHERE d.id = document_id AND s.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents d 
        JOIN spaces s ON s.id = d.space_id 
        WHERE d.id = document_id AND s.user_id = auth.uid()
    )
);

-- workflows (Workflow -> Objective -> User)
CREATE POLICY "Users can manage workflows for their objectives" ON workflows
FOR ALL USING (
    EXISTS (SELECT 1 FROM objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
);

-- syntheses (Synthesis -> Objective -> User)
CREATE POLICY "Users can manage syntheses for their objectives" ON syntheses
FOR ALL USING (
    EXISTS (SELECT 1 FROM objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM objectives o WHERE o.id = objective_id AND o.user_id = auth.uid())
);

-- workflow_steps (Step -> Workflow -> Objective -> User)
CREATE POLICY "Users can manage steps for their workflows" ON workflow_steps
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM workflows w 
        JOIN objectives o ON o.id = w.objective_id 
        WHERE w.id = workflow_id AND o.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM workflows w 
        JOIN objectives o ON o.id = w.objective_id 
        WHERE w.id = workflow_id AND o.user_id = auth.uid()
    )
);

-- agent_runs (Run -> Step -> Workflow -> Objective -> User)
CREATE POLICY "Users can manage runs for their steps" ON agent_runs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM workflow_steps ws
        JOIN workflows w ON w.id = ws.workflow_id
        JOIN objectives o ON o.id = w.objective_id
        WHERE ws.id = workflow_step_id AND o.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM workflow_steps ws
        JOIN workflows w ON w.id = ws.workflow_id
        JOIN objectives o ON o.id = w.objective_id
        WHERE ws.id = workflow_step_id AND o.user_id = auth.uid()
    )
);
