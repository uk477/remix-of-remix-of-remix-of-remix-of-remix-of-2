// Server-only helpers. Never import from client-reachable modules at module scope.
// Sends a Telegram message via the Lovable connector gateway. If the Telegram
// connector isn't linked yet, this logs the payload and returns { ok: false }
// so callers can keep their delivery/cleanup flow working.

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'

export type Lang = 'en' | 'ru' | 'uk' | 'ar' | 'zh' | 'es' | 'tr' | 'pt' | 'fr'

export function normalizeLang(input: string | null | undefined): Lang {
  const v = (input ?? '').toLowerCase().slice(0, 2)
  const allowed: Lang[] = ['en', 'ru', 'uk', 'ar', 'zh', 'es', 'tr', 'pt', 'fr']
  return (allowed as string[]).includes(v) ? (v as Lang) : 'en'
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY
  const tgKey = process.env.TELEGRAM_API_KEY
  if (!lovableKey || !tgKey) {
    console.log('[telegram:not-linked]', { chatId, textPreview: text.slice(0, 80) })
    return { ok: false, error: 'telegram_not_linked' }
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': tgKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[telegram:send-failed]', res.status, body)
      return { ok: false, error: `http_${res.status}` }
    }
    const json = (await res.json()) as { ok?: boolean; description?: string }
    if (!json.ok) {
      console.error('[telegram:api-error]', json.description)
      return { ok: false, error: json.description ?? 'api_error' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[telegram:exception]', e)
    return { ok: false, error: (e as Error).message }
  }
}

// ─── Copy: maintenance finished ───────────────────────────────────────
const MAINTENANCE_BACK: Record<Lang, string> = {
  en: 'AURX\n\nMaintenance is complete — the bot is fully back online.\nThanks for your patience. You can pick up right where you left off.',
  ru: 'AURX\n\nТехнические работы завершены — бот снова полностью в строю.\nСпасибо, что дождались. Можно возвращаться и продолжать там, где остановились.',
  uk: 'AURX\n\nТехнічні роботи завершено — бот знову повністю в строю.\nДякуємо, що зачекали. Можете повертатися й продовжувати з того місця, де зупинилися.',
  ar: 'AURX\n\nاكتملت أعمال الصيانة — البوت يعمل الآن بالكامل.\nشكرًا لصبرك. يمكنك المتابعة من حيث توقفت.',
  zh: 'AURX\n\n维护已完成——机器人已完全恢复运行。\n感谢您的耐心等待,您可以继续之前的操作了。',
  es: 'AURX\n\nEl mantenimiento ha terminado: el bot está completamente en línea de nuevo.\nGracias por tu paciencia. Puedes retomar donde lo dejaste.',
  tr: 'AURX\n\nBakım tamamlandı — bot yeniden tam olarak çalışıyor.\nSabrınız için teşekkürler. Kaldığınız yerden devam edebilirsiniz.',
  pt: 'AURX\n\nA manutenção terminou — o bot está totalmente online novamente.\nObrigado pela paciência. Você pode continuar de onde parou.',
  fr: 'AURX\n\nLa maintenance est terminée — le bot est de nouveau entièrement en ligne.\nMerci pour votre patience. Vous pouvez reprendre là où vous vous êtes arrêté.',
}

export function maintenanceBackText(lang: Lang): string {
  return MAINTENANCE_BACK[lang]
}

// ─── Copy: boost subcategory back online ──────────────────────────────
type Subcat = 'followers' | 'likes' | 'views' | 'reposts' | 'bookmarks'
type Region = '_all' | 'global' | 'jp' | 'kr' | 'us'

