import type { ReactNode } from 'react'

/**
 * Tiny forum-style markup used in account descriptions.
 *
 * Inline:  **bold**  *italic*  __underline__  ~~strike~~  `code`  ==highlight==  [text](url)
 * Blocks:  # H1 / ## H2  >quote  - bullet  1. numbered  --- divider  | table | rows |
 */

export type RichBlock =
  | { kind: 'h'; level: 1 | 2; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'hr' }
  | { kind: 'table'; head: string[]; rows: string[][] }

const BULLET_RE = /^\s*(?:[-–—•*]\s*)/
const NUM_RE = /^\s*\d+[.)]\s*/

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim())
}

const isDivider = (cells: string[]) => cells.every((c) => /^:?-{2,}:?$/.test(c))

export function parseRich(raw: string): RichBlock[] {
  const lines = raw.replace(/\r/g, '').split('\n')
  const blocks: RichBlock[] = []

  let ul: string[] = []
  let ol: string[] = []
  let quote: string[] = []
  let code: string[] | null = null

  const flush = () => {
    if (ul.length) blocks.push({ kind: 'ul', items: ul }), (ul = [])
    if (ol.length) blocks.push({ kind: 'ol', items: ol }), (ol = [])
    if (quote.length) blocks.push({ kind: 'quote', lines: quote }), (quote = [])
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const t = line.trim()

    // fenced code
    if (t.startsWith('```')) {
      if (code) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else {
        flush()
        code = []
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }

    if (!t) {
      flush()
      continue
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(t)) {
      flush()
      blocks.push({ kind: 'hr' })
      continue
    }

    // table
    if (t.startsWith('|') && t.includes('|', 1)) {
      flush()
      const rows: string[][] = []
      let j = i
      while (j < lines.length && (lines[j] ?? '').trim().startsWith('|')) {
        rows.push(splitRow((lines[j] ?? '').trim()))
        j++
      }
      i = j - 1
      const body = rows.filter((r) => !isDivider(r))
      const head = rows.length > 1 && isDivider(rows[1] ?? []) ? (body.shift() ?? []) : []
      blocks.push({ kind: 'table', head, rows: body })
      continue
    }

    const h = /^(#{1,2})\s+(.*)$/.exec(t)
    if (h) {
      flush()
      blocks.push({ kind: 'h', level: h[1]!.length as 1 | 2, text: h[2]!.trim() })
      continue
    }

    if (t.startsWith('>')) {
      if (ul.length || ol.length) flush()
      quote.push(t.replace(/^>\s?/, ''))
      continue
    }

    if (NUM_RE.test(t)) {
      if (ul.length || quote.length) flush()
      ol.push(t.replace(NUM_RE, '').trim())
      continue
    }

    if (BULLET_RE.test(t)) {
      if (ol.length || quote.length) flush()
      ul.push(t.replace(BULLET_RE, '').trim())
      continue
    }

    flush()
    blocks.push({ kind: 'p', text: t })
  }

  if (code) blocks.push({ kind: 'code', text: code.join('\n') })
  flush()
  return blocks
}

const INLINE_RE =
  /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|==[^=]+==|`[^`]+`|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\))/g

/** Render inline markup inside one line of text. */
export function renderInline(text: string, keyBase = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  let n = 0

  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${n++}`

    if (tok.startsWith('**')) {
      out.push(
        <strong key={key} className="font-bold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      )
    } else if (tok.startsWith('__')) {
      out.push(
        <span key={key} className="underline decoration-primary/60 underline-offset-[3px]">
          {tok.slice(2, -2)}
        </span>,
      )
    } else if (tok.startsWith('~~')) {
      out.push(
        <span key={key} className="line-through opacity-60">
          {tok.slice(2, -2)}
        </span>,
      )
    } else if (tok.startsWith('==')) {
      out.push(
        <mark
          key={key}
          className="rounded-[4px] bg-primary/15 px-1 py-[1px] font-medium text-primary"
        >
          {tok.slice(2, -2)}
        </mark>,
      )
    } else if (tok.startsWith('`')) {
      out.push(
        <code
          key={key}
          className="rounded-[5px] border border-white/[0.08] bg-white/[0.05] px-1.5 py-[1px] font-mono text-[0.9em] text-primary/90"
        >
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('[')) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!
      out.push(
        <a
          key={key}
          href={lm[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline decoration-primary/40 underline-offset-2"
        >
          {lm[1]}
        </a>,
      )
    } else {
      out.push(
        <em key={key} className="italic text-zinc-200">
          {tok.slice(1, -1)}
        </em>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Full renderer for parsed blocks. */
export function RichText({ text }: { text: string }) {
  const blocks = parseRich(text)

  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h':
            return b.level === 1 ? (
              <h4
                key={i}
                className="font-display pt-1 text-[18px] font-bold tracking-tight text-foreground"
              >
                {renderInline(b.text, `h${i}`)}
              </h4>
            ) : (
              <h5
                key={i}
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80"
              >
                {renderInline(b.text, `h${i}`)}
              </h5>
            )

          case 'p':
            return i === 0 ? (
              <div key={i} className="relative pl-4">
                <span
                  aria-hidden
                  className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full bg-gradient-to-b from-primary via-primary/40 to-transparent"
                />
                <p className="text-[15.5px] font-medium leading-[1.6] text-foreground">
                  {renderInline(b.text, `p${i}`)}
                </p>
              </div>
            ) : (
              <p key={i} className="text-[14px] leading-[1.7] text-zinc-400">
                {renderInline(b.text, `p${i}`)}
              </p>
            )

          case 'quote':
            return (
              <blockquote
                key={i}
                className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] py-3 pl-5 pr-4"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary to-primary/20"
                />
                <div className="space-y-1 text-[13.5px] italic leading-relaxed text-zinc-300">
                  {b.lines.map((l, j) => (
                    <p key={j}>{renderInline(l, `q${i}-${j}`)}</p>
                  ))}
                </div>
              </blockquote>
            )

          case 'ul':
            return (
              <div
                key={i}
                className="space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                {b.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <span className="mt-[7px] size-1.5 shrink-0 rotate-45 bg-primary shadow-[0_0_8px_var(--primary)]" />
                    <p className="text-[13.5px] leading-relaxed text-zinc-300">
                      {renderInline(item, `u${i}-${j}`)}
                    </p>
                  </div>
                ))}
              </div>
            )

          case 'ol':
            return (
              <div
                key={i}
                className="space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                {b.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <span className="mt-[1px] flex size-5 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-[10px] font-bold text-primary">
                      {j + 1}
                    </span>
                    <p className="text-[13.5px] leading-relaxed text-zinc-300">
                      {renderInline(item, `o${i}-${j}`)}
                    </p>
                  </div>
                ))}
              </div>
            )

          case 'code':
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/60 p-4 font-mono text-[12px] leading-relaxed text-zinc-300"
              >
                {b.text}
              </pre>
            )

          case 'hr':
            return (
              <div
                key={i}
                aria-hidden
                className="h-px w-full bg-gradient-to-r from-transparent via-primary/35 to-transparent"
              />
            )

          case 'table': {
            const cols = Math.max(b.head.length, ...b.rows.map((r) => r.length), 1)
            const dense = cols >= 5
            const mid = cols === 4
            const cell = dense
              ? 'px-1.5 py-2 text-[11px]'
              : mid
                ? 'px-2.5 py-2.5 text-[12px]'
                : 'px-3.5 py-2.5 text-[13px]'
            const headCell = dense
              ? 'px-1.5 py-2 text-[9px] tracking-[0.06em]'
              : mid
                ? 'px-2.5 py-2.5 text-[9.5px] tracking-[0.08em]'
                : 'px-3.5 py-2.5 text-[10.5px] tracking-[0.12em]'
            return (
              <div
                key={i}
                className="w-full max-w-full rounded-xl border border-white/[0.07] bg-white/[0.02]"
              >
                <table className="w-full table-fixed border-collapse text-left">
                  {b.head.length > 0 && (
                    <thead>
                      <tr className="border-b border-primary/20 bg-primary/[0.06]">
                        {b.head.map((c, j) => (
                          <th
                            key={j}
                            className={`${headCell} break-words hyphens-auto font-bold uppercase text-primary/80`}
                          >
                            {renderInline(c, `th${i}-${j}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-b border-white/[0.05] last:border-0">
                        {Array.from({ length: cols }, (_, k) => (
                          <td
                            key={k}
                            className={`${cell} break-words hyphens-auto ${
                              k === 0 ? 'font-medium text-zinc-200' : 'text-zinc-400'
                            }`}
                          >
                            {renderInline(r[k] ?? '', `td${i}-${j}-${k}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

        }
      })}
    </div>
  )
}
