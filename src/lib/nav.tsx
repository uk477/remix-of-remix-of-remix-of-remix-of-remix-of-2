/**
 * Adapter that exposes the legacy `useNav()` API (`route`, `go`, `back`,
 * `canGoBack`, `param`) on top of TanStack Router. Screens keep calling
 * `go('cart')` / `go('accounts', 'blue_acc')` while URLs update properly and
 * back/forward, deep-links, refresh, and SEO all just work.
 */
import { useCallback, useMemo } from 'react'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'

export type Route =
  | 'home'
  | 'catalog'
  | 'accounts'
  | 'cart'
  | 'profile'
  | 'support'
  | 'about'
  | 'topup'
  | 'sell'
  | 'services'
  | 'history'
  | 'admin'
  | 'tools'

const ROUTE_TO_PATH: Record<Route, string> = {
  home: '/',
  catalog: '/catalog',
  accounts: '/accounts',
  cart: '/cart',
  profile: '/profile',
  support: '/support',
  about: '/about',
  topup: '/topup',
  sell: '/sell',
  services: '/services',
  history: '/history',
  admin: '/admin',
  tools: '/tools',
}

function pathToRoute(pathname: string): Route {
  const clean = pathname.replace(/\/+$/, '') || '/'
  for (const [route, path] of Object.entries(ROUTE_TO_PATH)) {
    if (path === clean) return route as Route
  }
  // Tool sub-pages still belong to the Tools tab.
  if (clean.startsWith('/tools/')) return 'tools'
  // fall back to home for unknown paths
  return 'home'
}

// Provider kept for API compatibility — it no longer stores anything.
export function NavProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

type Search = { cat?: string; edit?: string } & Record<string, unknown>

export function useNav() {
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const search = useRouterState({ select: (s) => s.location.search as Search })

  const route = pathToRoute(pathname)
  const param = typeof search?.cat === 'string' ? search.cat : null
  const editParam = typeof search?.edit === 'string' ? search.edit : null
  // We can't reliably introspect entry count on TanStack's memory history in
  // SSR — treat every non-home path as back-able (it either walks the router
  // history or lands on `/`).
  const canGoBack = route !== 'home'

  const go = useCallback(
    (next: Route, nextParam?: string, editKey?: string) => {
      const to = ROUTE_TO_PATH[next]
      void navigate({
        to,
        search: nextParam ? { cat: nextParam, ...(editKey ? { edit: editKey } : {}) } : {},
      })
    },
    [navigate],
  )

  const back = useCallback(() => {
    // `window.history.back()` silently does nothing when there is no prior
    // entry (deep-link, page reload, Telegram WebView first frame). Detect
    // that up-front and fall back to a sensible route instead of the button
    // appearing to "do nothing".
    let canGoBackNow = false
    try {
      const idx = (window.history.state as { __TSR_index?: number } | null)?.__TSR_index
      if (typeof idx === 'number') {
        canGoBackNow = idx > 0
      } else {
        // No TanStack index yet — treat >1 length as best-effort signal.
        canGoBackNow = window.history.length > 1
      }
    } catch {
      canGoBackNow = false
    }

    if (canGoBackNow) {
      try {
        router.history.back()
        return
      } catch {
        // fall through to fallback navigation
      }
    }

    // Fallback: land on the closest sensible parent.
    const fallback: string = route === 'home' ? '/' : '/'
    void navigate({ to: fallback })
  }, [router, navigate, route])


  return useMemo(
    () => ({ route, param, editParam, go, back, canGoBack, stack: [route] as Route[] }),
    [route, param, editParam, go, back, canGoBack],
  )
}
