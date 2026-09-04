import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Годовые кольца / история аккаунта */
export function IconAgeRings(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" opacity=".7" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" opacity=".55" />
    </svg>
  )
}

/** Закрытый пул — случайная выдача профиля */
export function IconPoolShuffle(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3.5" width="8" height="8" rx="2.4" />
      <rect x="13" y="12.5" width="8" height="8" rx="2.4" />
      <circle cx="7" cy="7.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="17" cy="16.5" r="1.15" fill="currentColor" stroke="none" />
      <path d="M13.5 7.5h4.2a2.3 2.3 0 0 1 2.3 2.3v1.4" opacity=".8" />
      <path d="M18.4 9.6 20 11.2l1.4-1.6" opacity=".8" />
      <path d="M10.5 16.5H6.3A2.3 2.3 0 0 1 4 14.2v-1.4" opacity=".8" />
    </svg>
  )
}

/** Почта в комплекте */
export function IconMailVault(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="m3.6 7.4 7.1 5.1a2.2 2.2 0 0 0 2.6 0l7.1-5.1" />
      <circle cx="18" cy="16" r="2.4" fill="currentColor" fillOpacity=".18" />
      <path d="M18 14.9v2.2" />
    </svg>
  )
}

/** Логин, пароль и 2FA */
export function IconKey2FA(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12.5 10 7a4.6 4.6 0 1 1 7 7l-5.5 5.5H8.5v-2.2H6.3v-2.2H4.5v-2.6Z" />
      <circle cx="15.2" cy="8.8" r="1.4" fill="currentColor" stroke="none" />
      <path d="M18.6 3.4v2.2M21 5.1l-1.9 1.1M16.2 5.1l1.9 1.1" opacity=".65" />
    </svg>
  )
}

/** Готов к продвижению */
export function IconBoostReady(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M13.6 3.6c3.5.6 6.2 3.3 6.8 6.8l-8 8-3.3-3.3 4.5-11.5Z" opacity=".9" />
      <path d="m9.1 15.1-3.3-3.3 7.8-8.2" opacity=".55" />
      <circle cx="14.6" cy="9.4" r="1.5" fill="currentColor" stroke="none" />
      <path d="M6.6 17.4c-1.3 1.3-1.6 4-1.6 4s2.7-.3 4-1.6a1.8 1.8 0 0 0-2.4-2.4Z" />
    </svg>
  )
}

/** Опт и выгрузка списком */
export function IconBulkExport(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="12.5" height="14" rx="2.4" />
      <path d="M6.2 8h6.1M6.2 11h6.1M6.2 14h3.6" opacity=".75" />
      <path d="M18.5 11v7.6" />
      <path d="m15.9 16.2 2.6 2.6 2.6-2.6" />
    </svg>
  )
}

/** Синяя галочка X */
export function IconBlueCheck(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2.6l2.1 1.9 2.8-.4 1.2 2.6 2.6 1.2-.4 2.8L22 12l-1.7 2.1.4 2.8-2.6 1.2-1.2 2.6-2.8-.4L12 21.4l-2.1-1.7-2.8.4-1.2-2.6-2.6-1.2.4-2.8L2 12l1.7-2.1-.4-2.8 2.6-1.2 1.2-2.6 2.8.4L12 2.6Z"
        fill="currentColor"
        fillOpacity=".16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="m8.4 12.2 2.5 2.5 4.8-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Гарантия 48 часов */
export function IconWarrantyClock(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.9 20 5.6v6c0 4.5-3.2 8-8 9.5-4.8-1.5-8-5-8-9.5v-6L12 2.9Z" />
      <path d="M12 8.4v3.9l2.6 1.6" strokeWidth="1.8" />
    </svg>
  )
}
