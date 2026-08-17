import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CatalogScreen } from '@/components/screens/catalog-screen'

const searchSchema = z.object({ cat: z.string().optional(), edit: z.string().optional() })

const TITLE = 'Boost store — AureX Agency'
const DESC =
  'X boosting services: followers, likes, reposts and more. Priced per 1k, refills included.'

export const Route = createFileRoute('/catalog')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/catalog' },
    ],
    links: [{ rel: 'canonical', href: '/catalog' }],
  }),
  component: CatalogScreen,
})
