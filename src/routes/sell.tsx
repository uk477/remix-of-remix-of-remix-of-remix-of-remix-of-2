import { createFileRoute } from '@tanstack/react-router'
import { SellScreen } from '@/components/screens/sell-screen'

const TITLE = 'Sell your X account — AureX Agency'
const DESC = 'Sell your X account with AureX — best market rate, instant crypto payout.'

export const Route = createFileRoute('/sell')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/sell' },
    ],
    links: [{ rel: 'canonical', href: '/sell' }],
  }),
  component: SellScreen,
})
