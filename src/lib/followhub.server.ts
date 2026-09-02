const ENDPOINT = 'https://api.followhub.io/v1'

export type FollowHubService = {
  id: string
  name: string
  platform: string
  type: string
  min: number
  max: number
  refillPeriod: number
  status: string
  rates: Array<{
    rate: number
    additionalRefillPricePerDay: number
    threshold: number
  }>
}

export type FollowHubTarget = {
  value: string
  amount: number
  received: number
  status: string
  startCount: number
}

export type FollowHubOrder = {
  id: string
  additionalId?: string
  serviceId: string
  createdDate: number
  refillPeriod: number
  charged: number
  targets: FollowHubTarget[]
}

export type FollowHubNewOrder = {
  createdDate: number
  orderId: string
}

export class FollowHubApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'FollowHubApiError'
    this.status = status
  }
}

async function fhCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env['FOLLOWHUB_API_KEY']
  if (!key) throw new FollowHubApiError(500, 'FOLLOWHUB_API_KEY is not configured')

  const response = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    throw new FollowHubApiError(response.status, `FollowHub returned invalid JSON [${response.status}]`)
  }

  if (!response.ok) {
    const raw = body as { detail?: string; title?: string; message?: string } | null
    const message = raw?.detail ?? raw?.message ?? raw?.title ?? `FollowHub request failed [${response.status}]`
    console.error(`[followhub] ${path} failed [${response.status}]: ${message}`)
    throw new FollowHubApiError(response.status, message)
  }
  return body as T
}

export async function fhGetServices() {
  const result = await fhCall<FollowHubService[] | { services?: FollowHubService[] }>('/Services')
  return Array.isArray(result) ? result : result.services ?? []
}

export async function fhGetBalance() {
  return fhCall<{ balance: number; currency?: string }>('/Balance')
}

export async function fhNewOrder(input: {
  serviceId: string
  amount: number
  targets: string[]
  additionalId: string
  additionalRefillDays?: number
}) {
  return fhCall<FollowHubNewOrder>('/Order/New', {
    method: 'POST',
    body: JSON.stringify({
      additionalId: input.additionalId,
      amount: input.amount,
      serviceId: input.serviceId,
      additionalRefillDays: input.additionalRefillDays ?? 0,
      targets: input.targets,
    }),
  })
}

export async function fhGetOrder(orderId: string): Promise<FollowHubOrder> {
  const result = await fhCall<{ order?: FollowHubOrder } | FollowHubOrder>(
    `/Order/${encodeURIComponent(orderId)}`,
  )
  if ('order' in result) {
    if (!result.order) throw new FollowHubApiError(502, 'FollowHub order response is missing order data')
    return result.order
  }
  if (!('id' in result)) throw new FollowHubApiError(502, 'FollowHub order response is invalid')
  return result
}

export function followHubTypeForCategory(category: string) {
  switch (category.toLowerCase()) {
    case 'followers': return 'Followers'
    case 'likes': return 'Likes'
    case 'reposts': return 'Reposts'
    case 'bookmarks': return 'Bookmarks'
    case 'views': return 'Views'
    default: return null
  }
}

export function chooseFollowHubService(services: FollowHubService[], category: string, localName = '') {
  const type = followHubTypeForCategory(category)
  if (!type) throw new FollowHubApiError(400, 'This service is not available through FollowHub')
  const candidates = services.filter((service) =>
    service.platform.toLowerCase() === 'x' &&
    service.type.toLowerCase() === type.toLowerCase() &&
    service.status.toLowerCase() === 'active',
  )
  if (candidates.length === 0) throw new FollowHubApiError(503, `FollowHub has no active ${type} service`)

  const local = localName.toLowerCase()
  const region = ['japan', 'jp', 'korea', 'kr', 'usa', 'us'].find((part) => local.includes(part))
  return candidates.find((service) => region && service.name.toLowerCase().includes(region)) ?? candidates[0]
}

export function followHubStatus(targets: FollowHubTarget[]) {
  const statuses = targets.map((target) => target.status.toLowerCase())
  if (statuses.length > 0 && statuses.every((status) => status === 'completed')) return 'completed' as const
  if (statuses.some((status) => status === 'inprogress' || status === 'in_progress')) return 'in_progress' as const
  return 'waiting' as const
}
