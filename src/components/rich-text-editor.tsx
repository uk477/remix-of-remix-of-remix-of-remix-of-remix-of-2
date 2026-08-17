'use client'

import {
  Bold,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Strikethrough,
  Table,
  Underline,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { RichText } from '@/lib/rich-text'

type Action =
  | { type: 'wrap'; before: string; after: string; sample: string }
  | { type: 'line'; prefix: string; sample: string }
  | { type: 'insert'; text: string }

type Tool = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  action: Action
}

type Group = { id: string; title: string; tools: Tool[] }

const GROUPS = (isRu: boolean): Group[] => [
  {
    id: 'text',
    title: isRu ? 'Текст' : 'Text',
    tools: [
      {
        id: 'b',
        icon: Bold,
        label: isRu ? 'Жирный' : 'Bold',
        action: { type: 'wrap', before: '**', after: '**', sample: isRu ? 'текст' : 'text' },
      },
      {
        id: 'i',
        icon: Italic,
        label: isRu ? 'Курсив' : 'Italic',
        action: { type: 'wrap', before: '*', after: '*', sample: isRu ? 'текст' : 'text' },
      },
      {
        id: 'u',
        icon: Underline,
        label: isRu ? 'Подчёркнутый' : 'Underline',
        action: { type: 'wrap', before: '__', after: '__', sample: isRu ? 'текст' : 'text' },
      },
      {
        id: 's',
        icon: Strikethrough,
        label: isRu ? 'Зачёркнутый' : 'Strikethrough',
        action: { type: 'wrap', before: '~~', after: '~~', sample: isRu ? 'текст' : 'text' },
      },
      {
        id: 'mark',
        icon: Highlighter,
        label: isRu ? 'Выделить' : 'Highlight',
        action: { type: 'wrap', before: '==', after: '==', sample: isRu ? 'важное' : 'important' },
      },
    ],
  },
  {
    id: 'blocks',
    title: isRu ? 'Блоки' : 'Blocks',
    tools: [
      {
        id: 'h1',
        icon: Heading1,
        label: isRu ? 'Заголовок' : 'Heading',
        action: { type: 'line', prefix: '# ', sample: isRu ? 'Заголовок' : 'Heading' },
      },
      {
        id: 'h2',
        icon: Heading2,
        label: isRu ? 'Подзаголовок' : 'Subheading',
        action: { type: 'line', prefix: '## ', sample: isRu ? 'Подзаголовок' : 'Subheading' },
      },
      {
        id: 'ul',
        icon: List,
        label: isRu ? 'Список' : 'Bullets',
        action: { type: 'line', prefix: '- ', sample: isRu ? 'пункт' : 'item' },
      },
      {
        id: 'ol',
        icon: ListOrdered,
        label: isRu ? 'Нумерация' : 'Numbers',
        action: { type: 'line', prefix: '1. ', sample: isRu ? 'пункт' : 'item' },
      },
      {
        id: 'q',
        icon: Quote,
        label: isRu ? 'Цитата' : 'Quote',
        action: { type: 'line', prefix: '> ', sample: isRu ? 'цитата' : 'quote' },
      },
    ],
  },
  {
    id: 'insert',
    title: isRu ? 'Вставка' : 'Insert',
    tools: [
      {
        id: 'code',
        icon: Code2,
        label: isRu ? 'Код' : 'Code',
        action: { type: 'wrap', before: '`', after: '`', sample: 'code' },
      },
      {
        id: 'link',
        icon: Link2,
        label: isRu ? 'Ссылка' : 'Link',
        action: {
          type: 'wrap',
          before: '[',
          after: '](https://)',
          sample: isRu ? 'ссылка' : 'link',
        },
      },
      {
        id: 'hr',
        icon: Minus,
        label: isRu ? 'Разделитель' : 'Divider',
        action: { type: 'insert', text: '\n---\n' },
      },
    ],
  },
]

/* ------------------------- table helpers ------------------------- */

