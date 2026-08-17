/**
 * Styled spreadsheet export for delivered accounts.
 * Produces a real .xlsx (opens perfectly in Excel / Google Sheets) with
 * colour-coded field groups, auto-fitted columns and a frozen header row.
 */
import XLSX from 'xlsx-js-style'
import { displayValue, exportHeader, type DeliveredAccount, type FieldKey } from './order-delivery'

type Group = {
  id: string
  header: string // header background
  headerText: string
  fill: string // body background
  text: string // body text colour
  border: string
}

/* Palette: each credential pair gets its own hue, tuned for white sheets. */
const GROUPS: Record<string, Group> = {
  login: { id: 'login', header: '0F8A5F', headerText: 'FFFFFF', fill: 'E7F6EE', text: '11512F', border: 'B9E3CC' },
  email: { id: 'email', header: 'C2610A', headerText: 'FFFFFF', fill: 'FDF0E1', text: '7A3D05', border: 'F3D5AF' },
  twofa: { id: 'twofa', header: '6B3FD4', headerText: 'FFFFFF', fill: 'F1EBFE', text: '3E2185', border: 'D6C6F7' },
  phone: { id: 'phone', header: 'B3306E', headerText: 'FFFFFF', fill: 'FCEAF2', text: '73194A', border: 'F2C4D9' },
  token: { id: 'token', header: '0E7490', headerText: 'FFFFFF', fill: 'E4F4F8', text: '084C5F', border: 'B6DFE9' },
  stats: { id: 'stats', header: '475569', headerText: 'FFFFFF', fill: 'EFF2F6', text: '32405A', border: 'D3DAE4' },
  index: { id: 'index', header: '1F2937', headerText: 'FFFFFF', fill: 'F5F6F8', text: '4B5563', border: 'DCE0E6' },
}

const FIELD_GROUP: Record<string, Group> = {
  username: GROUPS.login,
  password: GROUPS.login,
  hotmail_email: GROUPS.email,
  hotmail_pass: GROUPS.email,
  twofa: GROUPS.twofa,
  phone: GROUPS.phone,
  ct0: GROUPS.token,
  auth_token: GROUPS.token,
  refresh_token: GROUPS.token,
  client_id: GROUPS.token,
  date: GROUPS.stats,
  followers: GROUPS.stats,
  follows: GROUPS.stats,
  posts: GROUPS.stats,
  blue: GROUPS.stats,
  creation_country: GROUPS.stats,
}


const MONO = new Set(['ct0', 'auth_token', 'refresh_token', 'client_id', 'twofa'])
const NUMERIC = new Set(['followers', 'follows', 'posts'])

function border(color: string) {
  const side = { style: 'thin' as const, color: { rgb: color } }
  return { top: side, bottom: side, left: side, right: side }
}

export function buildOrderWorkbook(
  accounts: DeliveredAccount[],
  fields: FieldKey[],
  sheetName = 'Accounts',
): XLSX.WorkBook {
  const showIndex = accounts.length > 1
  const cols: { key: string; group: Group; header: string }[] = []
  if (showIndex) cols.push({ key: '__i', group: GROUPS.index, header: '#' })
  for (const f of fields) {
    cols.push({
      key: f,
      group: FIELD_GROUP[f] ?? GROUPS.stats,
      header: exportHeader(accounts, f),
    })
  }

  const rows: (string | number)[][] = accounts.map((acc, i) =>
    cols.map((c) => {
      if (c.key === '__i') return i + 1
      const raw = displayValue(c.key as FieldKey, acc[c.key] ?? '')
      if (NUMERIC.has(c.key) && raw !== '' && !Number.isNaN(Number(raw))) return Number(raw)
      return raw
    }),
  )

  const aoa: (string | number)[][] = [cols.map((c) => c.header), ...rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  cols.forEach((c, ci) => {
    // header
    const hRef = XLSX.utils.encode_cell({ r: 0, c: ci })
    ws[hRef].s = {
      font: { bold: true, sz: 11, color: { rgb: c.group.headerText }, name: 'Inter' },
      fill: { patternType: 'solid', fgColor: { rgb: c.group.header } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(c.group.header),
    }

    for (let r = 1; r <= rows.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: ci })
      const cell = ws[ref]
      if (!cell) continue
      cell.s = {
        font: {
          sz: 10.5,
          color: { rgb: c.group.text },
          name: MONO.has(c.key) ? 'Consolas' : 'Inter',
          bold: c.key === 'username' || c.key === '__i',
        },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: c.group.fill },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        border: border(c.group.border),
      }
      if (NUMERIC.has(c.key) && typeof cell.v === 'number') cell.z = '#,##0'
    }
  })

  // auto-fit widths: headers are bold + carry an autofilter dropdown button,
  // so they need noticeably more room than plain body text.
  ws['!cols'] = cols.map((c, ci) => {
    const bodyLen = Math.max(
      0,
      ...aoa.slice(1).map((r) => String(r[ci] ?? '').length),
    )
    const headerLen = c.header.length * 1.18 + 6 // bold glyphs + filter arrow
    const len = Math.max(bodyLen + 3, headerLen)
    return { wch: Math.min(Math.max(len, c.key === '__i' ? 5 : 11), 52) }
  })
  ws['!rows'] = [{ hpt: 26 }, ...rows.map(() => ({ hpt: 20 }))]
  ws['!freeze'] = 'A2'
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: cols.length - 1 },
    }),
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

export function downloadOrderXlsx(
  accounts: DeliveredAccount[],
  fields: FieldKey[],
  filename: string,
) {
  const wb = buildOrderWorkbook(accounts, fields)
  XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true })
}
