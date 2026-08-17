import { createFileRoute } from '@tanstack/react-router'
import { SupportScreen } from '@/components/screens/support-screen'

const TITLE = 'Support — AureX Agency'
const DESC = '24/7 support — talk to a manager any time.'

export const Route = createFileRoute('/support')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: '/support' },
    ],
    links: [{ rel: 'canonical', href: '/support' }],
  }),
  component: SupportScreen,
})
