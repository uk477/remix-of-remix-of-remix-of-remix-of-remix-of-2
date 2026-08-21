export type Lang = 'en' | 'ru' | 'ar' | 'zh' | 'es' | 'tr' | 'pt' | 'fr' | 'uk'

export type Localized = Record<Lang, string>

export type ServiceCategory = {
  id: string
  icon: string // lucide icon name
  name: Localized
}

// Verification type for account listings
export type Verification = 'none' | 'blue' | 'gold' | 'gray'

// Top-level marketplace categories shown on the home screen
export type MarketCategoryId =
  | 'boost'
  | 'aged'
  | 'followers_acc'
  | 'smart_acc'
  | 'blue_acc'
  | 'gold_acc'
  | 'other'

export type MarketCategory = {
  id: MarketCategoryId
  route: 'catalog' | 'accounts' | 'services'
  icon: string // lucide icon name
  accent: 'gold' | 'blue'
  name: Localized
  desc: Localized
  featured?: boolean
}

// Other X services — one-time / subscription style services
export type OtherService = {
  id: string
  icon: string // lucide icon name
  name: Localized
  description: Localized
  price: number
  unit: Localized // e.g. "one-time", "per month"
  badge?: Localized
  features: Localized[]
}

export type BoostService = {
  id: string
  categoryId: string
  /** Optional region tag for followers ('global' | 'jp' | 'kr' | 'us'). */
  region?: 'global' | 'jp' | 'kr' | 'us'
  name: Localized
  description: Localized
  pricePer1000: number
  min: number
  max: number
  refill: boolean
  cancel: boolean
  speed: Localized
  popular?: boolean
}

export type AgedAccount = {
  id: string
  category: MarketCategoryId
  name: Localized
  description: Localized
  /** Admin toggle: show the "Описание" block on the account detail page. */
  descriptionEnabled?: boolean
  yearRange: string
  pricePerAccount: number
  /** Supplier cost per account (before markup), when the item mirrors a supplier product. */
  supplierBase?: number
  /** Which markup multiplier applies to `supplierBase`. */
  supplierKind?: 'fresh' | 'dated'
  stock: number
  badge?: Localized
  features: Localized[]
  // Optional metadata used for listings & future filters
  followers?: number
  /** Followers displayed as a range (min–max) on the card hero. */
  followersRange?: [number, number]
  smartFollowers?: number
  /** Named smart followers shown in the X-style block on the detail page. */
  smartFollowersList?: { label: string; avatar_url?: string | null }[]
  verification?: Verification
  year?: number
  /** Primary topic (default display). */
  topicId?: string
  /** All topics the account belongs to; first is primary. */
  topicIds?: string[]
  /** DB sort_order used for admin manual ordering (lower = earlier). */
  sortOrder?: number
  /** Public X profile URL or handle for follower-account cards. */
  accountUrl?: string
  /** Whether the account is delivered automatically after purchase. */
  autoDelivery?: boolean
}

export type CartItem = {
  key: string
  kind: 'boost' | 'account'
  refId: string
  title: string
  subtitle: string
  qty: number
  unitPrice: number // total price for this line per unit-of-qty already computed where needed
  total: number
  meta?: Record<string, string>
}

export type OrderStatus =
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refilling'
  | 'refunded'
  | 'failed'

export type Order = {
  id: string
  date: number
  title: string
  amount: number
  status: OrderStatus
  /** Exact persisted backend status; keeps admin controls lossless across reloads. */
  dbStatus?: import('./order-status').DbOrderStatus
  refillable: boolean
  kind: 'boost' | 'account'
  // whether this order was already paid with real money / balance
  paid: boolean
  /** Quantity of delivered units (accounts) in this order. */
  qty?: number
  /** Supplier-side order/batch reference shown as "Order ID". */
  orderRef?: string
  /** Warranty expiry timestamp, when the item ships with a warranty. */
  guaranteeUntil?: number
  /** Whether mail access is bundled with the delivered accounts. */
  emailAccess?: boolean
  /** Whether 2FA codes are available for the delivered accounts. */
  twofa?: boolean
  /** Delivered account credentials (field → value maps). */
  accounts?: Record<string, string>[]
  /** Custom-built account specification; delivery appears only after completion. */
  customAccount?: Record<string, string>
  /** Fulfilment stage (1-based) shown in the progress tracker; admin-driven. */
  progressStep?: number
  /** Catalog service id (boost) or account pack id this order was bought from. */
  serviceId?: string
  /** Boost target: @handle / profile url, or a post link. */
  target?: string
  /** Follower count captured at purchase time (boost followers only). */
  startFollowers?: number
  /** When the order was marked completed. */
  completedAt?: number
  /** Human-readable cancellation reason shown when the order is cancelled by API. */
  cancelReason?: string
}

export type TopupStatus = 'success' | 'declined' | 'pending'

export type Topup = {
  id: string
  date: number
  amount: number
  coin: string // e.g. USDT, BTC
  network: string
  status: TopupStatus
  closedAt?: number
  txHash?: string
  address?: string
}

export type CryptoCoin = {
  id: string
  symbol: string
  name: string
  network: string
  // demo USD rate (price of 1 coin in USD); stablecoins ~1
  usdRate: number
  address: string
}
