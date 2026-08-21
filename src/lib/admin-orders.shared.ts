export const ADMIN_ORDER_STATUSES = [
  'pending',
  'in_progress',
  'waiting',
  'completed',
  'declined',
  'failed',
  'refilling',
  'refunded',
] as const

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number]

export function parseAdminOrderId(value: unknown) {
  const orderId = String(value ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error('orderId must be a real order id')
  }
  return orderId
}

export function parseAdminOrderStatus(value: unknown): AdminOrderStatus {
  if (!(ADMIN_ORDER_STATUSES as readonly unknown[]).includes(value)) {
    throw new Error('Unknown status')
  }
  return value as AdminOrderStatus
}