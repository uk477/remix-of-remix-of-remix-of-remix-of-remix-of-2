import { createFileRoute } from '@tanstack/react-router'
import { HomeScreen } from '@/components/screens/home-screen'

const TITLE = 'AureX Agency — Premium X Marketplace'
const DESC =
  'Boosting, aged, follower and verified X accounts — instant crypto checkout, 24/7 delivery.'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { property: 'og:url', content: '/' },
    ],
    links: [{ rel: 'canonical', href: '/' }],
  }),
  component: HomeScreen,
})
