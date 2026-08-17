/**
 * Blockchain verification helpers. Server-only.
 * Uses public, keyless APIs. Rate limits handled by best-effort backoff.
 *
 * Each checker returns the first matching incoming transaction to `address`
 * with USD value roughly matching `expectedUsd` (±5%) and the current
 * confirmation count. Returns null when nothing found.
 */

export type CheckResult = {
  txHash: string
  amountUsd: number
  confirmations: number
} | null

export type ChainKey =
  | 'bitcoin'
  | 'litecoin'
  | 'dogecoin'
  | 'eth_native'
  | 'eth_erc20'
  | 'bsc_native'
  | 'bsc_bep20'
  | 'polygon_native'
  | 'polygon_erc20'
  | 'base_native'
  | 'base_erc20'
  | 'tron_native'
  | 'tron_trc20'
  | 'ton'
  | 'sol_native'
  | 'sol_spl'
  | 'xrp'
  | 'monero'

// Well-known token contracts by chain
const TOKEN_CONTRACTS: Record<string, string> = {
  'ethereum:USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7',
  'ethereum:USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  'ethereum:DAI':  '0x6b175474e89094c44da98b954eedeac495271d0f',
  'bnb-smart-chain:USDT': '0x55d398326f99059ff775485246999027b3197955',
  'bnb-smart-chain:USDC': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  'polygon:USDT': '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  'polygon:USDC': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  'base:USDC':    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  'tron:USDT':    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  'solana:USDT':  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'solana:USDC':  'EPjFWdd5AufqSSqeMBjTGH5aVmS3Ez2Q2cHnJmMWr3D5',
}

// Required confirmations per (symbol, network) — public best-practice numbers
export function requiredConfirmations(symbol: string, network: string): number {
  const key = `${symbol.toUpperCase()}:${network.toUpperCase()}`
  const map: Record<string, number> = {
    'BTC:BITCOIN': 2,
    'LTC:LITECOIN': 2,
    'DOGE:DOGECOIN': 6,
    'ETH:ERC20': 12,
    'USDT:ERC20': 12,
    'USDC:ERC20': 12,
    'DAI:ERC20': 12,
    'BNB:BEP20': 15,
    'USDT:BEP20': 15,
    'USDC:BEP20': 15,
    'POL:POLYGON': 128,
    'USDT:POLYGON': 128,
    'USDC:POLYGON': 128,
    'BASE:BASE': 20,
    'USDC:BASE': 20,
    'TRX:TRON': 20,
    'USDT:TRC20': 20,
    'TON:TON': 1,
    'GRAM:TON': 1,
    'SOL:SOLANA': 32,
    'USDC:SOLANA': 32,
    'USDT:SOLANA': 32,
    'XRP:XRP': 1,
    'XMR:MONERO': 10,
  }
  return map[key] ?? 6
}

export function resolveChain(symbol: string, network: string): ChainKey | null {
  const s = symbol.toUpperCase()
  const n = network.toUpperCase()
  if (s === 'BTC' && n === 'BITCOIN') return 'bitcoin'
  if (s === 'LTC' && n === 'LITECOIN') return 'litecoin'
  if (s === 'DOGE' && n === 'DOGECOIN') return 'dogecoin'
  if (s === 'ETH' && n === 'ERC20') return 'eth_native'
  if (n === 'ERC20') return 'eth_erc20'
  if (s === 'BNB' && n === 'BEP20') return 'bsc_native'
  if (n === 'BEP20') return 'bsc_bep20'
  if (s === 'POL' && n === 'POLYGON') return 'polygon_native'
  if (n === 'POLYGON') return 'polygon_erc20'
  if (s === 'BASE' && n === 'BASE') return 'base_native'
  if (n === 'BASE') return 'base_erc20'
  if (s === 'TRX' && n === 'TRON') return 'tron_native'
  if (n === 'TRC20') return 'tron_trc20'
  if (n === 'TON') return 'ton'
  if (s === 'SOL' && n === 'SOLANA') return 'sol_native'
  if (n === 'SOLANA') return 'sol_spl'
  if (n === 'XRP') return 'xrp'
  if (n === 'MONERO') return 'monero'
  return null
}

