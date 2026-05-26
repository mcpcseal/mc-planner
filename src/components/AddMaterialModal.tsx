import { useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import type { MaterialInsert } from '../types'

const CATEGORIES = ['건축 블록', '장식', '레드스톤', '조합 재료', '기타']

interface Props {
  projectId: string
  onClose: () => void
  onSubmit: (data: MaterialInsert) => Promise<void>
}

export function AddMaterialModal({ projectId, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [required, setRequired] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const count = parseInt(required, 10)
    if (!name.trim() || isNaN(count) || count <= 0) return
    setLoading(true)
    try {
      await onSubmit({
        project_id: projectId,
        name: name.trim(),
        category,
        required_count: count,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">재료 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">재료 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 오크 나무 판자"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">카테고리</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-green-500 outline-none transition-colors"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">필요 수량 *</label>
            <input
              type="number"
              min={1}
              value={required}
              onChange={e => setRequired(e.target.value)}
              placeholder="64"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !required || loading}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold transition-colors"
            >
              {loading ? '추가 중…' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
