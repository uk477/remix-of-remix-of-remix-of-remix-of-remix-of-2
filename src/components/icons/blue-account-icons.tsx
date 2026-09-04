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

/** Возраст: годовые кольца среза дерева с меткой года */
export function IconAgeRings(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="12.4" r="8.4" fill="currentColor" fillOpacity=".08" />
      <circle cx="11" cy="12.4" r="5.6" opacity=".75" />
      <circle cx="11" cy="12.4" r="3" opacity=".55" />
      <circle cx="11" cy="12.4" r="1" fill="currentColor" stroke="none" />
      <path d="M11 4v-1.6M16.9 6.5 18 5.4M5.1 6.5 4 5.4" opacity=".45" />
      <path d="M17.6 15.4h4.2M17.6 18.4h2.6" strokeWidth="1.7" opacity=".8" />
    </svg>
  )
}

/** Выдача: закрытая колода профилей, карта вылетает наугад */
export function IconPoolShuffle(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="2.4" y="8.6" width="8.8" height="11.6" rx="2.4" opacity=".38" />
      <rect x="5" y="6.6" width="8.8" height="11.6" rx="2.4" opacity=".62" />
      <g transform="rotate(14 16 11)">
        <rect x="11.6" y="4.4" width="9" height="12" rx="2.6" fill="currentColor" fillOpacity=".16" />
        <path d="M14 8.2h4.2M14 10.6h2.6" strokeWidth="1.6" />
        <path d="M14 13.2h4.2" opacity=".5" />
      </g>
      <path d="M4.6 21.6c1.6-1 3-1.4 4.4-1.3" opacity=".45" />
    </svg>
  )
}

/** Почта: конверт, из которого выпадает карточка доступа */
export function IconMailVault(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M2.6 9.6 11 4.2a2 2 0 0 1 2.1 0l8.3 5.4" />
      <path d="M2.6 9.6v8.2A2.6 2.6 0 0 0 5.2 20.4h13.6a2.6 2.6 0 0 0 2.6-2.6V9.6" />
      <path d="m2.6 9.6 8.4 5.2a2 2 0 0 0 2 0l8.4-5.2" fill="currentColor" fillOpacity=".12" />
      <rect x="7.4" y="6.6" width="9.2" height="6" rx="1.6" fill="currentColor" fillOpacity=".2" />
      <path d="M9.6 9h4.8M9.6 11h2.8" strokeWidth="1.5" />
    </svg>
  )
}

/** Формат выдачи: строка данных, разделённая двоеточиями */
export function IconKey2FA(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="2.4" y="5.6" width="19.2" height="12.8" rx="3" fill="currentColor" fillOpacity=".08" />
      <path d="M5.4 9.6h3.2M11.4 9.6h2.6M16.4 9.6h2.2" strokeWidth="1.8" />
      <path d="M5.4 14.4h2.2M10.4 14.4h3.4M16.4 14.4h2.2" strokeWidth="1.8" opacity=".55" />
      <circle cx="9.9" cy="9.6" r=".55" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="9.6" r=".55" fill="currentColor" stroke="none" />
      <circle cx="8.9" cy="14.4" r=".55" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="14.4" r=".55" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Галочка: бейдж на 30 дней со стрелкой продления */
export function IconCheckRenew(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M11 2.9 18.4 5.3v5.4c0 4.1-2.9 7.4-7.4 8.8-4.4-1.4-7.4-4.7-7.4-8.8V5.3L11 2.9Z"
        fill="currentColor"
        fillOpacity=".12"
      />
      <path d="m8 10.6 2.1 2.2 4-4.3" strokeWidth="1.9" />
      <path d="M15.2 19.4a4.4 4.4 0 1 0-1.5-3" strokeWidth="1.6" opacity=".85" />
      <path d="M13.2 13.6v2.9h2.7" strokeWidth="1.6" opacity=".85" />
    </svg>
  )
}

/** Опт: партия карточек, уходящая коробкой */
export function IconBulkExport(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M2.6 7.4 12 3.6l9.4 3.8-9.4 3.8L2.6 7.4Z" fill="currentColor" fillOpacity=".16" />
      <path d="M2.6 7.4v8.4L12 19.8l9.4-4V7.4" />
      <path d="M12 11.2v8.6" opacity=".6" />
      <path d="M6.4 9.6v4.2" opacity=".4" />
      <path d="M17.4 9.6v4.2" opacity=".4" />
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