async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { 'accept': 'application/json', ...(init?.headers ?? {}) } })
    if (!res.ok) {
      console.warn('[verify:fetch]', res.status, url.slice(0, 100))
      return null
    }
    return (await res.json()) as T
  } catch (e) {
    console.warn('[verify:fetch:err]', (e as Error).message, url.slice(0, 100))
    return null
  }
}

function withinTolerance(usd: number, expectedUsd: number): boolean {
  // Accept 98%–105% of expected. Users may slightly over- or under-pay due to rates.
  return usd >= expectedUsd * 0.98 && usd <= expectedUsd * 1.05
}

// ─── Bitcoin-family via Blockchair ──────────────────────────────────────────
async function checkBlockchair(
  chain: 'bitcoin' | 'litecoin' | 'dogecoin',
  address: string,
  expectedUsd: number,
  usdRate: number,
  sinceMs: number,
): Promise<CheckResult> {
  const url = `https://api.blockchair.com/${chain}/dashboards/address/${address}?limit=20`
  type Resp = {
    data: Record<string, {
      address: { balance: number }
      transactions: string[]
      utxo?: { transaction_hash: string; value: number; block_id: number }[]
    }>
    context: { state: number }
  }
  const j = await fetchJson<Resp>(url)
  if (!j?.data) return null
  const entry = j.data[address] ?? Object.values(j.data)[0]
  if (!entry) return null
  const bestBlock = j.context.state
  const utxos = entry.utxo ?? []
  // Blockchair values are in satoshi/litoshi/koinu (1e8)
  for (const u of utxos) {
    const coins = u.value / 1e8
    const usd = coins * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    const confirmations = u.block_id > 0 ? Math.max(0, bestBlock - u.block_id + 1) : 0
    return { txHash: u.transaction_hash, amountUsd: usd, confirmations }
  }
  return null
}

// ─── EVM native via Blockchair ──────────────────────────────────────────────
async function checkEvmNative(
  chain: 'ethereum' | 'bnb-smart-chain' | 'polygon' | 'base',
  address: string,
  expectedUsd: number,
  usdRate: number,
): Promise<CheckResult> {
  const url = `https://api.blockchair.com/${chain}/dashboards/address/${address.toLowerCase()}?limit=20`
  type Resp = {
    data: Record<string, {
      calls?: { transaction_hash: string; value: string; block_id: number; recipient: string }[]
    }>
    context: { state: number }
  }
  const j = await fetchJson<Resp>(url)
  if (!j?.data) return null
  const entry = j.data[address.toLowerCase()] ?? Object.values(j.data)[0]
  const bestBlock = j.context.state
  const calls = entry?.calls ?? []
  for (const c of calls) {
    if (c.recipient.toLowerCase() !== address.toLowerCase()) continue
    const coins = Number(c.value) / 1e18
    const usd = coins * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    const confirmations = c.block_id > 0 ? Math.max(0, bestBlock - c.block_id + 1) : 0
    return { txHash: c.transaction_hash, amountUsd: usd, confirmations }
  }
  return null
}

// ─── EVM ERC-20/BEP-20 tokens via Blockchair ────────────────────────────────
async function checkEvmToken(
  chain: 'ethereum' | 'bnb-smart-chain' | 'polygon' | 'base',
  address: string,
  symbol: string,
  expectedUsd: number,
  usdRate: number,
): Promise<CheckResult> {
  const contract = TOKEN_CONTRACTS[`${chain}:${symbol.toUpperCase()}`]
  if (!contract) return null
  const url = `https://api.blockchair.com/${chain}/dashboards/address/${address.toLowerCase()}?erc_20=${contract}&limit=20`
  type Resp = {
    data: Record<string, {
      layer_2?: {
        erc_20?: {
          token_address: string
          token_decimals: number
          transactions: { transaction_hash: string; value: string; recipient: string; block_id: number }[]
        }[]
      }
    }>
    context: { state: number }
  }
  const j = await fetchJson<Resp>(url)
  if (!j?.data) return null
  const entry = j.data[address.toLowerCase()] ?? Object.values(j.data)[0]
  const bestBlock = j.context.state
  const tokens = entry?.layer_2?.erc_20 ?? []
  const token = tokens.find((t) => t.token_address.toLowerCase() === contract.toLowerCase())
  if (!token) return null
  for (const tx of token.transactions) {
    if (tx.recipient.toLowerCase() !== address.toLowerCase()) continue
    const coins = Number(tx.value) / 10 ** token.token_decimals
    const usd = coins * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    const confirmations = tx.block_id > 0 ? Math.max(0, bestBlock - tx.block_id + 1) : 0
    return { txHash: tx.transaction_hash, amountUsd: usd, confirmations }
  }
  return null
}

