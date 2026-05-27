import { useState, useEffect, useRef } from 'react'
import { Plus, Pickaxe, Sun, Moon, LogOut } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProjects } from '../hooks/useProjects'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'
import { ProjectCard } from '../components/ProjectCard'
import { AddProjectModal } from '../components/AddProjectModal'
import { DeleteProjectModal } from '../components/DeleteProjectModal'
import type { Material } from '../types'

interface ProjectWithMaterials {
  id: string
  user_id: string
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
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string; isOwner: boolean } | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleDelete(id: string) {
    const project = projects?.find(p => p.id === id)
    if (project) setDeletingProject({ id: project.id, name: project.name, isOwner: project.user_id === user?.id })
  }

  async function handleRemoveFromList(projectId: string) {
    if (!user) return
    await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', user.id)
    queryClient.invalidateQueries({ queryKey: ['projects-with-materials'] })
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
              프로젝트 추가
            </button>
            <div ref={userMenuRef} className="relative">
              <button
                id="user-menu-button"
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-green-500 transition-colors"
                aria-label="사용자 메뉴"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                    {(user?.user_metadata?.full_name ?? user?.email ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.user_metadata?.full_name ?? '사용자'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); signOut() }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
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
          isOwner={deletingProject.isOwner}
          onClose={() => setDeletingProject(null)}
          onRemoveFromList={() => handleRemoveFromList(deletingProject.id)}
          onDeleteAll={() => deleteProject.mutateAsync(deletingProject.id)}
        />
      )}
    </div>
  )
}
