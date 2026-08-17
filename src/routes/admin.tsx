import { createFileRoute } from '@tanstack/react-router'
import { AdminScreen } from '@/components/screens/admin-screen'

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Admin — AureX' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminScreen,
})
