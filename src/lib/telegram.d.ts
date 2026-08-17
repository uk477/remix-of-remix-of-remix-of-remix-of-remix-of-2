export interface TelegramWebApp {
  ready: () => void
  expand: () => void
  platform?: string
  isVersionAtLeast?: (v: string) => boolean
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  initDataUnsafe?: {
    user?: {
      id?: number
      first_name?: string
      last_name?: string
      username?: string
      language_code?: string
      photo_url?: string
    }
  }

}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}
