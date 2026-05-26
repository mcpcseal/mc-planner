import { useState } from 'react'
import { Trash2, Check } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import type { Material } from '../types'

interface Props {
  material: Material
  onUpdateCount: (id: string, count: number) => void
  onDelete: (id: string) => void
}

export function MaterialRow({ material, onUpdateCount, onDelete }: Props) {
  const { id, name, required_count, current_count } = material
  const [inputValue, setInputValue] = useState(String(current_count))
  const progress = required_count > 0 ? current_count / required_count : 0
  const isDone = current_count >= required_count && required_count > 0

  function applyCount(raw: string) {
    const n = Math.max(0, parseInt(raw, 10) || 0)
    setInputValue(String(n))
    if (n !== current_count) onUpdateCount(id, n)
  }

  function step(delta: number) {
    const next = Math.max(0, current_count + delta)
    setInputValue(String(next))
    onUpdateCount(id, next)
  }

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${isDone ? 'border-green-600/40 bg-green-950/20' : 'border-gray-800 bg-gray-900/50'}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className={`font-medium text-sm truncate block ${isDone ? 'text-green-300' : 'text-white'}`}>
            {isDone && <Check size={13} className="inline mr-1 mb-0.5 text-green-400" />}
            {name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => step(-1)}
            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors flex items-center justify-center"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={e => applyCount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyCount(inputValue)}
            className="w-16 text-center px-1 py-1 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 focus:border-green-500 outline-none"
          />
          <button
            onClick={() => step(1)}
            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors flex items-center justify-center"
          >
            +
          </button>
          <span className="text-gray-500 text-sm w-16 text-right">/ {required_count.toLocaleString()}</span>
          <button
            onClick={() => onDelete(id)}
            className="ml-1 p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ProgressBar value={progress} className="flex-1" />
        <span className={`text-xs w-10 text-right shrink-0 ${isDone ? 'text-green-400' : 'text-gray-500'}`}>
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  )
}
