import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Material } from '../types'

interface BlockImage {
  name: string
  name_ko: string | null
  image_url: string
}

interface Props {
  material: Material
  onClose: () => void
  onSubmit: (data: { name: string; required_count: number; image_url: string | null }) => Promise<void>
}

export function EditMaterialModal({ material, onClose, onSubmit }: Props) {
  const [name, setName] = useState(material.name)
  const [required, setRequired] = useState(String(material.required_count))
  const [imageUrl, setImageUrl] = useState(material.image_url ?? '')
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BlockImage[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) { setSearchResults([]); setShowDropdown(false); return }
    const timer = setTimeout(async () => {
      const [exact, prefix, contains] = await Promise.all([
        supabase.from('block_images').select('name, name_ko, image_url')
          .or(`name.ilike.${q},name_ko.ilike.${q}`).limit(8),
        supabase.from('block_images').select('name, name_ko, image_url')
          .or(`name.ilike.${q}%,name_ko.ilike.${q}%`).order('name').limit(8),
        supabase.from('block_images').select('name, name_ko, image_url')
          .or(`name.ilike.%${q}%,name_ko.ilike.%${q}%`).order('name').limit(12),
      ])
      const seen = new Set<string>()
      const merged: BlockImage[] = []
      for (const item of [...(exact.data ?? []), ...(prefix.data ?? []), ...(contains.data ?? [])]) {
        if (!seen.has(item.name) && merged.length < 8) { seen.add(item.name); merged.push(item) }
      }
      setSearchResults(merged)
      setShowDropdown(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectBlock(block: BlockImage) {
    setName(block.name_ko ?? block.name)
    setImageUrl(block.image_url)
    setSearchQuery('')
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const count = parseInt(required, 10)
    if (!name.trim() || isNaN(count) || count <= 0) return
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), required_count: count, image_url: imageUrl.trim() || null })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">재료 편집</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Block search */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              블록 검색
              <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">(이름·이미지 변경)</span>
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onCompositionStart={() => { composingRef.current = true }}
                onCompositionEnd={() => { composingRef.current = false }}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) e.preventDefault() }}
                onKeyUp={e => { if (e.key === 'Enter' && !composingRef.current && searchResults.length > 0) selectBlock(searchResults[0]) }}
                placeholder="참나무 판자, Oak Planks…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                {searchResults.map(block => (
                  <button key={block.name} type="button" onClick={() => selectBlock(block)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <img src={block.image_url} alt={block.name} className="w-8 h-8 object-contain shrink-0"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{block.name_ko ?? block.name}</p>
                      {block.name_ko && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{block.name}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">재료 이름 *</label>
            <div className="flex items-center gap-2">
              {imageUrl && (
                <img src={imageUrl} alt="" className="w-8 h-8 object-contain shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              )}
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Required count */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">필요 수량 *</label>
            <input
              type="number"
              min={1}
              value={required}
              onChange={e => setRequired(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              이미지 URL <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">(선택)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://minecraft.wiki/images/…"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!name.trim() || !required || loading}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors">
              {loading ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
