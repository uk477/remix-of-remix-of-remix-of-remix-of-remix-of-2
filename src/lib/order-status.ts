/**
 * Единый источник правды для цвета и текста статуса заказа.
 * Используется везде: история заказов, верхняя карточка, детальная карточка,
 * админ-панель. Никаких локальных «своих» подписей и цветов.
 */

import type { OrderStatus } from './types'

export type StatusTone = 'neutral' | 'live' | 'warning' | 'success' | 'info' | 'danger'

export type StatusView = {
  tone: StatusTone
  ru: string
  en: string
}

export const ORDER_STATUS_VIEW: Record<OrderStatus, StatusView> = {
  waiting: { tone: 'neutral', ru: 'Заказ оформлен', en: 'Placed' },
  in_progress: { tone: 'warning', ru: 'В работе', en: 'In progress' },
  refilling: { tone: 'success', ru: 'В процессе (refill)', en: 'In progress (refill)' },
  refunded: { tone: 'info', ru: 'Возврат средств', en: 'Refund' },
  failed: { tone: 'danger', ru: 'Ошибка', en: 'Error' },
  completed: { tone: 'success', ru: 'Завершён', en: 'Completed' },
  cancelled: { tone: 'danger', ru: 'Отменён', en: 'Cancelled' },
}

export function orderStatusView(status: OrderStatus): StatusView {
  return ORDER_STATUS_VIEW[status] ?? ORDER_STATUS_VIEW.waiting
}

export function orderStatusLabel(status: OrderStatus, ru: boolean) {
  const v = orderStatusView(status)
  return ru ? v.ru : v.en
}

/** Классы для «капсулы» статуса (история заказов, админ-таблицы). */
export const STATUS_BADGE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground/12 text-muted-foreground ring-muted-foreground/20',
  live: 'bg-primary/12 text-primary ring-primary/20',
  warning: 'bg-warning/12 text-warning ring-warning/20',
  success: 'bg-success/12 text-success ring-success/20',
  info: 'bg-info/12 text-info ring-info/20',
  danger: 'bg-destructive/12 text-destructive ring-destructive/20',
}

export const STATUS_TEXT_CLASS: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  live: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
  danger: 'text-destructive',
}

/** Статусы БД → статус приложения (одинаково в клиенте и админке). */
export type DbOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'declined'
  | 'refunded'
  | 'failed'
  | 'refilling'

export function dbStatusToOrderStatus(s: DbOrderStatus | string): OrderStatus {
  switch (s) {
    case 'completed':
      return 'completed'
    case 'refunded':
      return 'refunded'
    case 'failed':
      return 'failed'
    case 'refilling':
      return 'refilling'
    case 'declined':
      return 'cancelled'
    case 'in_progress':
      return 'in_progress'
    default:
      return 'waiting'
  }
}

export function orderStatusToDbStatus(s: OrderStatus): DbOrderStatus {
  if (s === 'cancelled') return 'declined'
  if (s === 'waiting') return 'pending'
  return s
}
