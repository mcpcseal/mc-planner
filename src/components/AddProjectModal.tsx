import { useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import type { ProjectInsert } from '../types'

interface Props {
  onClose: () => void
  onSubmit: (data: ProjectInsert) => Promise<void>
}

export function AddProjectModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || null })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="add-project-modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">새 프로젝트</h2>
          <button id="add-project-close-button" onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="add-project-form" onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex gap-3 pt-1">
            <button
              id="add-project-cancel-button"
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              id="add-project-submit-button"
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors"
            >
              {loading ? '생성 중…' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
