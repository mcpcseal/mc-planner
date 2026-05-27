-- 프로젝트 멤버 목록 조회 (SECURITY DEFINER으로 auth.users 접근)
CREATE OR REPLACE FUNCTION get_project_members(p_project_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN '[]'::json; END IF;

  -- 접근 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND (
      p.user_id = v_user_id OR
      EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = v_user_id)
    )
  ) THEN RETURN '[]'::json; END IF;

  RETURN (
    SELECT COALESCE(json_agg(t ORDER BY t.is_owner DESC, t.full_name), '[]'::json)
    FROM (
      SELECT p.user_id::text AS user_id,
             COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS full_name,
             u.raw_user_meta_data->>'avatar_url' AS avatar_url,
             true AS is_owner
      FROM public.projects p
      JOIN auth.users u ON u.id = p.user_id
      WHERE p.id = p_project_id
      UNION ALL
      SELECT pm.user_id::text AS user_id,
             COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS full_name,
             u.raw_user_meta_data->>'avatar_url' AS avatar_url,
             false AS is_owner
      FROM public.project_members pm
      JOIN auth.users u ON u.id = pm.user_id
      WHERE pm.project_id = p_project_id
    ) t
  );
END;
$$;

-- 소유자가 멤버를 내보낼 수 있는 RLS 정책
DROP POLICY IF EXISTS "pm_owner_delete" ON project_members;
CREATE POLICY "pm_owner_delete" ON project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND user_id = auth.uid()
  )
);
