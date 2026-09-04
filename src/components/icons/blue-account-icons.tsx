import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Возраст: календарная лента лет с отметкой */
export function IconAgeRings(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9.2h18" opacity=".55" />
      <rect x="3" y="4.6" width="18" height="15" rx="3.2" />
      <path d="M7.6 2.9v3.2M16.4 2.9v3.2" />
      <rect x="6" y="11.6" width="4.6" height="4.6" rx="1.4" fill="currentColor" fillOpacity=".22" stroke="none" />
      <path d="M6.9 14 8 15.1l2.1-2.3" strokeWidth="1.7" />
      <path d="M13.6 12.8h4.6M13.6 15.6h3" opacity=".5" />
    </svg>
  )
}

/** Пул: три карточки профиля, одна вытянута случайно */
export function IconPoolShuffle(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="2.6" y="7.4" width="9.4" height="12" rx="2.6" opacity=".45" />
      <rect x="5.6" y="5.6" width="9.4" height="12" rx="2.6" opacity=".7" />
      <rect x="9.4" y="3.6" width="11.6" height="13" rx="2.8" fill="currentColor" fillOpacity=".14" />
      <circle cx="15.2" cy="8.4" r="1.9" />
      <path d="M12.3 14.1c.5-1.8 1.6-2.7 2.9-2.7s2.4.9 2.9 2.7" />
      <path d="m17.9 19.4 2.6 1.1-1-2.7" opacity=".7" />
    </svg>
  )
}

/** Почта: конверт с ключом доступа */
export function IconMailVault(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.2A3.2 3.2 0 0 1 6.2 5h11.6A3.2 3.2 0 0 1 21 8.2v4.1" />
      <path d="M3 8.6v7.2A3.2 3.2 0 0 0 6.2 19h6.4" />
      <path d="m3.8 7.6 6.6 4.7a2.6 2.6 0 0 0 3.1 0l6.7-4.7" fill="currentColor" fillOpacity=".12" />
      <circle cx="17.6" cy="16.6" r="2.1" fill="currentColor" fillOpacity=".2" />
      <path d="M19.2 18.1 21.4 20.4" strokeWidth="1.7" />
    </svg>
  )
}

/** Доступ: щит с ключом и 2FA-кодом */
export function IconKey2FA(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.8 19.6 5.4v5.6c0 4.3-3 7.7-7.6 9.2-4.6-1.5-7.6-4.9-7.6-9.2V5.4L12 2.8Z" fill="currentColor" fillOpacity=".1" />
      <circle cx="12" cy="10.2" r="2.2" />
      <path d="M12 12.4v4.1M12 15.1h1.9" strokeWidth="1.7" />
      <path d="M9.2 6.4h5.6" opacity=".5" />
    </svg>
  )
}

/** Галочка: бейдж с циклом продления */
export function IconCheckRenew(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 3.4a3 3 0 0 1 2.4 1.1 3 3 0 0 1 2.6.8 3 3 0 0 1 .8 2.6A3 3 0 0 1 19 10.3a3 3 0 0 1-1.2 2.4 3 3 0 0 1-.8 2.6 3 3 0 0 1-2.6.8A3 3 0 0 1 12 17.2a3 3 0 0 1-2.4-1.1 3 3 0 0 1-2.6-.8 3 3 0 0 1-.8-2.6A3 3 0 0 1 5 10.3a3 3 0 0 1 1.2-2.4 3 3 0 0 1 .8-2.6 3 3 0 0 1 2.6-.8A3 3 0 0 1 12 3.4Z"
        fill="currentColor"
        fillOpacity=".14"
      />
      <path d="m9.6 10.4 1.8 1.8 3.3-3.6" strokeWidth="1.8" />
      <path d="M6.4 19.4a7.4 7.4 0 0 0 11.2 0" opacity=".65" />
      <path d="m5.4 17 .8 2.5 2.4-.6" opacity=".65" />
    </svg>
  )
}

/** Опт: таблица со стрелкой выгрузки */
export function IconBulkExport(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="2.8" y="4.2" width="13.4" height="13.4" rx="2.6" />
      <path d="M2.8 8.4h13.4" opacity=".7" />
      <path d="M7.6 8.4v9.2" opacity=".5" />
      <rect x="2.8" y="4.2" width="13.4" height="4.2" rx="2.2" fill="currentColor" fillOpacity=".18" stroke="none" />
      <path d="M19 12.4v7.4" strokeWidth="1.7" />
      <path d="m16.4 17.4 2.6 2.6 2.6-2.6" strokeWidth="1.7" />
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
