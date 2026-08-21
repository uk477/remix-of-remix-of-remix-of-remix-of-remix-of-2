/**
 * Единый источник правды для цвета и текста статуса заказа.
 * Используется везде: история заказов, верхняя карточка, детальная карточка,
 * админ-панель. Никаких локальных «своих» подписей и цветов.
 */

import type { OrderStatus } from './types'

export type StatusTone =
  | 'neutral'
  | 'live'
  | 'warning'
  | 'success'
  | 'emerald'
  | 'info'
  | 'danger'
  | 'coral'

export type StatusView = {
  tone: StatusTone
  ru: string
  en: string
}

export const ORDER_STATUS_VIEW: Record<OrderStatus, StatusView> = {
  waiting: { tone: 'neutral', ru: 'Заказ оформлен', en: 'Placed' },
  in_progress: { tone: 'warning', ru: 'В работе', en: 'In progress' },
  refilling: { tone: 'emerald', ru: 'В процессе (refill)', en: 'In progress (refill)' },
  refunded: { tone: 'info', ru: 'Возврат средств', en: 'Refund' },
  failed: { tone: 'danger', ru: 'Ошибка', en: 'Error' },
  completed: { tone: 'success', ru: 'Завершён', en: 'Completed' },
  cancelled: { tone: 'coral', ru: 'Отменён', en: 'Cancelled' },
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
  emerald: 'bg-emerald/12 text-emerald ring-emerald/20',
  info: 'bg-info/12 text-info ring-info/20',
  danger: 'bg-destructive/12 text-destructive ring-destructive/20',
  coral: 'bg-coral/12 text-coral ring-coral/20',
}

export const STATUS_TEXT_CLASS: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  live: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  emerald: 'text-emerald',
  info: 'text-info',
  danger: 'text-destructive',
  coral: 'text-coral',
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

/** Единый акцент статуса: CSS-переменная цвета для линии, свечения, иконок. */
export const STATUS_ACCENT_VAR: Record<StatusTone, string> = {
  neutral: 'var(--muted-foreground)',
  live: 'var(--primary)',
  warning: 'var(--warning)',
  success: 'var(--success)',
  emerald: 'var(--emerald)',
  info: 'var(--info)',
  danger: 'var(--destructive)',
  coral: 'var(--coral)',
}

export type StatusAccent = {
  tone: StatusTone
  /** Основной цвет акцента (CSS color). */
  color: string
  /** Мягкое свечение. */
  glow: string
  /** Заливка левой линии. */
  rail: string
  badgeClass: string
  textClass: string
}

export function orderStatusAccent(status: OrderStatus): StatusAccent {
  const tone = orderStatusView(status).tone
  const color = STATUS_ACCENT_VAR[tone]
  return {
    tone,
    color,
    glow: `0 0 12px color-mix(in oklab, ${color} 38%, transparent)`,
    rail: `color-mix(in oklab, ${color} 78%, transparent)`,
    badgeClass: STATUS_BADGE_CLASS[tone],
    textClass: STATUS_TEXT_CLASS[tone],
  }
}
