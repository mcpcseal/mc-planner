import { config } from 'dotenv'
config({ path: '.env.local' })

import { parse } from 'node-html-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
)

async function fetchBlocks(url: string): Promise<Map<string, string>> {
  const res = await fetch(url, { headers: { 'User-Agent': 'mc-planner-scraper/1.0' } })
  const html = await res.text()
  const root = parse(html)

  const result = new Map<string, string>()

  for (const li of root.querySelectorAll('li')) {
    const anchors = li.querySelectorAll('a')
    if (anchors.length < 2) continue

    const fileHref = decodeURIComponent(anchors[0].getAttribute('href') ?? '')
    const colonIdx = fileHref.lastIndexOf(':')
    if (colonIdx === -1) continue

    const filename = fileHref.slice(colonIdx + 1)
    if (!filename.match(/\.(png|jpg|gif|webp)$/i)) continue

    const name = anchors[1].text.trim()
    if (!name) continue

    result.set(filename, name)
  }

  return result
}

async function main() {
  console.log('영어 위키 스크래핑 중...')
  const enBlocks = await fetchBlocks('https://minecraft.wiki/w/Block')
  console.log(`영어 블록 ${enBlocks.size}개 수집`)

  console.log('한국어 위키 스크래핑 중...')
  const koBlocks = await fetchBlocks('https://ko.minecraft.wiki/w/%EB%B8%94%EB%A1%9D')
  console.log(`한국어 블록 ${koBlocks.size}개 수집`)

  const rows: { name: string; name_ko: string | null; image_url: string }[] = []

  for (const [filename, enName] of enBlocks) {
    rows.push({
      name: enName,
      name_ko: koBlocks.get(filename) ?? null,
      image_url: `https://minecraft.wiki/images/${filename}`,
    })
  }

  // 같은 name이 중복될 수 있으므로 첫 번째 것만 유지
  const seen = new Set<string>()
  const uniqueRows = rows.filter(r => {
    if (seen.has(r.name)) return false
    seen.add(r.name)
    return true
  })

  const withKo = uniqueRows.filter(r => r.name_ko).length
  console.log(`총 ${uniqueRows.length}개 (한국어 이름 있음: ${withKo}개, 중복 제거: ${rows.length - uniqueRows.length}개)`)

  const batchSize = 100
  for (let i = 0; i < uniqueRows.length; i += batchSize) {
    const batch = uniqueRows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('block_images')
      .upsert(batch, { onConflict: 'name', ignoreDuplicates: true })
    if (error) {
      console.error(`배치 ${Math.floor(i / batchSize) + 1} 오류:`, error.message)
    } else {
      console.log(`배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueRows.length / batchSize)} 완료`)
    }
  }

  console.log('완료!')
}

main().catch(console.error)
