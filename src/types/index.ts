export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  join_password?: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  project_id: string
  name: string
  category: string
  required_count: number
  current_count: number
  image_url: string | null
  position: number
  created_at: string
  updated_at: string
}

export type ProjectInsert = Pick<Project, 'name' | 'description'> & {
  join_password?: string | null
}
export type MaterialInsert = Pick<Material, 'project_id' | 'name' | 'required_count'> & {
  image_url?: string | null
  position?: number
  category?: string
}

export type ProjectJoin = { project_id: string; password?: string | null }
