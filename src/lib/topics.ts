import {
  Bitcoin, Sparkles, Flame, Gamepad2, Landmark, Briefcase, Coffee, Laugh,
  Crown, Trophy, Shirt, Music, Plane, Pizza, Car, Newspaper, Cat, Palette,
  type LucideIcon,
} from 'lucide-react'

export type TopicId =
  | 'crypto' | 'ai' | 'nsfw' | 'gaming' | 'finance' | 'business'
  | 'lifestyle' | 'meme' | 'luxury' | 'sports' | 'fashion' | 'music'
  | 'travel' | 'food' | 'cars' | 'news' | 'anime' | 'art'

export type TopicMeta = {
  id: TopicId
  label: { en: string; ru: string }
  Icon: LucideIcon
  accent: string
  glow: string
}

export const TOPICS: Record<TopicId, TopicMeta> = {
  crypto:    { id: 'crypto',    label: { en: 'Crypto',    ru: 'Крипто'     }, Icon: Bitcoin,   accent: 'oklch(0.80 0.17 60)',  glow: 'oklch(0.80 0.17 60 / 0.28)' },
  ai:        { id: 'ai',        label: { en: 'AI',        ru: 'ИИ'         }, Icon: Sparkles,  accent: 'oklch(0.78 0.18 295)', glow: 'oklch(0.78 0.18 295 / 0.28)' },
  nsfw:      { id: 'nsfw',      label: { en: 'NSFW / 18+', ru: 'NSFW / 18+' }, Icon: Flame,     accent: 'oklch(0.72 0.22 12)',  glow: 'oklch(0.72 0.22 12 / 0.30)' },
  gaming:    { id: 'gaming',    label: { en: 'Gaming',    ru: 'Игры'       }, Icon: Gamepad2,  accent: 'oklch(0.80 0.18 148)', glow: 'oklch(0.80 0.18 148 / 0.28)' },
  finance:   { id: 'finance',   label: { en: 'Finance',   ru: 'Финансы'    }, Icon: Landmark,  accent: 'oklch(0.82 0.14 190)', glow: 'oklch(0.82 0.14 190 / 0.28)' },
  business:  { id: 'business',  label: { en: 'Business',  ru: 'Бизнес'     }, Icon: Briefcase, accent: 'oklch(0.76 0.12 240)', glow: 'oklch(0.76 0.12 240 / 0.28)' },
  lifestyle: { id: 'lifestyle', label: { en: 'Lifestyle', ru: 'Лайфстайл'  }, Icon: Coffee,    accent: 'oklch(0.82 0.11 40)',  glow: 'oklch(0.82 0.11 40 / 0.26)' },
  meme:      { id: 'meme',      label: { en: 'Memes',     ru: 'Мемы'       }, Icon: Laugh,     accent: 'oklch(0.88 0.17 100)', glow: 'oklch(0.88 0.17 100 / 0.28)' },
  luxury:    { id: 'luxury',    label: { en: 'Luxury',    ru: 'Люкс'       }, Icon: Crown,     accent: 'oklch(0.86 0.14 88)',  glow: 'oklch(0.86 0.14 88 / 0.30)' },
  sports:    { id: 'sports',    label: { en: 'Sports',    ru: 'Спорт'      }, Icon: Trophy,    accent: 'oklch(0.78 0.17 30)',  glow: 'oklch(0.78 0.17 30 / 0.28)' },
  fashion:   { id: 'fashion',   label: { en: 'Fashion',   ru: 'Мода'       }, Icon: Shirt,     accent: 'oklch(0.82 0.12 340)', glow: 'oklch(0.82 0.12 340 / 0.26)' },
  music:     { id: 'music',     label: { en: 'Music',     ru: 'Музыка'     }, Icon: Music,     accent: 'oklch(0.76 0.18 320)', glow: 'oklch(0.76 0.18 320 / 0.28)' },
  travel:    { id: 'travel',    label: { en: 'Travel',    ru: 'Тревел'     }, Icon: Plane,     accent: 'oklch(0.80 0.14 220)', glow: 'oklch(0.80 0.14 220 / 0.28)' },
  food:      { id: 'food',      label: { en: 'Food',      ru: 'Еда'        }, Icon: Pizza,     accent: 'oklch(0.82 0.16 50)',  glow: 'oklch(0.82 0.16 50 / 0.28)' },
  cars:      { id: 'cars',      label: { en: 'Auto',      ru: 'Авто'       }, Icon: Car,       accent: 'oklch(0.74 0.14 260)', glow: 'oklch(0.74 0.14 260 / 0.28)' },
  news:      { id: 'news',      label: { en: 'News',      ru: 'Новости'    }, Icon: Newspaper, accent: 'oklch(0.78 0.05 250)', glow: 'oklch(0.78 0.05 250 / 0.22)' },
  anime:     { id: 'anime',     label: { en: 'Anime',     ru: 'Аниме'      }, Icon: Cat,       accent: 'oklch(0.80 0.16 355)', glow: 'oklch(0.80 0.16 355 / 0.28)' },
  art:       { id: 'art',       label: { en: 'Art',       ru: 'Арт'        }, Icon: Palette,   accent: 'oklch(0.78 0.17 175)', glow: 'oklch(0.78 0.17 175 / 0.28)' },
}

export const TOPIC_ROTATION: TopicId[] = [
  'crypto', 'ai', 'nsfw', 'gaming', 'finance', 'business',
  'lifestyle', 'meme', 'luxury', 'sports', 'fashion', 'music',
  'travel', 'food', 'cars', 'news', 'anime', 'art',
]

export function isTopicId(v: unknown): v is TopicId {
  return typeof v === 'string' && v in TOPICS
}