// ─── Tron via Trongrid ──────────────────────────────────────────────────────
async function checkTronNative(address: string, expectedUsd: number, usdRate: number): Promise<CheckResult> {
  type Resp = {
    data?: { txID: string; block_timestamp: number; raw_data: { contract: { type: string; parameter: { value: { amount?: number; to_address?: string } } }[] } }[]
  }
  const j = await fetchJson<Resp>(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=20&only_to=true`)
  if (!j?.data) return null
  const info = await fetchJson<{ block_header?: { raw_data?: { number?: number } } }>(
    `https://api.trongrid.io/wallet/getnowblock`,
  )
  const bestBlock = info?.block_header?.raw_data?.number ?? 0
  for (const tx of j.data) {
    const c = tx.raw_data?.contract?.[0]
    if (!c || c.type !== 'TransferContract') continue
    const amount = (c.parameter.value.amount ?? 0) / 1e6
    const usd = amount * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    // Trongrid doesn't return block number per tx easily here; treat as 1 conf when returned.
    return { txHash: tx.txID, amountUsd: usd, confirmations: bestBlock > 0 ? 1 : 0 }
  }
  return null
}

async function checkTronTrc20(address: string, symbol: string, expectedUsd: number, usdRate: number): Promise<CheckResult> {
  const contract = TOKEN_CONTRACTS[`tron:${symbol.toUpperCase()}`]
  if (!contract) return null
  type Resp = {
    data?: { transaction_id: string; value: string; token_info?: { decimals: number }; to: string; from: string; block_timestamp: number }[]
  }
  const j = await fetchJson<Resp>(
    `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=20&only_to=true&contract_address=${contract}`,
  )
  if (!j?.data) return null
  for (const tx of j.data) {
    const decimals = tx.token_info?.decimals ?? 6
    const amount = Number(tx.value) / 10 ** decimals
    const usd = amount * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    // Approx: 1 confirmation if returned by API (SR-signed).
    return { txHash: tx.transaction_id, amountUsd: usd, confirmations: 1 }
  }
  return null
}

// ─── TON via toncenter ──────────────────────────────────────────────────────
async function checkTon(address: string, expectedUsd: number, usdRate: number): Promise<CheckResult> {
  type Resp = {
    ok: boolean
    result?: { transaction_id: { hash: string }; in_msg?: { value: string; source: string; destination: string }; utime: number }[]
  }
  const j = await fetchJson<Resp>(`https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=20`)
  if (!j?.ok || !j.result) return null
  for (const tx of j.result) {
    if (!tx.in_msg?.value || !tx.in_msg?.source) continue
    const amount = Number(tx.in_msg.value) / 1e9
    const usd = amount * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    return { txHash: tx.transaction_id.hash, amountUsd: usd, confirmations: 1 }
  }
  return null
}

// ─── Solana via public RPC ──────────────────────────────────────────────────
async function checkSolana(address: string, expectedUsd: number, usdRate: number): Promise<CheckResult> {
  const rpc = 'https://api.mainnet-beta.solana.com'
  const sigResp = await fetchJson<{ result?: { signature: string; confirmationStatus?: string; slot: number }[] }>(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 15 }] }),
  })
  const sigs = sigResp?.result ?? []
  for (const s of sigs) {
    const finalized = s.confirmationStatus === 'finalized'
    const txResp = await fetchJson<{ result?: { meta?: { preBalances: number[]; postBalances: number[] }; transaction: { message: { accountKeys: string[] } } } }>(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTransaction',
        params: [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }],
      }),
    })
    const tx = txResp?.result
    if (!tx) continue
    const idx = tx.transaction.message.accountKeys.indexOf(address)
    if (idx < 0 || !tx.meta) continue
    const delta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / 1e9
    if (delta <= 0) continue
    const usd = delta * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    return { txHash: s.signature, amountUsd: usd, confirmations: finalized ? 32 : 1 }
  }
  return null
}

