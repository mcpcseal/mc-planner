import { useState } from 'react'
import { X, TriangleAlert } from 'lucide-react'

interface Props {
  projectName: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteProjectModal({ projectName, onClose, onConfirm }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const matches = input === projectName

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!matches) return
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
            <TriangleAlert size={18} />
            <h2 className="text-lg font-semibold">프로젝트 삭제</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
          <span className="font-semibold text-gray-900 dark:text-white">"{projectName}"</span> 프로젝트와 재료 목록이 영구 삭제됩니다.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          계속하려면 프로젝트 이름을 정확히 입력하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={projectName}
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-red-500 outline-none transition-colors"
          />

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!matches || loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors">
              {loading ? '삭제 중…' : '삭제'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
