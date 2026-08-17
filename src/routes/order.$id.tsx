import { createFileRoute } from '@tanstack/react-router'
import { OrderRoute } from '@/components/screens/order-route'

const TITLE = 'Order details — AureX Agency'
const DESC = 'Your delivered accounts, credentials, format and export options.'

export const Route = createFileRoute('/order/$id')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: OrderRoute,
})