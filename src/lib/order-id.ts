/**
 * Internal project order id, derived from the purchase date/time.
 * Format: M + DD + Hmm + YYYY (Moscow time, 12-hour clock).
 * e.g. Aug 13 2026, 8:35 → "8138352026".
 */
export function projectOrderId(ts: number): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    month: 'numeric',
    day: '2-digit',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    year: 'numeric',
  })
  const parts = fmt.formatToParts(new Date(ts))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('month')}${get('day')}${get('hour')}${get('minute')}${get('year')}`
}
