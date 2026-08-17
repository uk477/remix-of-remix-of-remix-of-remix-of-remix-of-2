import { createFileRoute } from '@tanstack/react-router'
import { HistoryScreen } from '@/components/screens/history-screen'

const TITLE = 'History — AureX Agency'
const DESC = 'Your paid orders and top-ups.'

export const Route = createFileRoute('/history')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/history' },
      { name: 'robots', content: 'noindex' },
    ],
    links: [{ rel: 'canonical', href: '/history' }],
  }),
  component: HistoryScreen,
})
