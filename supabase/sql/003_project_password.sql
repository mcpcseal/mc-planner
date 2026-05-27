-- projects 테이블에 참여 비밀번호 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS join_password text;

-- 비밀번호 검증 후 참여하는 함수 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION try_join_project(p_project_id text, p_password text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  IF v_project.user_id = v_user_id THEN
    RETURN json_build_object('error', 'own_project');
  END IF;

  -- 비밀번호 검증 (설정된 경우에만)
  IF v_project.join_password IS NOT NULL AND v_project.join_password != '' THEN
    IF p_password IS NULL OR p_password = '' OR p_password != v_project.join_password THEN
      RETURN json_build_object('error', 'wrong_password');
    END IF;
  END IF;

  INSERT INTO public.project_members (project_id, user_id)
  VALUES (p_project_id, v_user_id)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'name', v_project.name);
END;
$$;
