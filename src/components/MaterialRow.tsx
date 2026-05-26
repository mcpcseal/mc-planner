import { useState } from 'react'
import { Trash2, Check, GripVertical, Pencil } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import type { Material } from '../types'

interface Props {
  material: Material
  onUpdateCount: (id: string, count: number) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

function toSets(count: number): string {
  const sets = Math.floor(count / 64)
  const remainder = count % 64
  if (sets === 0) return `${remainder}개`
  if (remainder === 0) return `${sets}세트`
  return `${sets}세트 + ${remainder}개`
}

export function MaterialRow({ material, onUpdateCount, onDelete, onEdit, dragHandleProps }: Props) {
  const { id, name, required_count, current_count, image_url } = material
  const [inputValue, setInputValue] = useState(String(current_count))
  const progress = required_count > 0 ? Math.min(1, current_count / required_count) : 0
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
    <div id={`material-row-${id}`} className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${isDone ? 'border-green-400 dark:border-green-600/40 bg-green-50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50'}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {image_url && (
            <img
              src={image_url}
              alt={name}
              className="w-8 h-8 rounded object-contain shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className={`font-medium text-sm truncate ${isDone ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
            {isDone && <Check size={13} className="inline mr-1 mb-0.5 text-green-500 dark:text-green-400" />}
            {name}
          </span>
          <button
            id={`material-edit-${id}`}
            onClick={() => onEdit(id)}
            className="shrink-0 p-1 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-400/10"
          >
            <Pencil size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            {...dragHandleProps}
            className="p-1 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 touch-none"
            aria-label="순서 변경"
          >
            <GripVertical size={15} />
          </button>
          <button
            id={`material-decrement-set-${id}`}
            onClick={() => step(-64)}
            className="h-7 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs font-bold transition-colors flex items-center justify-center"
          >
            -64
          </button>
          <button
            id={`material-decrement-${id}`}
            onClick={() => step(-1)}
            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-bold transition-colors flex items-center justify-center"
          >
            −
          </button>
          <input
            id={`material-count-input-${id}`}
            type="number"
            min={0}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={e => applyCount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyCount(inputValue)}
            className="w-16 text-center px-1 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none"
          />
          <button
            id={`material-increment-${id}`}
            onClick={() => step(1)}
            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-bold transition-colors flex items-center justify-center"
          >
            +
          </button>
          <button
            id={`material-increment-set-${id}`}
            onClick={() => step(64)}
            className="h-7 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs font-bold transition-colors flex items-center justify-center"
          >
            +64
          </button>
          <button
            id={`material-delete-${id}`}
            onClick={() => onDelete(id)}
            className="p-1.5 text-gray-400 dark:text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs px-0.5">
        <span className={isDone ? 'text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-gray-500'}>
          보유 {current_count.toLocaleString()}개 ({toSets(current_count)})
        </span>
        <span className="text-gray-400 dark:text-gray-600">
          필요 {required_count.toLocaleString()}개 ({toSets(required_count)})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ProgressBar value={progress} className="flex-1" />
        <span className={`text-xs w-10 text-right shrink-0 ${isDone ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {Math.floor(progress * 100)}%
        </span>
      </div>
    </div>
  )
}
