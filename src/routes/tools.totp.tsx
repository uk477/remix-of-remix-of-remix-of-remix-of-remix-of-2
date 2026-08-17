import { createFileRoute } from '@tanstack/react-router'
import { TotpToolScreen } from '@/components/screens/tools-screen'

const TITLE = '2FA Code Generator — Get 2FA code — AureX Agency'
const DESC = 'Generate a live TOTP/2FA code from your secret key. All processing runs locally in your browser.'

export const Route = createFileRoute('/tools/totp')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: '/tools/totp' }],
  }),
  component: TotpToolScreen,
})
