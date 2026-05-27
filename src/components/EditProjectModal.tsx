import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../types'

interface Props {
  project: Project
  onClose: () => void
  onSubmit: (data: { name: string; description: string | null; join_password?: string | null }) => Promise<void>
}

export function EditProjectModal({ project, onClose, onSubmit }: Props) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [willRemove, setWillRemove] = useState(false)
  const [loading, setLoading] = useState(false)

  const hasPassword = !!project.join_password

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const data: { name: string; description: string | null; join_password?: string | null } = {
        name: name.trim(),
        description: description.trim() || null,
      }
      if (willRemove) {
        data.join_password = null
      } else if (newPassword.trim()) {
        data.join_password = newPassword.trim()
      }
      await onSubmit(data)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">프로젝트 편집</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">프로젝트 이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">설명 (선택)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors resize-none"
            />
          </div>

          <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">참여 비밀번호</label>
              <span className={`text-xs px-2 py-0.5 rounded-full ${hasPassword ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                {hasPassword ? '설정됨' : '없음'}
              </span>
            </div>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setWillRemove(false) }}
              disabled={willRemove}
              placeholder={willRemove ? '비밀번호가 제거됩니다' : hasPassword ? '새 비밀번호 (변경 시 입력)' : '비밀번호 설정 (선택)'}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {hasPassword && (
              <button
                type="button"
                onClick={() => { setWillRemove(v => !v); setNewPassword('') }}
                className={`mt-2 text-xs px-3 py-1.5 rounded-lg transition-colors ${willRemove ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'}`}
              >
                {willRemove ? '제거 취소' : '비밀번호 제거'}
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!name.trim() || loading}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors">
              {loading ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