const buildTable = (cols: number, rows: number, isRu: boolean) => {
  const head = Array.from({ length: cols }, (_, i) =>
    isRu ? `Колонка ${i + 1}` : `Column ${i + 1}`,
  )
  const divider = Array.from({ length: cols }, () => '---')
  const body = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '—'))
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`
  return `\n${[line(head), line(divider), ...body.map(line)].join('\n')}\n`
}

/** Locate the markdown table block that contains the caret. */
function findTable(value: string, caret: number) {
  const lines = value.split('\n')
  let pos = 0
  let idx = 0
  for (let i = 0; i < lines.length; i++) {
    const len = (lines[i] ?? '').length
    if (caret <= pos + len) {
      idx = i
      break
    }
    pos += len + 1
    idx = i
  }
  if (!(lines[idx] ?? '').trim().startsWith('|')) return null
  let from = idx
  while (from > 0 && (lines[from - 1] ?? '').trim().startsWith('|')) from--
  let to = idx
  while (to < lines.length - 1 && (lines[to + 1] ?? '').trim().startsWith('|')) to++
  const start = lines.slice(0, from).reduce((n, l) => n + l.length + 1, 0)
  const end = start + lines.slice(from, to + 1).join('\n').length
  const grid = lines.slice(from, to + 1).map((l) =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()),
  )
  return { start, end, grid }
}

const gridToText = (grid: string[][]) =>
  grid.map((r) => `| ${r.join(' | ')} |`).join('\n')

const isDividerRow = (r: string[]) => r.every((c) => /^:?-{2,}:?$/.test(c))



export function RichTextEditor({
  value,
  onChange,
  isRu,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  isRu: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const selRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const [preview, setPreview] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [hover, setHover] = useState({ c: 0, r: 0 })

  const rememberSelection = () => {
    const el = ref.current
    if (el) selRef.current = { start: el.selectionStart, end: el.selectionEnd }
  }

  const apply = (action: Action) => {
    const el = ref.current
    if (!el) return
    const start = Math.min(selRef.current.start, value.length)
    const end = Math.min(selRef.current.end, value.length)
    const selected = value.slice(start, end)


    let next = value
    let caretStart = start
    let caretEnd = end

    if (action.type === 'wrap') {
      const body = selected || action.sample
      const inserted = action.before + body + action.after
      next = value.slice(0, start) + inserted + value.slice(end)
      caretStart = start + action.before.length
      caretEnd = caretStart + body.length
    } else if (action.type === 'line') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = end === start ? value.indexOf('\n', start) : end
      const stop = lineEnd === -1 ? value.length : lineEnd
      const chunk = value.slice(lineStart, stop) || action.sample
      const prefixed = chunk
        .split('\n')
        .map((l) =>
          l.startsWith(action.prefix) ? l : action.prefix + l.replace(/^\s*(?:[-*>]|\d+[.)])\s*/, ''),
        )
        .join('\n')
      next = value.slice(0, lineStart) + prefixed + value.slice(stop)
      caretStart = lineStart
      caretEnd = lineStart + prefixed.length
    } else {
      next = value.slice(0, start) + action.text + value.slice(end)
      caretStart = caretEnd = start + action.text.length
    }

    onChange(next)
    selRef.current = { start: caretStart, end: caretEnd }
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caretStart, caretEnd)
    })
  }

  const replaceRange = (start: number, end: number, text: string) => {
    const el = ref.current
    onChange(value.slice(0, start) + text + value.slice(end))
    const caret = start + text.length
    selRef.current = { start: caret, end: caret }
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(caret, caret)
    })
  }

  const insertTable = (cols: number, rows: number) => {
    setTableOpen(false)
    apply({ type: 'insert', text: buildTable(cols, rows, isRu) })
  }

  const table = findTable(value, Math.min(selRef.current.start, value.length))

  const mutateTable = (op: 'addCol' | 'delCol' | 'addRow' | 'delRow') => {
    if (!table) return
    const grid = table.grid.map((r) => [...r])
    if (op === 'addCol') {
      grid.forEach((r, i) => r.push(isDividerRow(table.grid[i] ?? []) ? '---' : '—'))
    } else if (op === 'delCol') {
      if ((grid[0]?.length ?? 0) <= 1) return
      grid.forEach((r) => r.pop())
    } else if (op === 'addRow') {
      grid.push(Array.from({ length: grid[0]?.length ?? 2 }, () => '—'))
    } else {
      if (grid.length <= 3) return
      grid.pop()
    }
    replaceRange(table.start, table.end, gridToText(grid))
  }

  const chars = value.length


  return (
    <div className="rounded-2xl bg-gradient-to-b from-primary/25 to-transparent p-[1px]">
      <div className="overflow-hidden rounded-[15px] bg-[#0E0E0E]">
        {/* Mode switch */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] bg-white/[0.02] p-1.5">
          {[
            { id: 'edit', label: isRu ? 'Редактор' : 'Editor', icon: Pencil, on: !preview },
            { id: 'view', label: isRu ? 'Превью' : 'Preview', icon: Eye, on: preview },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPreview(t.id === 'view')}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-semibold transition-all ${
                t.on
                  ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/30'
                  : 'text-muted-foreground/70 hover:text-foreground'
              }`}
            >
              <t.icon className="size-[14px]" />
              {t.label}
            </button>
          ))}
        </div>

        {!preview && (
          <div className="space-y-2 border-b border-white/[0.06] bg-white/[0.015] px-2.5 py-3">
            {GROUPS(isRu).map((group) => (
              <div key={group.id} className="space-y-1.5">
                <span className="px-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/45">
                  {group.title}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {group.tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      title={tool.label}
                      aria-label={tool.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => apply(tool.action)}
                      className="flex h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 text-[11.5px] font-medium text-muted-foreground transition-all active:scale-[0.96] active:border-primary/40 active:bg-primary/15 active:text-primary"
                    >

                      <tool.icon className="size-[15px] shrink-0" />
                      {tool.label}
                    </button>
                  ))}
                </div>

              </div>
            ))}

            {/* Table builder */}
            <div className="space-y-1.5">
              <span className="px-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/45">
                {isRu ? 'Таблица' : 'Table'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTableOpen((v) => !v)}
                  className={`flex h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border px-3 text-[11.5px] font-medium transition-all active:scale-[0.96] ${
                    tableOpen
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-white/[0.07] bg-white/[0.03] text-muted-foreground'
                  }`}
                >
                  <Table className="size-[15px] shrink-0" />
                  {isRu ? 'Вставить' : 'Insert'}
                </button>

                {(
                  [
                    { id: 'addCol', label: isRu ? '+ колонка' : '+ column' },
                    { id: 'delCol', label: isRu ? '− колонка' : '− column' },
                    { id: 'addRow', label: isRu ? '+ строка' : '+ row' },
                    { id: 'delRow', label: isRu ? '− строка' : '− row' },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!table}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => mutateTable(b.id)}
                    className="flex h-10 shrink-0 touch-manipulation items-center rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 text-[11.5px] font-medium text-muted-foreground transition-all active:scale-[0.96] active:border-primary/40 active:bg-primary/15 active:text-primary disabled:opacity-30"
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {tableOpen && (
                <div className="mt-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <p className="mb-2 text-[10.5px] text-muted-foreground/60">
                    {hover.c
                      ? `${hover.c} × ${hover.r}`
                      : isRu
                        ? 'Выбери размер таблицы'
                        : 'Pick table size'}
                  </p>
                  <div className="grid w-max grid-cols-6 gap-1">
                    {Array.from({ length: 6 * 8 }, (_, n) => {
                      const c = (n % 6) + 1
                      const r = Math.floor(n / 6) + 1
                      const on = c <= hover.c && r <= hover.r
                      return (
                        <button
                          key={n}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setHover({ c, r })}
                          onTouchStart={() => setHover({ c, r })}
                          onClick={() => insertTable(c, r)}
                          aria-label={`${c} × ${r}`}
                          className={`size-7 touch-manipulation rounded-md border transition-colors ${
                            on
                              ? 'border-primary/50 bg-primary/25'
                              : 'border-white/[0.08] bg-white/[0.03]'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground/45">
                    {isRu
                      ? 'Колонки × строки. Потом можно добавлять кнопками выше.'
                      : 'Columns × rows. Add more with the buttons above.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {preview ? (
          <div className="min-h-[220px] p-5">
            {value.trim() ? (
              <RichText text={value} />
            ) : (
              <p className="text-[13px] text-muted-foreground/50">
                {isRu ? 'Пусто — напиши текст.' : 'Nothing to preview yet.'}
              </p>
            )}
          </div>
        ) : (
          <>
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                rememberSelection()
              }}
              onSelect={rememberSelection}
              onKeyUp={rememberSelection}
              onClick={rememberSelection}
              onBlur={rememberSelection}
              rows={10}
              placeholder={placeholder}
              spellCheck={false}
              autoCapitalize="sentences"
              className="w-full resize-y bg-transparent p-4 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40"
            />

            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 text-[10.5px] text-muted-foreground/50">
              <span>
                {isRu
                  ? 'Выдели текст → нажми кнопку. Без выделения вставится пример.'
                  : 'Select text → tap a button. Without selection a sample is inserted.'}
              </span>
              <span className="shrink-0 pl-3 tabular-nums">{chars}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
