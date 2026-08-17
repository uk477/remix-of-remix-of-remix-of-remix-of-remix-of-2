import { createFileRoute } from '@tanstack/react-router'
import { AboutScreen } from '@/components/screens/about-screen'

const TITLE = 'About AureX Agency'
const DESC =
  'AureX is the premium marketplace for X — channels, contacts, guarantees and rules.'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/about' },
    ],
    links: [{ rel: 'canonical', href: '/about' }],
  }),
  component: AboutScreen,
})
