import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ServicesScreen } from '@/components/screens/services-screen'

const searchSchema = z.object({ cat: z.string().optional(), edit: z.string().optional() })

const TITLE = 'Other X services — AureX Agency'
const DESC = 'Extra services for X: management, campaigns, custom integrations.'

export const Route = createFileRoute('/services')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/services' },
    ],
    links: [{ rel: 'canonical', href: '/services' }],
  }),
  component: ServicesScreen,
})
