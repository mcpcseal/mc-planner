import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ProjectInsert } from '../types'

interface Props {
  onClose: () => void
  onSubmit: (data: ProjectInsert) => Promise<void>
}

function extractProjectId(input: string): string {
  const match = input.trim().match(/\/projects\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : input.trim()
}

export function AddProjectModal({ onClose, onSubmit }: Props) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'create' | 'join'>('create')

  // 새로 만들기
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createPassword, setCreatePassword] = useState('')

  // ID로 참여
  const [joinInput, setJoinInput] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || null, join_password: createPassword.trim() || null })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    const projectId = extractProjectId(joinInput)
    if (!projectId) return
    setLoading(true)
    setJoinError(null)
    setJoinSuccess(null)
    try {
      const { data, error } = await supabase.rpc('try_join_project', {
        p_project_id: projectId,
        p_password: joinPassword.trim() || null,
      })

      if (error) { setJoinError('오류가 발생했습니다.'); return }

      const result = data as { error?: string; success?: boolean; name?: string }
      if (result.error) {
        if (result.error === 'not_found') setJoinError('프로젝트를 찾을 수 없습니다.')
        else if (result.error === 'own_project') setJoinError('본인이 만든 프로젝트입니다.')
        else if (result.error === 'wrong_password') setJoinError('비밀번호가 올바르지 않습니다.')
        else if (result.error === 'not_authenticated') setJoinError('로그인이 필요합니다.')
        else setJoinError('오류가 발생했습니다.')
        return
      }

      setJoinSuccess(`"${result.name ?? projectId}" 프로젝트에 참여했습니다.`)
      await queryClient.refetchQueries({ queryKey: ['projects-with-materials'] })
      setTimeout(onClose, 1200)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="add-project-modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">프로젝트 추가</h2>
          <button id="add-project-close-button" onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'create' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            새로 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'join' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            ID로 참여
          </button>
        </div>

        {mode === 'create' && (
          <form id="add-project-form" onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="project-name-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">프로젝트 이름</label>
              <input
                id="project-name-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="중세 건축물"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="project-description-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">설명 (선택)</label>
              <textarea
                id="project-description-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="건축물에 대한 설명"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors resize-none"
              />
            </div>
            <div>
              <label htmlFor="project-password-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">참여 비밀번호 (선택)</label>
              <input
                id="project-password-input"
                type="password"
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                placeholder="설정하면 참여 시 비밀번호 필요"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button type="submit" disabled={!name.trim() || loading}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors">
                {loading ? '생성 중…' : '생성'}
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                프로젝트 ID 또는 URL
              </label>
              <input
                type="text"
                value={joinInput}
                onChange={e => { setJoinInput(e.target.value); setJoinError(null); setJoinSuccess(null) }}
                placeholder="https://…/projects/a1B2c3D4e5F 또는 프로젝트 ID"
                autoFocus
                className={`w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border outline-none transition-colors ${joinError ? 'border-red-500 focus:border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-green-500'}`}
              />
              {joinError && <p className="text-red-400 text-sm mt-1.5">{joinError}</p>}
              {joinSuccess && <p className="text-green-500 text-sm mt-1.5">{joinSuccess}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">비밀번호 (설정된 경우)</label>
              <input
                type="password"
                value={joinPassword}
                onChange={e => { setJoinPassword(e.target.value); setJoinError(null) }}
                placeholder="비밀번호가 없으면 비워두세요"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button type="submit" disabled={!joinInput.trim() || loading || !!joinSuccess}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors">
                {loading ? '참여 중…' : '참여'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
