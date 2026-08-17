'use client'

/**
 * Router-level service switch: каждая услуга имеет свой экран заказа.
 * boost (продвижение) → BoostOrderScreen
 * aged / custom       → OrderScreen (дизайн заморожен)
 */
import { useParams } from '@tanstack/react-router'
import { useMemo } from 'react'
import { orderService } from '@/lib/order-service'
import { useStore } from '@/lib/store'
import { BoostOrderScreen } from './boost-order-screen'
import { OrderScreen } from './order-screen'

export function OrderRoute() {
  const { id } = useParams({ from: '/order/$id' })
  const { orders } = useStore()
  const order = useMemo(() => orders.find((o) => o.id === id) ?? null, [orders, id])

  if (order && orderService(order) === 'boost') return <BoostOrderScreen order={order} />
  return <OrderScreen />
}
