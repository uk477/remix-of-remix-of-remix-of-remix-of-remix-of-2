import { createFileRoute } from '@tanstack/react-router'
import { TopupScreen } from '@/components/screens/topup-screen'

const TITLE = 'Top up balance — AureX Agency'
const DESC = 'Top up your AureX balance with USDT, BTC, ETH, SOL, GRAM and more.'

export const Route = createFileRoute('/topup')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/topup' },
      { name: 'robots', content: 'noindex' },
    ],
    links: [{ rel: 'canonical', href: '/topup' }],
  }),
  component: TopupScreen,
})
