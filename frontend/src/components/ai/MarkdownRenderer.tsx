import { Download } from 'lucide-react'

function Table({ headers, rows, alignments }: { headers: string[]; rows: string[][]; alignments: string[] }) {
  const downloadCSV = () => {
    const escape = (cell: string) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) return `"${cell.replace(/"/g, '""')}"`
      return cell
    }
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tabel-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="my-2">
      <div className="flex justify-end mb-1">
        <button onClick={downloadCSV} className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors">
          <Download className="h-3 w-3" />
          Download CSV
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {headers.map((h, i) => (
                <th key={i} className={`px-2.5 py-2 font-semibold text-gray-700 text-left ${i > 0 ? 'text-center' : ''} border-b border-gray-200`}>
                  {h.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                {row.map((cell, ci) => {
                  const align = alignments[ci] || 'left'
                  const isFirst = ci === 0
                  return (
                    <td key={ci} className={`px-2.5 py-2 ${isFirst ? 'font-medium text-gray-800' : 'text-center text-gray-600'} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}>
                      {cell.replace(/\*\*/g, '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function parseMarkdownTable(text: string) {
  const lines = text.split('\n')
  let tables: { headers: string[]; rows: string[][]; alignments: string[] }[] = []
  let currentTable: { headers: string[]; rows: string[][]; alignments: string[] } | null = null
  let inTable = false
  let otherParts: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith('|') && line.trim().endsWith('|') && line.includes('---')) {
      // Alignment row: | :--- | :---: | ---: |
      const parts = line.split('|').filter(p => p.trim())
      const alignments = parts.map(p => {
        const trimmed = p.trim()
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
        if (trimmed.endsWith(':')) return 'right'
        return 'left'
      })
      if (currentTable) {
        currentTable.alignments = alignments
        inTable = true
      }
      continue
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').filter(p => p.trim()).map(c => c.trim())
      if (!inTable) {
        if (currentTable) tables.push(currentTable)
        currentTable = { headers: cells, rows: [], alignments: [] }
        inTable = false
      } else if (currentTable) {
        currentTable.rows.push(cells)
      }
      continue
    }

    if (inTable && currentTable) {
      tables.push(currentTable)
      currentTable = null
      inTable = false
    }

    if (line.trim()) {
      otherParts.push(line)
    } else {
      otherParts.push('')
    }
  }

  if (currentTable) tables.push(currentTable)

  return { tables, otherText: otherParts.join('\n') }
}

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function ListBlock({ items, ordered }: { items: string[]; ordered: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={`my-1.5 ${ordered ? 'list-decimal' : 'list-disc'} pl-4 text-xs space-y-0.5`}>
      {items.map((item, i) => (
        <li key={i} className="text-gray-700">
          <BoldText text={item.replace(/^[-*]\s+/, '')} />
        </li>
      ))}
    </Tag>
  )
}

function parseBlocks(text: string) {
  const lines = text.split('\n')
  const blocks: { type: 'text' | 'list' | 'table' | 'empty'; content: any }[] = []
  let listItems: string[] = []
  let inList = false

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', content: { items: [...listItems], ordered: false } })
      listItems = []
    }
    inList = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList()
      // Collect all table lines
      let tableLines = [line]
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim()
        if (next.startsWith('|') && next.endsWith('|')) {
          tableLines.push(lines[i + 1])
          i++
        } else {
          break
        }
      }
      const parsed = parseMarkdownTable(tableLines.join('\n'))
      for (const table of parsed.tables) {
        blocks.push({ type: 'table', content: table })
      }
      if (parsed.otherText.trim()) {
        blocks.push({ type: 'text', content: parsed.otherText })
      }
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true
      listItems.push(trimmed)
      continue
    }

    if (inList && trimmed === '') {
      flushList()
      continue
    }

    if (inList) {
      flushList()
    }

    if (trimmed === '') {
      blocks.push({ type: 'empty', content: '' })
    } else {
      flushList()
      blocks.push({ type: 'text', content: line })
    }
  }

  flushList()
  return blocks
}

export default function MarkdownRenderer({ text }: { text: string }) {
  const blocks = parseBlocks(text)

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'table':
            return <Table key={i} {...block.content} />
          case 'list':
            return <ListBlock key={i} {...block.content} />
          case 'empty':
            return <div key={i} className="h-2" />
          case 'text':
            return (
              <p key={i} className="text-xs leading-relaxed text-gray-800">
                <BoldText text={block.content} />
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
