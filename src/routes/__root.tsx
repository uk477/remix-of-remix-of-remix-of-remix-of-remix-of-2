import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  ScriptOnce,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/700-italic.css'
import '@fontsource/playfair-display/700.css'
import appCss from '../styles.css?url'
import { AppShell } from '@/components/app-shell'
import { ToastProvider } from '@/components/toast'
import { I18nProvider } from '@/lib/i18n'
import { NavProvider } from '@/lib/nav'
import { StoreProvider } from '@/lib/store'
import { AuthProvider } from '@/lib/auth'
import { MaintenanceProvider } from '@/lib/maintenance'
import { PricingProvider } from '@/lib/pricing'
import { reportLovableError } from '../lib/lovable-error-reporting'

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error)
  const router = useRouter()
  useEffect(() => {
    reportLovableError(error, { boundary: 'tanstack_root_error_component' })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate()
              reset()
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}

const SITE_TITLE = 'AureX Agency — Premium X Marketplace'
const SITE_DESC =
  'AureX Agency — a premium marketplace for X growth: boosting, aged accounts, followers and verified accounts. Instant crypto checkout.'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1',
      },
      { name: 'theme-color', content: '#000000' },
      { name: 'color-scheme', content: 'dark' },
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESC },
      { name: 'author', content: 'AureX Agency' },
      { property: 'og:site_name', content: 'AureX Agency' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: SITE_TITLE },
      { property: 'og:description', content: SITE_DESC },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESC },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Bebas+Neue&family=Barlow:wght@400;600;700&display=swap',
      },

    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'AureX Agency',
          url: '/',
          logo: '/aurx-logo.png',
          sameAs: [],
        }),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'AureX Agency',
          url: '/',
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
})

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <ScriptOnce>
          {`try{var l=localStorage.getItem('xboost_lang');var langs=['en','ru','ar','zh','es','tr','pt','fr','uk'];if(langs.indexOf(l)!==-1){document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr'}}catch(e){}`}
        </ScriptOnce>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <MaintenanceProvider>
            <PricingProvider>
              <StoreProvider>
                <NavProvider>
                  <ToastProvider>
                    <AppShell />
                  </ToastProvider>
                </NavProvider>
              </StoreProvider>
            </PricingProvider>
          </MaintenanceProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
