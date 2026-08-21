import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getRefillState, requestRefill, type RefillServerState } from './refill.functions'

/**
 * Единая state machine рефилла для ОДНОГО конкретного заказа.
 * Все таймстампы приходят с сервера; локально хранится только смещение часов.
 */
export type RefillPhase =
  | 'loading'
  | 'not_completed'
  | 'submitting'
  | 'accepted'
  | 'limit_exhausted'
  | 'guarantee_expired'
  | 'cooldown'
  | 'available'
  | 'error'

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null)

export function formatCountdown(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function useRefill(orderId: string) {
  const fetchState = useServerFn(getRefillState)
  const submit = useServerFn(requestRefill)

  const [state, setState] = useState<RefillServerState | null>(null)
  // Локальный оверрайд поверх серверного состояния (только на время запроса).
  const [phase, setPhase] = useState<null | 'submitting' | 'accepted' | 'error'>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Разница между серверным и локальным временем — таймер идёт по серверу.
  const skewRef = useRef(0)
  const inFlight = useRef(false)
  const acceptedTimer = useRef<number | null>(null)
  const tokenRef = useRef<string | null>(null)

  const now = () => Date.now() + skewRef.current

  const load = useCallback(async () => {
    try {
      const next = await fetchState({ data: { orderId } })
      const server = ms(next.serverNow)
      if (server) skewRef.current = server - Date.now()
      setState(next)
      setError(null)
      return next
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
      setPhase('error')
      return null
    }
  }, [fetchState, orderId])

  // Загрузка при монтировании и смене заказа — таймер и лимит переживают reload.
  useEffect(() => {
    setState(null)
    setPhase(null)
    void load()
  }, [load])

  // Возврат в приложение — пересчитать состояние с сервера.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [load])

  // Секундный тик только когда идёт отсчёт.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => () => {
    if (acceptedTimer.current) window.clearTimeout(acceptedTimer.current)
  }, [])

  const endsAt = ms(state?.guaranteeEndsAt)
  const nextAt = ms(state?.nextRefillAt)
  const used = state?.usedRefills ?? 0
  const max = state?.maxRefills ?? 4
  const remaining = Math.max(0, max - used)
  const cooldownLeft = nextAt ? Math.max(0, nextAt - now()) : 0

  // Приоритет состояний:
  // not_completed → submitting → limit_exhausted → guarantee_expired → cooldown → available
  const derived: RefillPhase =
    phase != null
      ? phase
      : !state
          ? 'loading'
          : !state.guaranteeStartedAt
            ? 'not_completed'
            : remaining <= 0
              ? 'limit_exhausted'
              : endsAt != null && now() >= endsAt
                ? 'guarantee_expired'
                : cooldownLeft > 0
                  ? 'cooldown'
                  : 'available'

  // При 00:00:00 сначала перепроверяем состояние на сервере.
  const revalidating = useRef(false)
  useEffect(() => {
    if (derived !== 'cooldown' || cooldownLeft > 0 || revalidating.current) return
    revalidating.current = true
    void load().finally(() => {
      revalidating.current = false
    })
  }, [derived, cooldownLeft, load, tick])

  const request = useCallback(async () => {
    if (inFlight.current) return
    if (derived !== 'available' && derived !== 'error') return
    inFlight.current = true
    setPhase('submitting')
    // Один ключ идемпотентности на попытку — двойной клик не создаёт два рефилла.
    tokenRef.current = tokenRef.current ?? crypto.randomUUID()
    try {
      const next = await submit({
        data: { orderId, idempotencyKey: tokenRef.current },
      })
      const server = ms(next.serverNow)
      if (server) skewRef.current = server - Date.now()
      setState(next)
      tokenRef.current = null
      setPhase('accepted')
      acceptedTimer.current = window.setTimeout(() => setPhase(null), 1000)
      return true
    } catch (e) {
      // Запрос не принят — лимит не уменьшаем, cooldown не запускаем.
      tokenRef.current = null
      setError(e instanceof Error ? e.message : 'error')
      setPhase('error')
      await load()
      return false
    } finally {
      inFlight.current = false
    }
  }, [derived, load, orderId, submit])

  const retry = useCallback(async () => {
    setPhase(null)
    setError(null)
    await load()
  }, [load])

  return {
    phase: derived,
    state,
    used,
    max,
    remaining,
    cooldownLeft,
    countdown: formatCountdown(cooldownLeft),
    guaranteeEndsAt: endsAt,
    error,
    request,
    retry,
    reload: load,
  }
}
