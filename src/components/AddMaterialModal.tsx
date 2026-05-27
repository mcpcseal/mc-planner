import { useState, useEffect, useRef, type FormEvent } from 'react'
import { X, Search, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { MaterialInsert } from '../types'

interface BlockImage {
  name: string
  name_ko: string | null
  image_url: string
}

interface BulkItem {
  rawName: string
  quantity: number
  matched: BlockImage | null
}

interface Props {
  projectId: string
  onClose: () => void
  onSubmit: (data: MaterialInsert) => Promise<void>
}

function getNameVariants(name: string): string[] {
  const words = name.trim().split(/\s+/)
  const last = words[words.length - 1]
  const rest = words.slice(0, -1)
  const variants: string[] = []
  const v = (stem: string) => [...rest, stem].join(' ')

  if (/(?:ch|sh|x|z)es$/i.test(last)) {
    variants.push(v(last.slice(0, -2)))       // Torches → Torch
  } else if (/ies$/i.test(last)) {
    variants.push(v(last.slice(0, -3) + 'y')) // Berries → Berry
  } else if (/ves$/i.test(last)) {
    variants.push(v(last.slice(0, -3) + 'f')) // Leaves → Leaf, Wolves → Wolf
  } else if (/[^aeiou]es$/i.test(last)) {
    variants.push(v(last.slice(0, -1)))        // Fences → Fence
  } else if (!/ss$/i.test(last) && /s$/i.test(last)) {
    variants.push(v(last.slice(0, -1)))        // Planks → Plank, Logs → Log
  }

  if (!/s$/i.test(last)) {
    if (/(?:ch|sh|x|z)$/i.test(last)) {
      variants.push(v(last + 'es'))            // Torch → Torches
    } else if (/[^f]f$/i.test(last)) {
      variants.push(v(last.slice(0, -1) + 'ves')) // Leaf → Leaves, Wolf → Wolves
    } else {
      variants.push(v(last + 's'))             // Plank → Planks
    }
  }

  return [...new Set(variants)].filter(v => v.toLowerCase() !== name.toLowerCase())
}

async function searchBestMatch(name: string): Promise<BlockImage | null> {
  const candidates = [name, ...getNameVariants(name)]

  const tiers: ((q: string) => string)[] = [
    q => `name.ilike.${q},name_ko.ilike.${q}`,
    q => `name.ilike.${q}%,name_ko.ilike.${q}%`,
    q => `name.ilike.%${q}%,name_ko.ilike.%${q}%`,
  ]

  for (const makeOr of tiers) {
    const results = await Promise.all(
      candidates.map(q =>
        supabase.from('block_images').select('name, name_ko, image_url').or(makeOr(q)).limit(1)
      )
    )
    for (const { data } of results) {
      if (data?.[0]) return data[0]
    }
  }
  return null
}

function parseBulkText(text: string): { name: string; quantity: number }[] {
  return text.split('\n')
    .map(l => l.trim()).filter(Boolean)
    .map(line => {
      const m = line.match(/^([\d,]+)\s+(.+)$/)
      if (m) return { quantity: parseInt(m[1].replace(/,/g, '')), name: m[2].trim() }
      return { quantity: 0, name: line }
    })
    .filter(item => item.name.length > 0)
}

export function AddMaterialModal({ projectId, onClose, onSubmit }: Props) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  // Single mode state
  const [name, setName] = useState('')
  const [required, setRequired] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BlockImage[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)

  // Bulk mode state
  const [bulkText, setBulkText] = useState('')
  const [bulkPreview, setBulkPreview] = useState<BulkItem[]>([])
  const [bulkSearching, setBulkSearching] = useState(false)

  // Single: block search autocomplete
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
          .or(`name.ilike.%${q}%,name_ko.ilike.%${q}%`).order('name').limit(20),
      ])
      const seen = new Set<string>()
      const merged: BlockImage[] = []
      for (const item of [...(exact.data ?? []), ...(prefix.data ?? []), ...(contains.data ?? [])]) {
        if (!seen.has(item.name) && merged.length < 12) { seen.add(item.name); merged.push(item) }
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

  async function handleSingleSubmit(e: FormEvent) {
    e.preventDefault()
    const count = parseInt(required, 10)
    if (!name.trim() || isNaN(count) || count <= 0) return
    setLoading(true)
    try {
      await onSubmit({ project_id: projectId, name: name.trim(), required_count: count, image_url: imageUrl.trim() || null })
      onClose()
    } finally { setLoading(false) }
  }

  // Bulk: auto-search when text changes
  useEffect(() => {
    if (mode !== 'bulk') return
    const items = parseBulkText(bulkText)
    if (items.length === 0) { setBulkPreview([]); return }
    setBulkSearching(true)
    const timer = setTimeout(async () => {
      const results = await Promise.all(
        items.map(async item => ({ rawName: item.name, quantity: item.quantity, matched: await searchBestMatch(item.name) }))
      )
      setBulkPreview(results)
      setBulkSearching(false)
    }, 400)
    return () => { clearTimeout(timer); setBulkSearching(false) }
  }, [bulkText, mode])

  async function handleBulkSubmit() {
    const valid = bulkPreview.filter(item => item.quantity > 0)
    if (valid.length === 0) return
    setLoading(true)
    try {
      for (const item of valid) {
        await onSubmit({
          project_id: projectId,
          name: item.matched?.name_ko ?? item.matched?.name ?? item.rawName,
          required_count: item.quantity,
          image_url: item.matched?.image_url ?? null,
        })
      }
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <div id="add-material-modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">재료 추가</h2>
          <button id="add-material-close-button" onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'single' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            단일 추가
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'bulk' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            일괄 추가
          </button>
        </div>

        {/* Single mode */}
        {mode === 'single' && (
          <form id="add-material-form" onSubmit={handleSingleSubmit} className="space-y-4 overflow-y-auto flex-1">
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                블록 검색
                <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">(한국어·영어 모두 가능)</span>
              </label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="block-search-input"
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
              {showDropdown && searchResults.length === 0 && searchQuery.trim() && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                  검색 결과 없음
                </div>
              )}
            </div>

            <div>
              <label htmlFor="material-name-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">재료 이름 *</label>
              <div className="flex items-center gap-2">
                {imageUrl && <img src={imageUrl} alt="" className="w-8 h-8 object-contain shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                <input id="material-name-input" type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="참나무 판자"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors" />
              </div>
            </div>

            <div>
              <label htmlFor="material-required-count-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">필요 수량 *</label>
              <input id="material-required-count-input" type="number" min={1} value={required} onChange={e => setRequired(e.target.value)}
                placeholder="64"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors" />
            </div>

            <div>
              <label htmlFor="material-image-url-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                이미지 URL <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">(선택)</span>
              </label>
              <input id="material-image-url-input" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                placeholder="https://minecraft.wiki/images/…"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors" />
            </div>

            <div className="flex gap-3 pt-1">
              <button id="add-material-cancel-button" type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button id="add-material-submit-button" type="submit" disabled={!name.trim() || !required || loading}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors">
                {loading ? '추가 중…' : '추가'}
              </button>
            </div>
          </form>
        )}

        {/* Bulk mode */}
        {mode === 'bulk' && (
          <div className="flex flex-col gap-4 overflow-hidden flex-1">
            <div className="shrink-0">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                재료 목록 붙여넣기
              </label>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={"4,276 Oak Planks\n3,814 Green Concrete\n2,953 White Concrete\n..."}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none transition-colors resize-none font-mono text-sm"
              />
            </div>

            {/* Preview */}
            {(bulkSearching || bulkPreview.length > 0) && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {bulkSearching ? '검색 중…' : `미리보기 (${bulkPreview.filter(i => i.quantity > 0).length}개)`}
                </p>
                <div className="space-y-1.5">
                  {bulkPreview.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      {item.matched ? (
                        <img src={item.matched.image_url} alt="" className="w-7 h-7 object-contain shrink-0"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
                      ) : (
                        <AlertCircle size={18} className="shrink-0 text-yellow-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          {item.matched?.name_ko ?? item.matched?.name ?? item.rawName}
                        </p>
                        {item.matched?.name_ko && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.matched.name}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                        {item.quantity.toLocaleString()}개
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 shrink-0">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkPreview.filter(i => i.quantity > 0).length === 0 || loading || bulkSearching}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors"
              >
                {loading ? '추가 중…' : `${bulkPreview.filter(i => i.quantity > 0).length}개 추가`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
