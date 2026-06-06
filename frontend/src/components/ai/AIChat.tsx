import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, FileDown } from 'lucide-react'
import api from '@/services/api'
import MarkdownRenderer from './MarkdownRenderer'

interface Message {
  role: 'user' | 'ai'
  content: string
}

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Halo! Ada yang bisa saya bantu?\n\nTanyakan seputar pendaftaran, program, affiliate, atau fitur lainnya.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const { data } = await api.post('/ai/chat', { message: text })
      const reply = data?.data?.response || 'Maaf, tidak ada respons.'
      setMessages(prev => [...prev, { role: 'ai', content: reply }])
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Maaf, terjadi kesalahan. Silakan coba lagi.'
      setMessages(prev => [...prev, { role: 'ai', content: msg }])
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    const aiMessages = messages.filter(m => m.role === 'ai' && m.content !== messages[0]?.content)
    if (aiMessages.length === 0) return

    const renderMarkdownToHTML = (text: string) => {
      const lines = text.split('\n')
      const result: string[] = []
      let inTable = false
      let tableHeader = ''
      let tableRows: string[] = []

      const flushTable = () => {
        if (tableHeader) {
          result.push('<table><thead><tr>' + tableHeader + '</tr></thead><tbody>' + tableRows.join('') + '</tbody></table>')
          tableHeader = ''
          tableRows = []
        }
        inTable = false
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (trimmed.includes('---')) {
            // alignment row - skip
            inTable = true
            continue
          }
          const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.replace(/\*\*/g, ''))
          if (!inTable) {
            flushTable()
            tableHeader = cells.map(c => `<th style="padding:8px 10px;border:1px solid #d1d5db;background:#f3f4f6;font-weight:600;text-align:left;font-size:12px">${c}</th>`).join('')
            inTable = true
          } else {
            tableRows.push('<tr>' + cells.map(c => `<td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px">${c}</td>`).join('') + '</tr>')
          }
          continue
        }

        flushTable()
        if (trimmed === '') {
          result.push('<div style="height:8px"></div>')
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          result.push(`<div style="padding:2px 0;font-size:13px;color:#1f2937">• ${trimmed.slice(2)}</div>`)
        } else {
          result.push(`<div style="padding:2px 0;font-size:13px;line-height:1.6;color:#1f2937">${trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>`)
        }
      }
      flushTable()
      return result.join('')
    }

    const content = aiMessages.map(m => {
      const html = renderMarkdownToHTML(m.content)
      return `<div style="margin-bottom:12px;padding:12px;background:#f8f9fa;border-radius:6px;border:1px solid #e5e7eb">${html}</div>`
    }).join('')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan - Mendunia.id</title>
        <style>
          @page { margin: 15mm }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .sub { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
          th { background: #f3f4f6; padding: 8px 10px; border: 1px solid #d1d5db; text-align: left; font-weight: 600; }
          td { padding: 6px 10px; border: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .sep { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>Laporan Mendunia.id</h1>
        <div class="sub">Dihasilkan: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        ${content}
        <hr class="sep" />
        <p style="text-align:center;color:#9ca3af;font-size:10px;">Dibuat oleh AI Assistant — Mendunia.id</p>
        <script>window.print()<\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-[#009ce1] hover:bg-[#007bc4] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-90"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-10rem)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#009ce1] text-white">
            <Bot className="h-5 w-5" />
            <span className="font-semibold text-sm flex-1">AI Assistant</span>
            <button
              onClick={downloadPDF}
              title="Download PDF"
              className="h-7 w-7 rounded-md hover:bg-[#007bc4] flex items-center justify-center transition-colors"
            >
              <FileDown className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#009ce1] text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <MarkdownRenderer text={msg.content} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-500 rounded-lg rounded-bl-md px-3.5 py-2.5 text-sm shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mengetik...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan sesuatu..."
                disabled={loading}
                className="flex-1 h-9 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-[#009ce1] focus:ring-1 focus:ring-[#009ce1]/30 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-lg bg-[#009ce1] hover:bg-[#007bc4] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
