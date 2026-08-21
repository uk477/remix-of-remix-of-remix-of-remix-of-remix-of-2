import { createFileRoute } from '@tanstack/react-router'
import { BoostOrderScreen } from '@/components/screens/boost-order-screen'
import type { Order } from '@/lib/types'

const mockOrder: Order = {
  id: 'test-cancelled-001',
  date: Date.now() - 1000 * 60 * 30,
  title: 'X Promotion — Cancelled test',
  amount: 5,
  status: 'cancelled',
  refillable: false,
  kind: 'boost',
  paid: true,
  qty: 100,
  orderRef: 'API-REF-123',
  serviceId: 'followers_default',
  target: 'https://x.com/test/status/123',
  cancelReason: 'Публикация недоступна',
  startFollowers: 1200,
}

export const Route = createFileRoute('/test-cancelled')({
  component: () => <BoostOrderScreen order={mockOrder} />,
})
