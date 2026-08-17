import { createFileRoute } from '@tanstack/react-router'
import { ProfileScreen } from '@/components/screens/profile-screen'

const TITLE = 'Profile — AureX Agency'
const DESC = 'Balance, promo codes, referrals and order history.'

export const Route = createFileRoute('/profile')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/profile' },
      { name: 'robots', content: 'noindex' },
    ],
    links: [{ rel: 'canonical', href: '/profile' }],
  }),
  component: ProfileScreen,
})
