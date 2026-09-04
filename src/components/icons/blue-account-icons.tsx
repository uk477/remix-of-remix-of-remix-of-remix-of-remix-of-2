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

/** Возраст: годовые кольца среза дерева — кольца расходятся волной */
export function IconAgeRings(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="12.4" r="8.4" fill="currentColor" fillOpacity=".08" />
      <circle className="ic-ring ic-ring-1" cx="11" cy="12.4" r="5.6" />
      <circle className="ic-ring ic-ring-2" cx="11" cy="12.4" r="3" />
      <circle className="ic-ring ic-ring-3" cx="11" cy="12.4" r="1.4" />
      <circle cx="11" cy="12.4" r=".8" fill="currentColor" stroke="none" />
      <path d="M17.6 15.4h4.2M17.6 18.4h2.6" strokeWidth="1.7" opacity=".8" />
    </svg>
  )
}

/** Выдача: колода профилей — верхняя карта тасуется */
export function IconPoolShuffle(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="2.4" y="8.6" width="8.8" height="11.6" rx="2.4" opacity=".35" />
      <rect x="5" y="6.6" width="8.8" height="11.6" rx="2.4" opacity=".58" />
      <g className="ic-shuffle">
        <g transform="rotate(14 16 11)">
          <rect x="11.6" y="4.4" width="9" height="12" rx="2.6" fill="currentColor" fillOpacity=".18" />
          <circle cx="16.1" cy="8.4" r="1.5" strokeWidth="1.5" />
          <path d="M13.4 13.4c.6-1.5 1.6-2.2 2.7-2.2s2.1.7 2.7 2.2" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  )
}

/** Почта: конверт — письмо выглядывает, прилетает уведомление */
export function IconMailVault(props: P) {
  return (
    <svg {...base} {...props}>
      <g className="ic-letter">
        <rect x="6.6" y="2.6" width="10.8" height="8.4" rx="1.6" fill="currentColor" fillOpacity=".18" />
        <path d="M9 5.6h6M9 8h3.6" strokeWidth="1.5" />
      </g>
      <path d="M2.8 9.2v8.4A2.6 2.6 0 0 0 5.4 20.2h13.2a2.6 2.6 0 0 0 2.6-2.6V9.2" />
      <path
        d="M2.8 9.2 12 15.1l9.2-5.9"
        fill="currentColor"
        fillOpacity=".1"
      />
      <path d="M2.8 9.2 9 13.2M21.2 9.2 15 13.2" opacity=".5" />
      <circle className="ic-ping" cx="19.4" cy="5" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Формат выдачи: клавиатура — клавиши нажимаются по очереди */
export function IconKey2FA(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="1.8" y="5.4" width="20.4" height="13.2" rx="2.8" fill="currentColor" fillOpacity=".07" />
      <g strokeWidth="1.3">
        <rect className="ic-key ic-key-1" x="4.1" y="8" width="3" height="2.6" rx=".8" />
        <rect x="8.1" y="8" width="3" height="2.6" rx=".8" opacity=".45" />
        <rect className="ic-key ic-key-3" x="12.1" y="8" width="3" height="2.6" rx=".8" />
        <rect x="16.1" y="8" width="3.8" height="2.6" rx=".8" opacity=".45" />
        <rect x="4.1" y="11.6" width="3.8" height="2.6" rx=".8" opacity=".45" />
        <rect className="ic-key ic-key-2" x="8.9" y="11.6" width="3" height="2.6" rx=".8" />
        <rect x="12.9" y="11.6" width="3" height="2.6" rx=".8" opacity=".45" />
        <rect className="ic-key ic-key-4" x="16.9" y="11.6" width="3" height="2.6" rx=".8" />
        <rect x="7.4" y="15.2" width="9.2" height="2.2" rx=".9" opacity=".55" />
      </g>
    </svg>
  )
}

/** Галочка: щит — галочка прорисовывается, стрелка продления вращается */
export function IconCheckRenew(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M11 2.9 18.4 5.3v5.4c0 4.1-2.9 7.4-7.4 8.8-4.4-1.4-7.4-4.7-7.4-8.8V5.3L11 2.9Z"
        fill="currentColor"
        fillOpacity=".12"
      />
      <path className="ic-draw" d="m7.8 10.7 2.2 2.3 4.1-4.5" strokeWidth="1.9" />
      <g className="ic-renew">
        <path d="M20.9 17.4a4.2 4.2 0 1 1-1.4-3.1" strokeWidth="1.6" />
        <path d="M19.8 11.4v2.9h-2.8" strokeWidth="1.6" />
      </g>
    </svg>
  )
}

/** Опт: коробка — партии карточек вылетают потоком */
export function IconBulkExport(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M2.6 9.4 10 6.4l7.4 3-7.4 3-7.4-3Z" fill="currentColor" fillOpacity=".16" />
      <path d="M2.6 9.4v6.6l7.4 3 7.4-3V9.4" />
      <path d="M10 12.4v6.6" opacity=".55" />
      <g className="ic-fly ic-fly-1">
        <rect x="15" y="2.6" width="6.4" height="4.4" rx="1.2" fill="currentColor" fillOpacity=".22" strokeWidth="1.3" />
      </g>
      <g className="ic-fly ic-fly-2">
        <rect x="15" y="2.6" width="6.4" height="4.4" rx="1.2" strokeWidth="1.3" />
      </g>
    </svg>
  )
}

/** Синяя галочка X — бейдж медленно вращается, галочка пульсирует */
export function IconBlueCheck(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        className="ic-spin-slow"
        d="M12 2.6l2.1 1.9 2.8-.4 1.2 2.6 2.6 1.2-.4 2.8L22 12l-1.7 2.1.4 2.8-2.6 1.2-1.2 2.6-2.8-.4L12 21.4l-2.1-1.7-2.8.4-1.2-2.6-2.6-1.2.4-2.8L2 12l1.7-2.1-.4-2.8 2.6-1.2 1.2-2.6 2.8.4L12 2.6Z"
        fill="currentColor"
        fillOpacity=".16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        className="ic-draw"
        d="m8.4 12.2 2.5 2.5 4.8-5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Гарантия 48 часов: щит с часами — стрелки идут по кругу */
export function IconWarrantyClock(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.9 20 5.6v6c0 4.5-3.2 8-8 9.5-4.8-1.5-8-5-8-9.5v-6L12 2.9Z" />
      <circle cx="12" cy="11.6" r="4.6" opacity=".45" strokeWidth="1.2" />
      <g className="ic-hand-hour">
        <path d="M12 11.6V8.9" strokeWidth="1.8" />
      </g>
      <g className="ic-hand-min">
        <path d="M12 11.6h3.1" strokeWidth="1.5" opacity=".8" />
      </g>
      <circle cx="12" cy="11.6" r=".8" fill="currentColor" stroke="none" />
    </svg>
  )
}
