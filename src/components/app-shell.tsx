import { Outlet, useRouterState } from '@tanstack/react-router'
import { useRef } from 'react'

import { useI18n } from '@/lib/i18n'
import { useMaintenance } from '@/lib/maintenance'
import { LanguageGate } from './language-gate'
import { BottomNav } from './bottom-nav'
import { TelegramInit } from './telegram-init'
import { BroadcastBanner } from './broadcast-banner'
import { MaintenanceScreen, MaintenanceStripe } from './maintenance-gate'
import { SwipeBack } from './swipe-back'

function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="bg-grid absolute inset-x-0 top-0 h-[420px]" />
      <div className="absolute -top-24 left-1/2 h-64 w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)]" />
    </div>
  )
}

export function AppShell() {
  const { ready, needsLangSelect, dir } = useI18n()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const showNav = pathname === '/' || pathname === '/profile'
  const isOrderDetails = pathname.startsWith('/order/')
  const { blocked, resolving, previewClosed } = useMaintenance()
  const showClosed = blocked || previewClosed
  const mainRef = useRef<HTMLElement | null>(null)


  if (!ready || resolving) {
    return (
      <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading" />
    )
  }

  if (needsLangSelect) {
    return (
      <>
        <TelegramInit />
        <LanguageGate />
      </>
    )
  }

  if (showClosed) {
    return (
      <>
        <TelegramInit />
        <div dir={dir} className="mx-auto h-[100dvh] w-full max-w-[480px]">
          <MaintenanceScreen />
        </div>
      </>
    )
  }

  return (
    <>
      <TelegramInit />
      <BroadcastBanner />
      <div
        dir={dir}
        className={`relative mx-auto h-[100dvh] w-full overflow-hidden ${isOrderDetails ? 'max-w-[1280px]' : 'max-w-[480px]'}`}
      >
        <AppBackground />
        <MaintenanceStripe />
        <main
          ref={mainRef}
          className="h-full overflow-y-auto"
          style={{
            paddingBottom: showNav
              ? 'calc(env(safe-area-inset-bottom) + 4.5rem)'
              : 'env(safe-area-inset-bottom)',
          }}
        >
          <Outlet />
        </main>
        <SwipeBack contentRef={mainRef} />
        {showNav && <BottomNav />}
      </div>
    </>
  )
}