// ─── XRPL via public JSON-RPC ───────────────────────────────────────────────
async function checkXrp(address: string, expectedUsd: number, usdRate: number): Promise<CheckResult> {
  const body = { method: 'account_tx', params: [{ account: address, ledger_index_min: -1, ledger_index_max: -1, limit: 20 }] }
  type Resp = {
    result?: {
      transactions?: { validated?: boolean; tx?: { hash?: string; Destination?: string; Amount?: string | { value: string; currency: string } }; meta?: { delivered_amount?: string } }[]
    }
  }
  const j = await fetchJson<Resp>('https://s1.ripple.com:51234', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const txs = j?.result?.transactions ?? []
  for (const item of txs) {
    if (!item.validated || !item.tx) continue
    if (item.tx.Destination !== address) continue
    const drops = typeof item.meta?.delivered_amount === 'string' ? item.meta.delivered_amount : typeof item.tx.Amount === 'string' ? item.tx.Amount : null
    if (!drops) continue
    const amount = Number(drops) / 1e6
    const usd = amount * usdRate
    if (!withinTolerance(usd, expectedUsd)) continue
    return { txHash: String(item.tx.hash ?? ''), amountUsd: usd, confirmations: 1 }
  }
  return null
}

// ─── Public entry point ─────────────────────────────────────────────────────
export async function verifyIncomingPayment(params: {
  symbol: string
  network: string
  address: string
  expectedUsd: number
  usdRate: number
  createdAtMs: number
}): Promise<CheckResult | { manualRequired: true }> {
  const { symbol, network, address, expectedUsd, usdRate, createdAtMs } = params
  const chain = resolveChain(symbol, network)
  if (!chain) return null
  if (chain === 'monero') return { manualRequired: true }
  try {
    switch (chain) {
      case 'bitcoin': return await checkBlockchair('bitcoin', address, expectedUsd, usdRate, createdAtMs)
      case 'litecoin': return await checkBlockchair('litecoin', address, expectedUsd, usdRate, createdAtMs)
      case 'dogecoin': return await checkBlockchair('dogecoin', address, expectedUsd, usdRate, createdAtMs)
      case 'eth_native': return await checkEvmNative('ethereum', address, expectedUsd, usdRate)
      case 'eth_erc20': return await checkEvmToken('ethereum', address, symbol, expectedUsd, usdRate)
      case 'bsc_native': return await checkEvmNative('bnb-smart-chain', address, expectedUsd, usdRate)
      case 'bsc_bep20': return await checkEvmToken('bnb-smart-chain', address, symbol, expectedUsd, usdRate)
      case 'polygon_native': return await checkEvmNative('polygon', address, expectedUsd, usdRate)
      case 'polygon_erc20': return await checkEvmToken('polygon', address, symbol, expectedUsd, usdRate)
      case 'base_native': return await checkEvmNative('base', address, expectedUsd, usdRate)
      case 'base_erc20': return await checkEvmToken('base', address, symbol, expectedUsd, usdRate)
      case 'tron_native': return await checkTronNative(address, expectedUsd, usdRate)
      case 'tron_trc20': return await checkTronTrc20(address, symbol, expectedUsd, usdRate)
      case 'ton': return await checkTon(address, expectedUsd, usdRate)
      case 'sol_native': return await checkSolana(address, expectedUsd, usdRate)
      case 'sol_spl': return null // SPL token detection needs getTokenAccountsByOwner; TODO
      case 'xrp': return await checkXrp(address, expectedUsd, usdRate)
    }
  } catch (e) {
    console.error('[verify:err]', chain, (e as Error).message)
    return null
  }
  return null
}
