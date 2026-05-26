import { useState } from 'react'
import { Plus, Pickaxe, Sun, Moon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProjects } from '../hooks/useProjects'
import { useTheme } from '../contexts/ThemeContext'
import { ProjectCard } from '../components/ProjectCard'
import { AddProjectModal } from '../components/AddProjectModal'
import { DeleteProjectModal } from '../components/DeleteProjectModal'
import type { Material } from '../types'

interface ProjectWithMaterials {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  materials: Pick<Material, 'id' | 'required_count' | 'current_count'>[]
}

function useProjectsWithMaterials() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['projects-with-materials'],
    queryFn: async (): Promise<ProjectWithMaterials[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, materials(id, required_count, current_count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ProjectWithMaterials[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('projects-page-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['projects-with-materials'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
        queryClient.invalidateQueries({ queryKey: ['projects-with-materials'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return query
}

export function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjectsWithMaterials()
  const { createProject, deleteProject } = useProjects()
  const { isDark, toggle } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string } | null>(null)

  function handleDelete(id: string) {
    const project = projects?.find(p => p.id === id)
    if (project) setDeletingProject({ id: project.id, name: project.name })
  }

  return (
    <div id="projects-page" className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <header id="projects-header" className="border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pickaxe size={20} className="text-green-500 dark:text-green-400" />
            <h1 className="text-lg font-bold">MC Planner</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="theme-toggle-button"
              onClick={toggle}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="테마 전환"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              id="add-project-button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={16} />
              새 프로젝트
            </button>
          </div>
        </div>
      </header>

      <main id="projects-main" className="max-w-4xl mx-auto px-4 py-6">
        {isLoading && (
          <div id="projects-loading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-900 rounded-2xl p-5 border border-gray-300 dark:border-gray-800 animate-pulse h-36" />
            ))}
          </div>
        )}

        {isError && (
          <div id="projects-error" className="text-center py-16 text-red-500 dark:text-red-400">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        )}

        {projects && projects.length === 0 && (
          <div id="projects-empty" className="text-center py-24">
            <p className="text-4xl mb-4">🏗️</p>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">프로젝트가 없습니다</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">새 프로젝트를 만들어 재료를 관리해 보세요.</p>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div id="projects-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const total = project.materials.length
              const completed = project.materials.filter(
                m => m.current_count >= m.required_count && m.required_count > 0
              ).length
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  totalMaterials={total}
                  completedMaterials={completed}
                  onDelete={handleDelete}
                />
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <AddProjectModal
          onClose={() => setShowModal(false)}
          onSubmit={data => createProject.mutateAsync(data)}
        />
      )}

      {deletingProject && (
        <DeleteProjectModal
          projectName={deletingProject.name}
          onClose={() => setDeletingProject(null)}
          onConfirm={() => deleteProject.mutateAsync(deletingProject.id)}
        />
      )}
    </div>
  )
}
