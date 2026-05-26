import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Sun, Moon, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
import { MaterialRow } from '../components/MaterialRow'
import { AddMaterialModal } from '../components/AddMaterialModal'
import { EditProjectModal } from '../components/EditProjectModal'
import { EditMaterialModal } from '../components/EditMaterialModal'
import { ProgressBar } from '../components/ProgressBar'
import type { Project, Material } from '../types'

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

  const queryClient = useQueryClient()
  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
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
    mutationFn: async (data: { name: string; description: string | null }) => {
      const { error } = await supabase.from('projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-materials'] })
    },
  })

  const { isDark, toggle } = useTheme()
  const { query, addMaterial, updateCount, updateMaterial, deleteMaterial, reorderMaterials } = useMaterials(id!)
  const materials = query.data ?? []

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))


  const displayMaterials = sortMode === 'none' ? materials : [...materials].sort((a, b) => {
    if (sortMode === 'rem_asc' || sortMode === 'rem_desc') {
      const remA = a.required_count - a.current_count
      const remB = b.required_count - b.current_count
      return sortMode === 'rem_asc' ? remA - remB : remB - remA
    }
    const progA = a.required_count > 0 ? a.current_count / a.required_count : 0
    const progB = b.required_count > 0 ? b.current_count / b.required_count : 0
    return sortMode === 'prog_asc' ? progA - progB : progB - progA
  })

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
              재료 추가
            </button>
          </div>
        </div>
      </header>

      <main id="project-detail-main" className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div id="overall-progress-section" className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">전체 진행도</span>
            <span id="overall-progress-count" className="text-gray-500 dark:text-gray-400">{completedMaterials} / {totalMaterials} 완료</span>
          </div>
          <ProgressBar value={overallProgress} />
          <p id="overall-progress-percent" className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">{Math.floor(overallProgress * 100)}%</p>
        </div>

        <div className="flex justify-end gap-2">
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={sortMode === 'none' ? handleDragEnd(materials) : () => { }}>
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
