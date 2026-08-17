/**
 * Real country flag rendered as a circular image via flagcdn (no emoji fallback issues).
 * Crisp on every platform including Telegram Desktop / Windows.
 */
export function Flag({
  country,
  className,
}: {
  country: string
  className?: string
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-border-strong ${className ?? 'size-9'}`}
    >
      <img
        src={`https://flagcdn.com/w160/${country}.png`}
        srcSet={`https://flagcdn.com/w320/${country}.png 2x`}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="size-full object-cover"
      />
    </span>
  )
}
