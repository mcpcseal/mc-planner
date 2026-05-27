import { useState } from 'react'
import { X, TriangleAlert } from 'lucide-react'

interface Props {
  projectName: string
  isOwner: boolean
  onClose: () => void
  onRemoveFromList: () => Promise<void>
  onDeleteAll: () => Promise<void>
}

export function DeleteProjectModal({ projectName, isOwner, onClose, onRemoveFromList, onDeleteAll }: Props) {
  const [mode, setMode] = useState<'remove' | 'delete'>(isOwner ? 'delete' : 'remove')
  const [nameInput, setNameInput] = useState('')
  const [loading, setLoading] = useState(false)

  const nameMatches = nameInput === projectName

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'delete' && !nameMatches) return
    setLoading(true)
    try {
      if (mode === 'remove') await onRemoveFromList()
      else await onDeleteAll()
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
            <h2 className="text-lg font-semibold">프로젝트 제거</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-5">
          {/* 내 목록에서만 제거 */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${isOwner ? 'opacity-40 cursor-not-allowed' : `cursor-pointer ${mode === 'remove' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}`}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'remove'}
              onChange={() => setMode('remove')}
              disabled={isOwner}
              className="mt-0.5 accent-green-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">내 목록에서만 제거</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isOwner ? '소유자는 목록에서만 제거할 수 없습니다.' : '프로젝트는 유지되고 내 목록에서만 사라집니다.'}
              </p>
            </div>
          </label>

          {/* 전체 삭제 */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${!isOwner ? 'opacity-40 cursor-not-allowed' : `cursor-pointer ${mode === 'delete' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}`}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'delete'}
              onChange={() => setMode('delete')}
              disabled={!isOwner}
              className="mt-0.5 accent-red-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">전체 삭제</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isOwner ? '모든 재료와 함께 영구 삭제됩니다.' : '소유자만 전체 삭제할 수 있습니다.'}
              </p>
            </div>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'delete' && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                계속하려면 <span className="font-semibold text-gray-900 dark:text-white">"{projectName}"</span>을 입력하세요.
              </p>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={projectName}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-red-500 outline-none transition-colors"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button
              type="submit"
              disabled={(mode === 'delete' && !nameMatches) || loading}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors text-white disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 ${mode === 'delete' ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {loading ? '처리 중…' : mode === 'remove' ? '목록에서 제거' : '전체 삭제'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
