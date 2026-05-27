-- project_members 테이블
CREATE TABLE IF NOT EXISTS project_members (
  project_id text REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- project_members 정책 초기화
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'project_members'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON project_members', r.policyname); END LOOP; END $$;

CREATE POLICY "pm_select" ON project_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pm_insert" ON project_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pm_delete" ON project_members FOR DELETE USING (auth.uid() = user_id);

-- projects 정책 초기화
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'projects'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON projects', r.policyname); END LOOP; END $$;

CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid())
);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (auth.uid() = user_id);

-- materials 정책 초기화
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'materials'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON materials', r.policyname); END LOOP; END $$;

CREATE POLICY "materials_all" ON materials FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p WHERE p.id = materials.project_id AND (
      p.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p WHERE p.id = materials.project_id AND (
      p.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
    )
  )
);
