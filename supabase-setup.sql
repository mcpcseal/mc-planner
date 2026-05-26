-- MC Planner Supabase 설정 SQL
-- Supabase Dashboard > SQL Editor 에서 실행하세요

-- 건축 프로젝트 테이블
CREATE TABLE IF NOT EXISTS projects (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 재료 테이블
CREATE TABLE IF NOT EXISTS materials (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT '기타',
  required_count INTEGER NOT NULL DEFAULT 0,
  current_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 공개 접근 정책 (비밀번호는 앱 레벨에서 처리)
CREATE POLICY "public_access_projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_materials" ON materials FOR ALL USING (true) WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE materials;
