// Tiny CSV/TXT export helpers used by the admin panel.

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
) {
  const head = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c.key])).join(','))
    .join('\n')
  download(filename.endsWith('.csv') ? filename : `${filename}.csv`, `${head}\n${body}\n`, 'text/csv')
}

export function downloadTXT<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
) {
  const lines = rows.map((r) => {
    return columns.map((c) => `${c.label}: ${r[c.key] ?? ''}`).join('\n')
  })
  const content = lines.join('\n' + '─'.repeat(40) + '\n')
  download(
    filename.endsWith('.txt') ? filename : `${filename}.txt`,
    content + '\n',
    'text/plain',
  )
}
