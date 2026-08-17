/**
 * Visual preview of the buyer's uploaded avatar + banner for a custom
 * ("под ключ") order. The brief stores them as data URLs, so the admin needs
 * to actually *see* them, not just a link — this renders the X-style header.
 */
import { Download } from 'lucide-react'

const clean = (v?: string) => (v && v !== '—' && v.trim() !== '' ? v.trim() : '')

export function SpecMedia({ spec }: { spec: Record<string, string> }) {
  const avatar = clean(spec['profile_avatar_url'])
  const banner = clean(spec['profile_banner_url'])
  if (!avatar && !banner) return null

  return (
    <div className="mb-2.5 overflow-hidden rounded-xl border border-border bg-background/40">
      <div className="relative h-[86px] w-full bg-muted/40">
        {banner ? (
          <img src={banner} alt="Баннер покупателя" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            баннер не загружен
          </div>
        )}
        <div className="absolute -bottom-6 left-3 size-[58px] overflow-hidden rounded-full border-[3px] border-card bg-muted">
          {avatar ? (
            <img src={avatar} alt="Аватар покупателя" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[8px] uppercase tracking-wider text-muted-foreground">
              нет
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-3 pb-2.5 pt-8">
        {avatar && <MediaBtn href={avatar} name="avatar" label="Аватар" />}
        {banner && <MediaBtn href={banner} name="banner" label="Баннер" />}
      </div>
    </div>
  )
}

function MediaBtn({ href, name, label }: { href: string; name: string; label: string }) {
  const ext = /image\/(\w+)/.exec(href)?.[1] ?? 'jpg'
  return (
    <a
      href={href}
      download={`${name}.${ext}`}
      className="flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      <Download className="size-3" strokeWidth={2.2} />
      {label}
    </a>
  )
}
