/**
 * Service discriminator for orders.
 *
 * Каждая услуга — отдельный продукт со СВОИМ дизайном:
 *   'custom' — аккаунт под ключ (custom account)
 *   'aged'   — aged / готовые X-аккаунты (дизайн ЗАМОРОЖЕН)
 *   'boost'  — буст подписчиков и прочие сервисы
 *
 * Любая правка визуала должна ветвиться по этому типу, а не «на глаз».
 * Тестовые заказы — это будущие настоящие заказы: тот же тип услуги,
 * тот же дизайн, отличается только пометкой TEST.
 */
import type { Order } from './types'

export type ServiceKind = 'custom' | 'aged' | 'boost'

export function orderService(order: Pick<Order, 'kind' | 'customAccount'> | null | undefined): ServiceKind {
  if (!order) return 'aged'
  if (order.customAccount) return 'custom'
  if (order.kind === 'boost') return 'boost'
  return 'aged'
}

/** Локальный/демо заказ, созданный для проверки механики. */
export function isTestOrder(order: Pick<Order, 'id'> | null | undefined): boolean {
  const id = order?.id ?? ''
  return id.startsWith('test-') || id.startsWith('demo-')
}
