import { createFileRoute } from '@tanstack/react-router'
import { MailToolScreen } from '@/components/screens/tools-screen'

const TITLE = 'Mail Reader — Get code from email — AureX Agency'
const DESC = 'Read Hotmail & Outlook emails instantly. Paste refresh token and client ID to fetch inbox or junk mail.'

export const Route = createFileRoute('/tools/mail')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: '/tools/mail' }],
  }),
  component: MailToolScreen,
})
