import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useMaterials } from '../hooks/useMaterials'
import { MaterialRow } from '../components/MaterialRow'
import { AddMaterialModal } from '../components/AddMaterialModal'
import { ProgressBar } from '../components/ProgressBar'
import type { Project, Material } from '../types'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { query, addMaterial, updateCount, deleteMaterial } = useMaterials(id!)
  const materials = query.data ?? []

  const grouped = materials.reduce<Record<string, Material[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  const totalMaterials = materials.length
  const completedMaterials = materials.filter(
    m => m.current_count >= m.required_count && m.required_count > 0
  ).length
  const overallProgress = totalMaterials > 0 ? completedMaterials / totalMaterials : 0

  function handleDelete(materialId: string) {
    if (window.confirm('이 재료를 삭제할까요?')) {
      deleteMaterial.mutate(materialId)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-4 sticky top-0 bg-gray-950/95 backdrop-blur z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/projects')}
              className="text-gray-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{project?.name ?? '로딩 중…'}</h1>
              {project?.description && (
                <p className="text-gray-400 text-xs truncate">{project.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
          >
            <Plus size={15} />
            재료 추가
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 전체 진행도 */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300 font-medium">전체 진행도</span>
            <span className="text-gray-400">{completedMaterials} / {totalMaterials} 완료</span>
          </div>
          <ProgressBar value={overallProgress} />
          <p className="text-right text-xs text-gray-500 mt-1">{Math.round(overallProgress * 100)}%</p>
        </div>

        {/* 로딩 스켈레톤 */}
        {query.isLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* 카테고리별 재료 */}
        {!query.isLoading && Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {category}
            </h2>
            <div className="space-y-2">
              {items.map(m => (
                <MaterialRow
                  key={m.id}
                  material={m}
                  onUpdateCount={(matId, count) => updateCount.mutate({ id: matId, current_count: count })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        ))}

        {/* 빈 상태 */}
        {!query.isLoading && materials.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-400 text-lg font-medium">재료가 없습니다</p>
            <p className="text-gray-600 text-sm mt-1">재료 추가 버튼을 눌러 목록을 만들어 보세요.</p>
          </div>
        )}
      </main>

      {showModal && id && (
        <AddMaterialModal
          projectId={id}
          onClose={() => setShowModal(false)}
          onSubmit={data => addMaterial.mutateAsync(data)}
        />
      )}
    </div>
  )
}
