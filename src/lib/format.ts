export function money(n: number) {
  return `$${n.toFixed(2)}`
}

export function compactNumber(n: number) {
  // Preserve two meaningful decimals without rounding the real count upward.
  const trunc = (v: number) => {
    const t = Math.floor(v * 100) / 100
    return t.toFixed(2).replace(/\.0+$|(?<=\.[0-9])0$/, '')
  }
  if (n >= 1000000) return `${trunc(n / 1000000)}M`
  if (n >= 1000) return `${trunc(n / 1000)}k`
  return `${n}`
}


const FOLLOWERS_RE =
  /^(?:@[A-Za-z0-9_]{1,15}|(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}(?:\/status\/\d+)?\/?)$/

const LIKES_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+\/?$/

export function parseTargets(
  raw: string,
  mode: 'followers' | 'likes' = 'followers'
): { valid: string[]; invalid: string[] } {
  const re = mode === 'likes' ? LIKES_RE : FOLLOWERS_RE
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const valid: string[] = []
  const invalid: string[] = []
  for (const line of lines) {
    if (re.test(line)) valid.push(line)
    else invalid.push(line)
  }
  return { valid, invalid }
}

// Format a crypto amount with appropriate precision
export function cryptoAmount(usd: number, rate: number) {
  const amount = usd / rate
  if (rate >= 1000) return amount.toFixed(6) // BTC
  if (rate >= 50) return amount.toFixed(5) // ETH / SOL
  if (rate >= 2) return amount.toFixed(4) // TON
  return amount.toFixed(2) // stablecoins
}