const SUBCAT_LABEL: Record<Subcat, Record<Lang, string>> = {
  followers: { en: 'Followers', ru: 'Фолловеры', uk: 'Фоловери', ar: 'المتابعون', zh: '粉丝', es: 'Seguidores', tr: 'Takipçiler', pt: 'Seguidores', fr: 'Abonnés' },
  likes:     { en: 'Likes',     ru: 'Лайки',     uk: 'Лайки',    ar: 'الإعجابات', zh: '点赞', es: 'Me gusta',   tr: 'Beğeniler', pt: 'Curtidas',   fr: 'J’aime'    },
  views:     { en: 'Views',     ru: 'Просмотры', uk: 'Перегляди', ar: 'المشاهدات', zh: '浏览量', es: 'Vistas',    tr: 'Görüntülenme', pt: 'Visualizações', fr: 'Vues'  },
  reposts:   { en: 'Reposts',   ru: 'Репосты',   uk: 'Репости',  ar: 'إعادة النشر', zh: '转发', es: 'Reposts',    tr: 'Repostlar',  pt: 'Reposts',    fr: 'Reposts'   },
  bookmarks: { en: 'Bookmarks', ru: 'Закладки',  uk: 'Закладки', ar: 'الإشارات المرجعية', zh: '收藏', es: 'Marcadores', tr: 'Yer imleri', pt: 'Marcadores', fr: 'Favoris' },
}

const REGION_LABEL: Record<Exclude<Region, '_all'>, Record<Lang, string>> = {
  global: { en: 'Global', ru: 'Global',  uk: 'Global', ar: 'عالمي', zh: '全球', es: 'Global', tr: 'Global',  pt: 'Global', fr: 'Global' },
  jp:     { en: 'Japan',  ru: 'Япония',  uk: 'Японія', ar: 'اليابان', zh: '日本', es: 'Japón',  tr: 'Japonya', pt: 'Japão',  fr: 'Japon'  },
  kr:     { en: 'Korea',  ru: 'Корея',   uk: 'Корея',  ar: 'كوريا',   zh: '韩国', es: 'Corea',  tr: 'Kore',    pt: 'Coreia', fr: 'Corée'  },
  us:     { en: 'USA',    ru: 'США',     uk: 'США',    ar: 'الولايات المتحدة', zh: '美国', es: 'EE. UU.', tr: 'ABD', pt: 'EUA', fr: 'États-Unis' },
}

const BOOST_BACK_TEMPLATE: Record<Lang, (label: string) => string> = {
  en: (l) => `AURX\n\nService is back online: ${l}.\nYou can resume boosting — the queue is accepting orders normally again.`,
  ru: (l) => `AURX\n\nСервис снова доступен: ${l}.\nМожно возвращаться и продолжать буст — очередь уже принимает заказы в штатном режиме.`,
  uk: (l) => `AURX\n\nСервіс знову доступний: ${l}.\nМожете продовжувати буст — черга вже приймає замовлення у штатному режимі.`,
  ar: (l) => `AURX\n\nعادت الخدمة للعمل: ${l}.\nيمكنك متابعة الطلبات — قائمة الانتظار تستقبل الطلبات بشكل طبيعي.`,
  zh: (l) => `AURX\n\n服务已恢复:${l}。\n您可以继续下单——队列已恢复正常处理。`,
  es: (l) => `AURX\n\nEl servicio vuelve a estar disponible: ${l}.\nPuedes retomar el boost: la cola vuelve a aceptar pedidos con normalidad.`,
  tr: (l) => `AURX\n\nHizmet tekrar aktif: ${l}.\nBoost işlemlerine devam edebilirsin — kuyruk siparişleri normal şekilde alıyor.`,
  pt: (l) => `AURX\n\nO serviço voltou a funcionar: ${l}.\nVocê já pode retomar o boost — a fila está aceitando pedidos normalmente.`,
  fr: (l) => `AURX\n\nLe service est de nouveau disponible : ${l}.\nVous pouvez reprendre le boost — la file accepte à nouveau les commandes normalement.`,
}

export function boostBackText(subcat: Subcat, region: Region, lang: Lang): string {
  const name = SUBCAT_LABEL[subcat][lang]
  const suffix = region !== '_all' ? ` · ${REGION_LABEL[region][lang]}` : ''
  return BOOST_BACK_TEMPLATE[lang](`${name}${suffix}`)
}
