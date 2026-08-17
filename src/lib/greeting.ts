// Time-of-day greeting resolved from the language's dominant timezone.
// Example: ru -> Europe/Moscow, zh -> Asia/Shanghai.

export type DayPart = 'morning' | 'day' | 'evening' | 'night'

const LANG_TZ: Record<string, string> = {
  en: 'America/New_York',
  ru: 'Europe/Moscow',
  uk: 'Europe/Kyiv',
  ar: 'Asia/Riyadh',
  zh: 'Asia/Shanghai',
  es: 'Europe/Madrid',
  tr: 'Europe/Istanbul',
  pt: 'America/Sao_Paulo',
  fr: 'Europe/Paris',
}

export function hourInLang(lang: string, now: Date = new Date()): number {
  const tz = LANG_TZ[lang] ?? 'UTC'
  try {
    const s = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(now)
    const h = Number(s.slice(0, 2))
    return Number.isFinite(h) ? h % 24 : now.getHours()
  } catch {
    return now.getHours()
  }
}

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'day'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

const GREETINGS: Record<DayPart, Record<string, string>> = {
  morning: {
    en: 'Good morning',
    ru: 'Доброе утро',
    uk: 'Доброго ранку',
    ar: 'صباح الخير',
    zh: '早上好',
    es: 'Buenos días',
    tr: 'Günaydın',
    pt: 'Bom dia',
    fr: 'Bonjour',
  },
  day: {
    en: 'Good afternoon',
    ru: 'Хорошего дня',
    uk: 'Гарного дня',
    ar: 'طاب يومك',
    zh: '下午好',
    es: 'Buenas tardes',
    tr: 'İyi günler',
    pt: 'Boa tarde',
    fr: 'Bon après-midi',
  },
  evening: {
    en: 'Good evening',
    ru: 'Добрый вечер',
    uk: 'Добрий вечір',
    ar: 'مساء الخير',
    zh: '晚上好',
    es: 'Buenas noches',
    tr: 'İyi akşamlar',
    pt: 'Boa noite',
    fr: 'Bonsoir',
  },
  night: {
    en: 'Good night',
    ru: 'Доброй ночи',
    uk: 'Доброї ночі',
    ar: 'تصبح على خير',
    zh: '夜深了',
    es: 'Buenas noches',
    tr: 'İyi geceler',
    pt: 'Boa madrugada',
    fr: 'Bonne nuit',
  },
}

/** "Хорошего дня, Aurex!" */
export function greetingFor(lang: string, name: string, now: Date = new Date()): string {
  const part = dayPart(hourInLang(lang, now))
  const table = GREETINGS[part]
  const phrase = table[lang] ?? table.en
  const safeName = (name || '').trim()
  if (!safeName) return `${phrase}!`
  if (lang === 'zh') return `${phrase}，${safeName}！`
  if (lang === 'ar') return `${phrase}، ${safeName}!`
  if (lang === 'fr' || lang === 'es') return `${phrase}, ${safeName} !`.replace(' !', ' !')
  return `${phrase}, ${safeName}!`
}

/** Only the phrase, without the name: "Добрый вечер" */
export function greetingPhrase(lang: string, now: Date = new Date()): string {
  const table = GREETINGS[dayPart(hourInLang(lang, now))]
  return table[lang] ?? table.en
}


export function dayPartFor(lang: string, now: Date = new Date()): DayPart {
  return dayPart(hourInLang(lang, now))
}
