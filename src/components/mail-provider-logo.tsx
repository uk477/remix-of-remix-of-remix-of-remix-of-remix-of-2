'use client'

/* Настоящие бренд-логотипы почтовых сервисов (локальные ассеты, без внешних запросов).
 * Используется только в услуге custom (аккаунт под ключ). */

import firstmailLogo from '@/assets/mail/firstmail.png'
import gmailLogo from '@/assets/mail/gmail.svg'
import outlookLogo from '@/assets/mail/outlook.svg'
import type { MailProvider } from '@/lib/order-delivery'

const SRC: Record<MailProvider, string> = {
  firstmail: firstmailLogo,
  gmail: gmailLogo,
  outlook: outlookLogo,
}

const NAME: Record<MailProvider, string> = {
  firstmail: 'FirstMail',
  gmail: 'Gmail',
  outlook: 'Outlook',
}

const TINT: Record<MailProvider, { glow: string; ring: string; wash: string }> = {
  firstmail: {
    glow: '0 0 18px rgba(32,178,150,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
    ring: 'rgba(32,178,150,0.45)',
    wash: 'radial-gradient(120% 120% at 30% 0%, rgba(32,178,150,0.22), transparent 70%)',
  },
  gmail: {
    glow: '0 0 18px rgba(234,67,53,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
    ring: 'rgba(234,67,53,0.4)',
    wash: 'radial-gradient(120% 120% at 30% 0%, rgba(234,67,53,0.18), transparent 70%)',
  },
  outlook: {
    glow: '0 0 18px rgba(0,120,212,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
    ring: 'rgba(0,120,212,0.42)',
    wash: 'radial-gradient(120% 120% at 30% 0%, rgba(0,120,212,0.2), transparent 70%)',
  },
}

/** Логотип в тёмной squircle-плитке с брендовым свечением. */
export function MailProviderLogo({
  provider,
  className = 'size-10',
  bare = false,
}: {
  provider: MailProvider | null
  className?: string
  /** true — только картинка, без плитки */
  bare?: boolean
}) {
  if (!provider) return null
  const t = TINT[provider]
  const img = (
    <img
      src={SRC[provider]}
      alt={`${NAME[provider]} logo`}
      className={bare ? `${className} object-contain` : 'size-[58%] object-contain'}
      draggable={false}
    />
  )
  if (bare) return img
  return (
    <span
      className={`${className} relative grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-[#0e1113]`}
      style={{ boxShadow: t.glow, border: `1px solid ${t.ring}` }}
    >
      <span className="pointer-events-none absolute inset-0" style={{ background: t.wash }} />
      <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/25" />
      {img}
    </span>
  )
}
