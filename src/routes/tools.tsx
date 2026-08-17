import { createFileRoute, Outlet } from '@tanstack/react-router'

const TITLE = 'Tools — AureX Agency'
const DESC = 'Free browser tools: get codes from Hotmail/Outlook email and generate live 2FA/TOTP codes.'

export const Route = createFileRoute('/tools')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: '/tools' }],
  }),
  component: () => <Outlet />,
})
