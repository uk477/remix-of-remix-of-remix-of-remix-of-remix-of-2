import { createFileRoute } from '@tanstack/react-router'
import { CartScreen } from '@/components/screens/cart-screen'

const TITLE = 'Cart — AureX Agency'
const DESC = 'Review and check out with crypto or balance.'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/cart' },
      { name: 'robots', content: 'noindex' },
    ],
    links: [{ rel: 'canonical', href: '/cart' }],
  }),
  component: CartScreen,
})
