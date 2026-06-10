import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Sun, Moon, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Search, X, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useMaterials } from '../hooks/useMaterials'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../hooks/useAuth'
import { MaterialRow } from '../components/MaterialRow'
import { AddMaterialModal } from '../components/AddMaterialModal'
import { EditProjectModal } from '../components/EditProjectModal'
import { EditMaterialModal } from '../components/EditMaterialModal'
import { ProgressBar } from '../components/ProgressBar'
import type { Project, Material } from '../types'

interface ProjectMember {
  user_id: string
  full_name: string
  avatar_url: string | null
  is_owner: boolean
}

function SortableMaterialRow({
  material,
  onUpdateCount,
  onDelete,
  onEdit,
}: {
  material: Material
  onUpdateCount: (id: string, count: number) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: material.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <MaterialRow
        material={material}
        onUpdateCount={onUpdateCount}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [sortMode, setSortMode] = useState<'none' | 'rem_asc' | 'rem_desc' | 'prog_asc' | 'prog_desc'>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMembers, setShowMembers] = useState(false)

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: project, isError: projectError, isLoading: projectLoading, refetch: refetchProject } = useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      // 접근 거부(no rows) 에러면 즉시 중단, 그 외 일시적 오류는 1회 재시도
      if ((error as { code?: string })?.code === 'PGRST116') return false
      return failureCount < 1
    },
    retryDelay: 800,
  })

  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`project-detail-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
        (payload) => {
          queryClient.setQueryData(['project', id], payload.new as Project)
          queryClient.invalidateQueries({ queryKey: ['projects-with-materials'] })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, queryClient])

  const updateProject = useMutation({
    mutationFn: async (data: { name: string; description: string | null; join_password?: string | null }) => {
      const { join_password, ...rest } = data
      const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }
      if (join_password !== undefined) updateData.join_password = join_password
      const { error } = await supabase.from('projects').update(updateData).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-materials'] })
    },
  })

  const membersQuery = useQuery({
    queryKey: ['project-members', id],
    queryFn: async (): Promise<ProjectMember[]> => {
      const { data, error } = await supabase.rpc('get_project_members', { p_project_id: id! })
      if (error) throw error
      return (data as ProjectMember[]) ?? []
    },
    enabled: !!id && !!project,
  })

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', id!)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-members', id] }),
  })

  const [joinPassword, setJoinPassword] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setJoinLoading(true)
    setJoinError(null)
    try {
      const { data, error } = await supabase.rpc('try_join_project', {
        p_project_id: id!,
        p_password: joinPassword.trim() || null,
      })
      if (error) { setJoinError('오류가 발생했습니다.'); return }
      const result = data as { error?: string; success?: boolean }
      if (result.error) {
        if (result.error === 'not_found') setJoinError('프로젝트를 찾을 수 없습니다.')
        else if (result.error === 'wrong_password') setJoinError('비밀번호가 올바르지 않습니다.')
        else if (result.error === 'own_project') await refetchProject()
        else setJoinError('오류가 발생했습니다.')
        return
      }
      await refetchProject()
      queryClient.invalidateQueries({ queryKey: ['materials', id] })
    } finally {
      setJoinLoading(false)
    }
  }

  const { isDark, toggle } = useTheme()
  const { query, addMaterial, updateCount, updateMaterial, deleteMaterial, reorderMaterials } = useMaterials(id!)
  const materials = query.data ?? []

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))


  const sortedMaterials = sortMode === 'none' ? materials : [...materials].sort((a, b) => {
    if (sortMode === 'rem_asc' || sortMode === 'rem_desc') {
      const remA = a.required_count - a.current_count
      const remB = b.required_count - b.current_count
      return sortMode === 'rem_asc' ? remA - remB : remB - remA
    }
    const progA = a.required_count > 0 ? a.current_count / a.required_count : 0
    const progB = b.required_count > 0 ? b.current_count / b.required_count : 0
    return sortMode === 'prog_asc' ? progA - progB : progB - progA
  })

  const q = searchQuery.trim().toLowerCase()
  const displayMaterials = q ? sortedMaterials.filter(m => m.name.toLowerCase().includes(q)) : sortedMaterials

  const totalMaterials = materials.length
  const completedMaterials = materials.filter(
    m => m.current_count >= m.required_count && m.required_count > 0
  ).length
  const overallProgress = totalMaterials > 0 ? completedMaterials / totalMaterials : 0

  function handleDelete(materialId: string) {
    const material = materials.find(m => m.id === materialId)
    if (window.confirm(`"${material?.name}" 재료를 삭제할까요?`)) {
      deleteMaterial.mutate(materialId)
    }
  }

  function handleDragEnd(items: Material[]) {
    return (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex(m => m.id === active.id)
      const newIndex = items.findIndex(m => m.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)
      reorderMaterials.mutate(reordered.map((m, i) => ({ id: m.id, position: i })))
    }
  }

  return (
    <div id="project-detail-page" className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <header id="project-detail-header" className="border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="back-to-projects-button"
              onClick={() => navigate('/projects')}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex items-center gap-2">
              <div className="min-w-0">
                <h1 id="project-detail-name" className="font-bold text-lg truncate">{project?.name ?? '로딩 중…'}</h1>
                {project?.description && (
                  <p id="project-detail-description" className="text-gray-500 dark:text-gray-400 text-xs truncate">{project.description}</p>
                )}
              </div>
              {project && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1.5 shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="프로젝트 편집"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="theme-toggle-button"
              onClick={toggle}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="테마 전환"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              id="add-material-button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </header>

      {!projectLoading && projectError && (
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)] px-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <Lock size={20} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">프로젝트 참여</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">이 프로젝트에 참여해야 접근할 수 있습니다.</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">비밀번호 (설정된 경우)</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={joinPassword}
                  onChange={e => { setJoinPassword(e.target.value); setJoinError(null) }}
                  placeholder="비밀번호가 없으면 비워두세요"
                  autoFocus
                  className={`w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border outline-none transition-colors ${joinError ? 'border-red-500 focus:border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-green-500'}`}
                />
                {joinError && <p className="text-red-400 text-sm mt-1.5">{joinError}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => navigate('/projects')}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
                  돌아가기
                </button>
                <button type="submit" disabled={joinLoading}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors text-sm">
                  {joinLoading ? '참여 중…' : '참여하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main id="project-detail-main" className={`max-w-2xl mx-auto px-4 py-6 space-y-6 ${projectError ? 'hidden' : ''}`}>
        <div id="overall-progress-section" className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">전체 진행도</span>
            <span id="overall-progress-count" className="text-gray-500 dark:text-gray-400">{completedMaterials} / {totalMaterials} 완료</span>
          </div>
          <ProgressBar value={overallProgress} />
          <p id="overall-progress-percent" className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">{Math.floor(overallProgress * 100)}%</p>
        </div>

        {membersQuery.data && membersQuery.data.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button
              onClick={() => setShowMembers(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {membersQuery.data.slice(0, 4).map(m => (
                    <div key={m.user_id} className="w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-gray-900 shrink-0">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">{(m.full_name ?? '?')[0].toUpperCase()}</div>
                      }
                    </div>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  참여자 {membersQuery.data.length}명
                </span>
              </div>
              {showMembers ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
            </button>

            {showMembers && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 space-y-2.5">
                {membersQuery.data.map(member => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                      {member.avatar_url
                        ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">{(member.full_name ?? '?')[0].toUpperCase()}</div>
                      }
                    </div>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                      {member.full_name}
                      {member.user_id === user?.id && (
                        <span className="text-gray-400 dark:text-gray-500 ml-1.5 text-xs">나</span>
                      )}
                    </span>
                    {member.is_owner && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shrink-0">소유자</span>
                    )}
                    {project?.user_id === user?.id && !member.is_owner && (
                      <button
                        onClick={() => removeMember.mutate(member.user_id)}
                        disabled={removeMember.isPending}
                        className="text-xs text-gray-400 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors px-2 py-0.5 rounded-lg shrink-0"
                      >
                        내보내기
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="재료 검색…"
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-xs border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortMode(m => m === 'rem_desc' ? 'rem_asc' : m === 'rem_asc' ? 'none' : 'rem_desc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${sortMode === 'rem_asc' || sortMode === 'rem_desc' ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            aria-label="남은 수량 정렬"
          >
            {sortMode === 'rem_asc' ? <ArrowUp size={13} /> : sortMode === 'rem_desc' ? <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
            남은 수량
          </button>
          <button
            onClick={() => setSortMode(m => m === 'prog_desc' ? 'prog_asc' : m === 'prog_asc' ? 'none' : 'prog_desc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${sortMode === 'prog_asc' || sortMode === 'prog_desc' ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            aria-label="완료율 정렬"
          >
            {sortMode === 'prog_asc' ? <ArrowUp size={13} /> : sortMode === 'prog_desc' ? <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
            완료율
          </button>
        </div>

        {query.isLoading && (
          <div id="materials-loading" className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {!query.isLoading && displayMaterials.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={sortMode === 'none' && !q ? handleDragEnd(materials) : () => { }}>
            <SortableContext items={displayMaterials.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div id="materials-list" className="space-y-2">
                {displayMaterials.map(m => (
                  <SortableMaterialRow
                    key={m.id}
                    material={m}
                    onUpdateCount={(matId, count) => updateCount.mutate({ id: matId, current_count: count })}
                    onDelete={handleDelete}
                    onEdit={(matId) => setEditingMaterial(materials.find(mat => mat.id === matId) ?? null)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!query.isLoading && materials.length === 0 && (
          <div id="materials-empty" className="text-center py-24">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">재료가 없습니다</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">재료 추가 버튼을 눌러 목록을 만들어 보세요.</p>
          </div>
        )}

        {!query.isLoading && materials.length > 0 && displayMaterials.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
            "{searchQuery}"와 일치하는 재료가 없습니다.
          </div>
        )}
      </main>

      {editingMaterial && (
        <EditMaterialModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSubmit={async data => { await updateMaterial.mutateAsync({ id: editingMaterial.id, ...data }) }}
        />
      )}

      {showEditModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSubmit={async data => { await updateProject.mutateAsync(data) }}
        />
      )}

      {showModal && id && (
        <AddMaterialModal
          projectId={id}
          onClose={() => setShowModal(false)}
          onSubmit={async data => { await addMaterial.mutateAsync(data) }}
        />
      )}
    </div>
  )
}
