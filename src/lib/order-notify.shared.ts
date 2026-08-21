export type OrderNotificationLang = 'en' | 'ru' | 'uk' | 'ar' | 'zh' | 'es' | 'tr' | 'pt' | 'fr'

const ORDER_READY: Record<OrderNotificationLang, (title: string) => string> = {
  en: (title) => `AURX\n\nYour order is ready for delivery! \n«${title}»\nOpen the bot to receive your accounts.`,
  ru: (title) => `AURX\n\nВаш заказ готов к выдаче! \n«${title}»\nОткройте бот, чтобы забрать данные.`,
  uk: (title) => `AURX\n\nВаше замовлення готове до видачі! \n«${title}»\nВідкрийте бота, щоб забрати дані.`,
  ar: (title) => `AURX\n\nطلبك جاهز للتسليم! \n«${title}»\nافتح البوت لاستلام حساباتك.`,
  zh: (title) => `AURX\n\n您的订单已准备就绪!\n「${title}」\n打开机器人即可领取账号。`,
  es: (title) => `AURX\n\n¡Tu pedido está listo! \n«${title}»\nAbre el bot para recibir tus cuentas.`,
  tr: (title) => `AURX\n\nSiparişin teslime hazır! \n«${title}»\nHesaplarını almak için botu aç.`,
  pt: (title) => `AURX\n\nSeu pedido está pronto! \n«${title}»\nAbra o bot para receber suas contas.`,
  fr: (title) => `AURX\n\nVotre commande est prête ! \n«${title}»\nOuvrez le bot pour récupérer vos comptes.`,
}

export function orderReadyMessage(lang: OrderNotificationLang, title: string) {
  return ORDER_READY[lang](title)
}