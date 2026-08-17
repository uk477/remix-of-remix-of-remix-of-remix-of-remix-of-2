import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AccountsScreen } from '@/components/screens/accounts-screen'

const searchSchema = z.object({ cat: z.string().optional() })

const TITLE = 'X accounts — AureX Agency'
const DESC =
  'Aged, follower, blue and gold verified X accounts. Filter by year, followers, verification.'

export const Route = createFileRoute('/accounts')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/accounts' },
    ],
    links: [{ rel: 'canonical', href: '/accounts' }],
  }),
  component: AccountsScreen,
})
