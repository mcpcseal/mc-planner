export interface Project {
  id: string
  name: string
  description: string | null
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
  created_at: string
  updated_at: string
}

export type ProjectInsert = Pick<Project, 'name' | 'description'>
export type MaterialInsert = Pick<Material, 'project_id' | 'name' | 'category' | 'required_count'>
