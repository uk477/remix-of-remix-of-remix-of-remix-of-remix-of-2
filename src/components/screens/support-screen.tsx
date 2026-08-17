'use client'

import gramAsset from '@/assets/coins/gram.png.asset.json'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Handshake,
  HelpCircle,
  Info,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
  UserCircle2,
  Zap,
} from 'lucide-react'

import { useMemo, useState } from 'react'
import { ScreenHeader } from '@/components/screen-header'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import type { Lang } from '@/lib/types'

const TG_HANDLE = 'aurex_agency'
const TG_URL = `https://t.me/${TG_HANDLE}`

type L = { en: string } & Partial<Record<Lang, string>>

const getText = (obj: L, lang: Lang) => obj[lang] ?? obj.en


const T = {
  title: { en: 'Support', ru: 'Поддержка', ar: 'الدعم', zh: '客服', es: 'Soporte', tr: 'Destek', pt: 'Suporte', fr: 'Support', uk: 'Підтримка' } as L,
  subtitle: {
    en: 'Concierge for every X order — real humans, no bots.',
    ru: 'Консьерж по каждому X заказу — живые люди, без ботов.',
    ar: 'كونسييرج لكل طلب X — أشخاص حقيقيون بلا روبوتات.',
    zh: '每笔 X 订单的专属礼宾 — 真人服务，无机器人。',
    es: 'Concierge para cada pedido X — personas reales, sin bots.',
    tr: 'Her X siparişi için concierge — gerçek insanlar, bot yok.',
    pt: 'Concierge para cada pedido X — pessoas reais, sem bots.',
    fr: 'Conciergerie pour chaque commande X — de vrais humains, pas de bots.',
    uk: 'Консьєрж для кожного X замовлення — живі люди, без ботів.',
  } as L,
  hero_kicker: {
    en: 'AureX Concierge',
    ru: 'AureX Консьерж',
    ar: 'كونسييرج AureX',
    zh: 'AureX 礼宾',
    es: 'AureX Concierge',
    tr: 'AureX Concierge',
    pt: 'AureX Concierge',
    fr: 'AureX Concierge',
    uk: 'AureX Консьєрж',
  } as L,
  hero_title: {
    en: 'How can we help you today?',
    ru: 'Чем можем помочь сегодня?',
    ar: 'كيف يمكننا مساعدتك اليوم؟',
    zh: '今天需要什么帮助？',
    es: '¿En qué podemos ayudarte hoy?',
    tr: 'Bugün size nasıl yardımcı olabiliriz?',
    pt: 'Como podemos te ajudar hoje?',
    fr: "Comment pouvons-nous vous aider aujourd'hui?",
    uk: 'Чим можемо допомогти сьогодні?',
  } as L,
  online_now: {
    en: 'Online now',
    ru: 'Онлайн сейчас',
    ar: 'متصل الآن',
    zh: '当前在线',
    es: 'En línea ahora',
    tr: 'Şu an çevrimiçi',
    pt: 'Online agora',
    fr: 'En ligne maintenant',
    uk: 'Онлайн зараз',
  } as L,
  stat_reply: { en: '< 10 min', ru: '< 10 мин', ar: '< 10 دقائق', zh: '< 10 分钟', es: '< 10 min', tr: '< 10 dk', pt: '< 10 min', fr: '< 10 min', uk: '< 10 хв' } as L,
  stat_reply_label: { en: 'Avg. reply', ru: 'Средний ответ', ar: 'متوسط الرد', zh: '平均回复', es: 'Resp. promedio', tr: 'Ort. cevap', pt: 'Resp. média', fr: 'Réponse moy.', uk: 'Серд. відповідь' } as L,
  stat_orders: { en: '12,400+', ru: '12 400+', ar: '+12,400', zh: '12,400+', es: '12,400+', tr: '12.400+', pt: '12.400+', fr: '12 400+', uk: '12 400+' } as L,
  stat_orders_label: {
    en: 'Orders delivered',
    ru: 'Заказов доставлено',
    ar: 'طلبات مُنجزة',
    zh: '已完成订单',
    es: 'Pedidos entregados',
    tr: 'Teslim edilen siparişler',
    pt: 'Pedidos entregues',
    fr: 'Commandes livrées',
    uk: 'Замовлень доставлено',
  } as L,
  stat_uptime: { en: '24 / 7', ru: '24 / 7', ar: '24 / 7', zh: '24 / 7', es: '24 / 7', tr: '24 / 7', pt: '24 / 7', fr: '24 / 7', uk: '24 / 7' } as L,
  stat_uptime_label: {
    en: 'Live coverage',
    ru: 'Живая поддержка',
    ar: 'تغطية مباشرة',
    zh: '全天候在线',
    es: 'Cobertura en vivo',
    tr: 'Canlı destek',
    pt: 'Cobertura ao vivo',
    fr: 'Couverture en direct',
    uk: 'Жива підтримка',
  } as L,

  // Action cards
  action_tg_kicker: {
    en: 'Direct line',
    ru: 'Прямая линия',
    ar: 'خط مباشر',
    zh: '直接联系',
    es: 'Línea directa',
    tr: 'Doğrudan hat',
    pt: 'Linha direta',
    fr: 'Ligne directe',
    uk: 'Пряма лінія',
  } as L,
  action_tg_title: {
    en: 'Talk to a manager in Telegram',
    ru: 'Написать менеджеру в Telegram',
    ar: 'تحدث مع المسؤول عبر تيليجرام',
    zh: '在 Telegram 上联系经理',
    es: 'Habla con un manager en Telegram',
    tr: "Telegram'da bir yöneticiyle konuş",
    pt: 'Fale com um gerente no Telegram',
    fr: 'Parlez à un manager sur Telegram',
    uk: 'Написати менеджеру в Telegram',
  } as L,
  action_tg_desc: {
    en: 'A personal manager is online — orders, refills, custom deals and partnerships in one chat.',
    ru: 'Личный менеджер на связи — поможет с заказом, рефиллом, подберёт индивидуальные условия и обсудит партнёрство.',
    ar: 'مدير شخصي متصل — الطلبات وإعادة التعبئة والعروض المخصّصة والشراكات في محادثة واحدة.',
    zh: '专属经理在线 — 订单、补量、定制方案与合作洽谈，一个聊天全部搞定。',
    es: 'Un manager personal está en línea — pedidos, recargas, tratos personalizados y asociaciones en un chat.',
    tr: 'Kişisel bir yönetici çevrimiçi — siparişler, yenilemeler, özel teklifler ve ortaklıklar tek bir sohbette.',
    pt: 'Um gerente pessoal está online — pedidos, recargas, negócios personalizados e parcerias em um chat.',
    fr: 'Un manager personnel est en ligne — commandes, recharges, offres personnalisées et partenariats dans un seul chat.',
    uk: "Особистий менеджер на зв'язку — допоможе із замовленням, рефілом, підбере індивідуальні умови та обговорить партнерство.",
  } as L,
  action_tg_cta: {
    en: 'Open Telegram',
    ru: 'Открыть Telegram',
    ar: 'فتح تيليجرام',
    zh: '打开 Telegram',
    es: 'Abrir Telegram',
    tr: "Telegram'ı aç",
    pt: 'Abrir Telegram',
    fr: 'Ouvrir Telegram',
    uk: 'Відкрити Telegram',
  } as L,
  action_faq_kicker: {
    en: 'Knowledge base',
    ru: 'База знаний',
    ar: 'قاعدة المعرفة',
    zh: '知识库',
    es: 'Base de conocimientos',
    tr: 'Bilgi tabanı',
    pt: 'Base de conhecimento',
    fr: 'Base de connaissances',
    uk: 'База знань',
  } as L,
  action_faq_title: {
    en: 'Browse frequent questions',
    ru: 'Частые вопросы',
    ar: 'الأسئلة الشائعة',
    zh: '常见问题',
    es: 'Ver preguntas frecuentes',
    tr: 'Sık sorulan sorulara göz at',
    pt: 'Ver perguntas frequentes',
    fr: 'Parcourir les questions fréquentes',
    uk: 'Часті запитання',
  } as L,
  action_faq_desc: {
    en: 'Payments, delivery, refills, guarantees and account safety — everything you need to know before buying.',
    ru: 'Оплата, доставка, рефиллы, гарантии и безопасность аккаунта — всё, что нужно знать перед покупкой.',
    ar: 'الدفع، التسليم، إعادة التعبئة، الضمانات وأمان الحساب — كل ما تحتاج معرفته قبل الشراء.',
    zh: '支付、交付、补量、保障与账户安全 — 购买前你需要了解的一切。',
    es: 'Pagos, entrega, recargas, garantías y seguridad de cuenta — todo lo que necesitas saber antes de comprar.',
    tr: 'Ödemeler, teslimat, yenilemeler, garantiler ve hesap güvenliği — satın almadan önce bilmeniz gereken her şey.',
    pt: 'Pagamentos, entrega, recargas, garantias e segurança da conta — tudo o que você precisa saber antes de comprar.',
    fr: "Paiements, livraison, recharges, garanties et sécurité du compte — tout ce que vous devez savoir avant d'acheter.",
    uk: 'Оплата, доставка, рефіли, гарантії та безпека акаунту — все, що потрібно знати перед покупкою.',
  } as L,
  action_faq_cta: {
    en: 'Open FAQ',
    ru: 'Открыть FAQ',
    ar: 'فتح الأسئلة',
    zh: '打开常见问题',
    es: 'Abrir FAQ',
    tr: "SSS'yi aç",
    pt: 'Abrir FAQ',
    fr: 'Ouvrir la FAQ',
    uk: 'Відкрити FAQ',
  } as L,

  // FAQ view
  faq_title: {
    en: 'Frequent questions',
    ru: 'Частые вопросы',
    ar: 'الأسئلة الشائعة',
    zh: '常见问题',
    es: 'Preguntas frecuentes',
    tr: 'Sık sorulan sorular',
    pt: 'Perguntas frequentes',
    fr: 'Questions fréquentes',
    uk: 'Часті запитання',
  } as L,
  faq_subtitle: {
    en: 'Curated by the AureX team — updated weekly.',
    ru: 'Отобрано командой AureX — обновляется еженедельно.',
    ar: 'مُختارة من فريق AureX — تُحدَّث أسبوعيًا.',
    zh: 'AureX 团队精选 — 每周更新。',
    es: 'Seleccionado por el equipo AureX — actualizado semanalmente.',
    tr: 'AureX ekibi tarafından derlendi — haftalık güncellenir.',
    pt: 'Curado pela equipe AureX — atualizado semanalmente.',
    fr: "Sélectionné par l'équipe AureX — mis à jour chaque semaine.",
    uk: 'Відібрано командою AureX — оновлюється щотижня.',
  } as L,
  search_placeholder: {
    en: 'Search a question…',
    ru: 'Найти вопрос…',
    ar: 'ابحث عن سؤال…',
    zh: '搜索问题…',
    es: 'Buscar una pregunta…',
    tr: 'Soru ara…',
    pt: 'Pesquisar uma pergunta…',
    fr: 'Rechercher une question…',
    uk: 'Знайти запитання…',
  } as L,
  empty: {
    en: 'Nothing matched. Ask us directly in Telegram.',
    ru: 'Ничего не найдено. Напишите нам в Telegram.',
    ar: 'لا نتائج. تواصل معنا عبر تيليجرام.',
    zh: '没有匹配结果。请直接在 Telegram 联系我们。',
    es: 'Sin resultados. Pregúntanos directamente en Telegram.',
    tr: "Hiçbir şey eşleşmedi. Bize doğrudan Telegram'dan sorun.",
    pt: 'Nenhum resultado. Pergunte-nos diretamente no Telegram.',
    fr: 'Aucun résultat. Posez-nous la question directement sur Telegram.',
    uk: 'Нічого не знайдено. Напишіть нам у Telegram.',
  } as L,
  cat_all: { en: 'All', ru: 'Все', ar: 'الكل', zh: '全部', es: 'Todas', tr: 'Tümü', pt: 'Todas', fr: 'Toutes', uk: 'Все' } as L,
  cat_delivery: { en: 'Delivery', ru: 'Доставка', ar: 'التسليم', zh: '交付', es: 'Entrega', tr: 'Teslimat', pt: 'Entrega', fr: 'Livraison', uk: 'Доставка' } as L,
  cat_payment: { en: 'Payments', ru: 'Оплата', ar: 'الدفع', zh: '支付', es: 'Pagos', tr: 'Ödemeler', pt: 'Pagamentos', fr: 'Paiements', uk: 'Оплата' } as L,
  cat_accounts: { en: 'Accounts', ru: 'Аккаунты', ar: 'الحسابات', zh: '账户', es: 'Cuentas', tr: 'Hesaplar', pt: 'Contas', fr: 'Comptes', uk: 'Акаунти' } as L,
  cat_boost: { en: 'Boost', ru: 'Накрутка', ar: 'التعزيز', zh: '涨粉', es: 'Boost', tr: 'Boost', pt: 'Boost', fr: 'Boost', uk: 'Накрутка' } as L,
  cat_coop: { en: 'Cooperation', ru: 'Сотрудничество', ar: 'التعاون', zh: '合作', es: 'Colaboración', tr: 'İşbirliği', pt: 'Colaboração', fr: 'Collaboration', uk: 'Співпраця' } as L,

  // Bottom CTA
  still_title: {
    en: 'Still need a human?',
    ru: 'Нужен живой человек?',
    ar: 'تحتاج إلى إنسان؟',
    zh: '仍需要真人协助？',
    es: '¿Todavía necesitas hablar con alguien?',
    tr: 'Hâlâ bir insana mı ihtiyacınız var?',
    pt: 'Ainda precisa de uma pessoa?',
    fr: "Vous avez encore besoin d'un humain?",
    uk: 'Потрібен живий фахівець?',
  } as L,
  still_desc: {
    en: 'Our concierge is one tap away — 24/7 in Telegram.',
    ru: 'Наш консьерж в одном тапе — 24/7 в Telegram.',
    ar: 'كونسييرجنا على بُعد نقرة — 24/7 في تيليجرام.',
    zh: '一键联系礼宾 — Telegram 全天候在线。',
    es: 'Nuestro concierge está a un toque — 24/7 en Telegram.',
    tr: "Concierge'imiz bir dokunuş uzakta — Telegram'da 7/24.",
    pt: 'Nosso concierge está a um toque — 24/7 no Telegram.',
    fr: 'Notre concierge est à un tap — 24/7 sur Telegram.',
    uk: 'Наш консьєрж у одному тапі — 24/7 у Telegram.',
  } as L,
}

type FaqCategory = 'delivery' | 'payment' | 'accounts' | 'boost' | 'coop'

type FaqItem = {
  id: string
  category: FaqCategory
  q: L
  a: L
}

const FAQ: FaqItem[] = [
  {
    id: 'delivery-eta',
    category: 'delivery',
    q: {
      en: 'How long does an order take to deliver?',
      ru: 'Сколько занимает доставка заказа?',
      ar: 'كم يستغرق تسليم الطلب؟',
      zh: '订单交付需要多久？',
    },
    a: {
      en: 'Boost orders start within 1–5 minutes and complete at the speed shown on each service card. Account orders are delivered instantly to your dashboard once payment is confirmed.',
      ru: 'Если речь идет о накрутке, то старт наступает обычно не более чем через 5 минут. Скорось: написана в карточке. Если нету перебоев с сервисом, доставка займет 5-10 минут. \nЕсли вы хотите приобрести аккаунт, то смотрите в карточке пометки. Если стоит "автовыдача", то товар выдастся автоматически сразу после оплаты независимо от того когда и восколько вы оплатили. Если пометка "ручная выдача", то выдача будет занимать от 30 минут до 24ч, взависимости от ситуации.',
      ar: 'تبدأ طلبات التعزيز خلال 1–5 دقائق وتكتمل بالسرعة الموضّحة على كل خدمة. تُسلَّم الحسابات فورًا في لوحتك بعد تأكيد الدفع.',
      zh: '涨粉订单 1–5 分钟内启动，按各服务卡显示的速度完成。账户订单在支付确认后即时交付到你的账户面板。',
    },
  },
  {
    id: 'delivery-track',
    category: 'delivery',
    q: {
      en: 'How do I track my order?',
      ru: 'Как отслеживать заказ?',
      ar: 'كيف أتابع طلبي؟',
      zh: '如何跟踪订单？',
    },
    a: {
      en: 'Every order has a live status inside "History": pending → in progress → completed. You will also receive a Telegram ping the moment status changes.',
      ru: 'У каждого заказа живой статус в разделе «История»: в ожидании → выполняется → завершён. Также вы получите пуш в Telegram при смене статуса.',
      ar: 'لكل طلب حالة مباشرة في «السجل»: قيد الانتظار → قيد التنفيذ → مكتمل. ستصلك أيضًا إشعارات تيليجرام لحظة تغيّر الحالة.',
      zh: '每笔订单在「历史」中有实时状态：等待 → 进行中 → 已完成。状态变化时会同步 Telegram 推送。',
    },
  },
  {
    id: 'payment-methods',
    category: 'payment',
    q: {
      en: 'Which payment methods do you accept?',
      ru: 'Какие способы оплаты вы принимаете?',
      ar: 'ما طرق الدفع المتاحة؟',
      zh: '接受哪些支付方式？',
    },
    a: {
      en: 'Crypto only — USDT (TRC20 / ERC20 / BEP20), BTC, ETH, GRAM (TON network), SOL. You can also top up an internal balance once and pay instantly on any future order.',
      ru: 'Только крипта — USDT (TRC20 / ERC20 / BEP20), BTC, ETH, GRAM (сеть TON), SOL. Можно один раз пополнить внутренний баланс и мгновенно платить с него любые будущие заказы.',
      ar: 'العملات الرقمية فقط — USDT (TRC20 / ERC20 / BEP20) وBTC وETH وGRAM (شبكة TON) وSOL. يمكنك أيضًا شحن رصيدك الداخلي مرة واحدة والدفع فورًا لأي طلب لاحق.',
      zh: '仅支持加密货币 — USDT (TRC20 / ERC20 / BEP20)、BTC、ETH、GRAM（TON 网络）、SOL。也可一次充值内部余额，未来订单即时结算。',
    },
  },
  {
    id: 'payment-refund',
    category: 'payment',
    q: {
      en: 'Can I get a refund?',
      ru: 'Возможен ли возврат средств?',
      ar: 'هل يمكن استرداد المبلغ؟',
      zh: '可以退款吗？',
    },
    a: {
      en: 'If a service cannot be delivered, we refund the exact amount to your internal balance within minutes — usable instantly on any product or withdrawable via manager.',
      ru: 'Если вы пополнили баланс в боте и хотите спустя некоторое время вывести деньги - у вас не получиться это сделать. У нас не предусмотрен вывод. Но есть исключение: Если купленный товар оказался бракованным, либо услуга была выполнена не так, как было заявлено в описании - мы обязаны вернуть вам деньги.\nЧтобы узнать, в какой криптовалюте вы сможете получить вывод - уточняйте у мененджера. ',
      ar: 'إذا تعذّر تنفيذ الخدمة، نُعيد المبلغ بالكامل إلى رصيدك الداخلي خلال دقائق — قابل للاستخدام فورًا أو للسحب عبر المسؤول.',
      zh: '如无法交付，我们会在数分钟内将全额退回你的内部余额 — 可即时用于任何商品，或通过经理提现。',
    },
  },
  {
    id: 'accounts-warranty',
    category: 'accounts',
    q: {
      en: 'Is there a warranty on purchased accounts?',
      ru: 'Есть ли гарантия на купленные аккаунты?',
      ar: 'هل توجد ضمانة على الحسابات المُشتراة؟',
      zh: '购买的账户有保修吗？',
    },
    a: {
      en: 'Every account carries a replacement guarantee for the period stated on its card (typically 24h–14d). If it gets restricted through no fault of yours, we replace it or refund the full amount.',
      ru: 'Исходя из прописанных правил, на каждый аккаунт действует гарантия в 12 часов. После данного срока вся ответственность ложиться на клиента. Аккаунт помечается как брак и делается возврат на баланс бота / криптовалюту только в том случае, когда вина купленный товар имеет не то, что было заявлено в описании / не правильные данные для входа / блокировка, заморозка аккаунта исключительно по НАШЕЙ вине.\nЕсли вы нарушали правила X, не соблюдали меры безопасности и так далее - возврат не предусмотрен',
      ar: 'يحمل كل حساب ضمان استبدال للفترة المذكورة في بطاقته (عادة 24س–14ي). في حال التقييد دون ذنبك، نستبدله أو نعيد المبلغ كاملًا.',
      zh: '每个账户在其卡片显示的保修期内可换新（通常 24 小时–14 天）。若非你过错被限制，我们将更换或全额退款。',
    },
  },
  {
    id: 'accounts-safe',
    category: 'accounts',
    q: {
      en: 'How do I keep a purchased account safe?',
      ru: 'Как безопасно использовать купленный аккаунт?',
      ar: 'كيف أستخدم الحساب المشترى بأمان؟',
      zh: '如何安全使用购买的账户？',
    },
    a: {
      en: '= Account safety: 3 must-have tools\n\n- Anti-detect browser — I recommend ADS Power\n- Proxy — IPv4 is fine\n- X account warm-up — 7–14 days\n\nThis is the basic kit that protects your purchase. Other questions — which country to choose for a proxy, how to warm up — are covered in the guide sent after payment.',
      ru: '= Безопасность аккаунта: 3 must-have инструмента\n\n- Анти-детект браузер — рекомендую ADS Power\n- Прокси — подойдёт IPv4\n- Прогрев аккаунта X — 7–14 дней\n\nЭто базовый набор, который защищает вашу покупку. Остальные вопросы — какую страну выбрать для прокси, как прогревать — разбираются в инструкции, которая приходит после оплаты.',
      ar: '= أمان الحساب: 3 أدوات أساسية\n\n- متصفح مضاد للكشف — أنصح بـ ADS Power\n- بروكسي — IPv4 كافٍ\n- تسخين حساب X — 7–14 يومًا\n\nهذه المجموعة الأساسية تحمي مشترياتك. الأسئلة الأخرى — أي دولة تختار للبروكسي، كيف تسخّن — تجدها في الدليل المرسل بعد الدفع.',
      zh: '= 账户安全：3 个必备工具\n\n- 反检测浏览器 — 推荐 ADS Power\n- 代理 — IPv4 即可\n- X 账号预热 — 7–14 天\n\n这是保护购买的基础套装。其他问题——选择哪个国家代理、如何预热——在付款后发送的指南中都有说明。',
    },
  },

  {
    id: 'boost-safe',
    category: 'boost',
    q: {
      en: 'Is boosting safe for my account?',
      ru: 'Безопасна ли накрутка для аккаунта?',
      ar: 'هل التعزيز آمن على حسابي؟',
      zh: '涨粉对账户安全吗？',
    },
    a: {
      en: 'In short - yes, it is safe. We use a proven service that has been providing fast and high-quality boosting for many years. We have been working with this service for two years and there has not been a single case of account blocking or suspension.',
      ru: 'Кратко - Да, безопасно. \nМы используем проверенный сервис, который предоставляет быструю и качественную накрутку на протяжении многих лет. На  протяжении двух лет мы работаем с данным сервисом и еще не было ни одного случая блокировок / приостановок аккаунтов',
      ar: 'نستخدم تسليمًا تدريجيًا بأنماط شبيهة بالبشر ومصادر مُحمَّاة. لا حاجة لكلمة المرور — فقط الرابط العام. لم يُعلَّق أي حساب بسبب AureX.',
      zh: '我们采用类人节奏的滴灌式交付与预热资源池。无需密码 — 仅需公开链接。从未有账户因使用 AureX 被封。',
    },
  },
  {
    id: 'coop-partners',
    category: 'coop',
    q: {
      en: 'I want to become a supplier / partner.',
      ru: 'Хочу стать поставщиком / партнёром.',
      ar: 'أرغب في أن أصبح مورّدًا / شريكًا.',
      zh: '我想成为供应商 / 合作伙伴。',
    },
    a: {
      en: 'In the bot, go to the "Home" section, scroll down and you will find the "I want to become a supplier" section, click on it and you will have the opportunity to fill out the form. You can become a supplier of accounts or a supplier of various X services.',
      ru: 'В боте перейдите в раздел: "Главная", пролистине вниз и вы найдете раздел "хочу стать поставщиком", тыкните на него и у вас будет возможность заполнить форму. Вы можете стать поставщиков аккаунтов, либо поставщиком разных услуг X',
      ar: 'رائع. أرسل رسالة في تيليجرام تتضمّن نوع الخدمة والحجم وقائمة الأسعار وواجهة API إن وُجدت. نضمّ الشركاء المعتمدين خلال 48 ساعة ونشاركهم الإيرادات في صفقات White-label.',
      zh: '很棒。请在 Telegram 发送服务类型、体量、报价单和 API（如有）。48 小时内接入通过审核的合作伙伴，白标交易享收益分成。',
    },
  },

]

type CatMeta = {
  icon: typeof Zap
  label: L
  tone: string
  accent: string // pure text color e.g. text-rose-500
  cardBorder: string // e.g. border-rose-500/25
  cardShadow: string // full shadow class
  softBg: string // subtle bg e.g. bg-rose-500/5
  bar: string // solid bg e.g. bg-rose-500
}

const CATEGORY_META: Record<FaqCategory, CatMeta> = {
  delivery: {
    icon: Truck,
    label: { en: 'Delivery', ru: 'Доставка', ar: 'التسليم', zh: '交付', es: 'Entrega', tr: 'Teslimat', pt: 'Entrega', fr: 'Livraison', uk: 'Доставка' },
    tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    accent: 'text-sky-500',
    cardBorder: 'border-sky-500/25',
    cardShadow: 'shadow-[0_20px_40px_-15px_rgba(14,165,233,0.15)]',
    softBg: 'bg-sky-500/5',
    bar: 'bg-sky-500',
  },
  payment: {
    icon: CreditCard,
    label: { en: 'Payments', ru: 'Оплата', ar: 'الدفع', zh: '支付', es: 'Pagos', tr: 'Ödemeler', pt: 'Pagamentos', fr: 'Paiements', uk: 'Оплата' },
    tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    accent: 'text-emerald-500',
    cardBorder: 'border-emerald-500/25',
    cardShadow: 'shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)]',
    softBg: 'bg-emerald-500/5',
    bar: 'bg-emerald-500',
  },
  accounts: {
    icon: UserCircle2,
    label: { en: 'Accounts', ru: 'Аккаунты', ar: 'الحسابات', zh: '账户', es: 'Cuentas', tr: 'Hesaplar', pt: 'Contas', fr: 'Comptes', uk: 'Акаунти' },
    tone: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    accent: 'text-violet-500',
    cardBorder: 'border-violet-500/25',
    cardShadow: 'shadow-[0_20px_40px_-15px_rgba(139,92,246,0.15)]',
    softBg: 'bg-violet-500/5',
    bar: 'bg-violet-500',
  },
  boost: {
    icon: TrendingUp,
    label: { en: 'Boost', ru: 'Накрутка', ar: 'التعزيز', zh: '涨粉', es: 'Boost', tr: 'Boost', pt: 'Boost', fr: 'Boost', uk: 'Накрутка' },
    tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    accent: 'text-amber-500',
    cardBorder: 'border-amber-500/25',
    cardShadow: 'shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)]',
    softBg: 'bg-amber-500/5',
    bar: 'bg-amber-500',
  },
  coop: {
    icon: Handshake,
    label: { en: 'Cooperation', ru: 'Сотрудничество', ar: 'التعاون', zh: '合作', es: 'Colaboración', tr: 'İşbirliği', pt: 'Colaboração', fr: 'Collaboration', uk: 'Співпраця' },
    tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    accent: 'text-rose-500',
    cardBorder: 'border-rose-500/25',
    cardShadow: 'shadow-[0_20px_40px_-15px_rgba(244,63,94,0.15)]',
    softBg: 'bg-rose-500/5',
    bar: 'bg-rose-500',
  },
}




type View = 'menu' | 'faq'

export function SupportScreen() {
  const { lang } = useI18n()
  const { back, canGoBack } = useNav()
  const [view, setView] = useState<View>('menu')

  const tr = (k: keyof typeof T) => getText(T[k], lang)

  function openTelegram() {
    window.open(TG_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col bg-background">
      <ScreenHeader
        title={tr('title')}
        subtitle={tr('subtitle')}
        onBack={view === 'faq' ? () => setView('menu') : canGoBack ? back : undefined}
      />

      <AnimatePresence mode="wait">
        {view === 'menu' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4 pt-6"
          >
            <div className="flex flex-col gap-6">
              <PrimaryCard
                kicker={tr('action_tg_kicker')}
                title={tr('action_tg_title')}
                desc={tr('action_tg_desc')}
                cta={tr('action_tg_cta')}
                onClick={openTelegram}
              />
              <SecondaryCard
                kicker={tr('action_faq_kicker')}
                title={tr('action_faq_title')}
                desc={tr('action_faq_desc')}
                cta={tr('action_faq_cta')}
                onClick={() => setView('faq')}
              />
            </div>
          </motion.div>
        ) : (
          <FaqView key="faq" onTelegram={openTelegram} tr={tr} lang={lang} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────── KINETIC LAYERED GLASS CARDS ─────────────── */

function PrimaryCard({
  kicker,
  title,
  desc,
  cta,
  onClick,
}: {
  kicker: string
  title: string
  desc: string
  cta: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative w-full overflow-hidden rounded-[32px] p-px text-left shadow-2xl"
      style={{
        background:
          'linear-gradient(to bottom, color-mix(in oklab, var(--gold) 42%, transparent), transparent 70%)',
      }}
    >
      {/* Radial ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 70%)',
        }}
      />
      {/* Drifting orb */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--gold)' }}
        animate={{ x: ['-30%', '30%', '-30%'], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Sheen sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
        <motion.div
          aria-hidden
          className="absolute -inset-y-6 -left-1/2 w-1/3 rotate-12"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklab, var(--gold) 28%, transparent), transparent)',
          }}
          animate={{ x: ['0%', '380%'] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
        />
      </div>

      <div className="relative flex h-full flex-col rounded-[31px] bg-[#0c0c0c] p-7">
        <div className="mb-6 flex items-start justify-between">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full opacity-30 blur-xl"
              style={{ background: 'var(--gold)' }}
            />
            <div
              className="relative flex size-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, oklch(0.88 0.13 88), oklch(0.6 0.11 72))',
                boxShadow: '0 8px 24px -8px color-mix(in oklab, var(--gold) 60%, transparent)',
              }}
            >
              <MessageCircle className="size-7 text-[#0c0c0c]" strokeWidth={2.2} />
            </div>
          </div>
          <div className="rounded-full border border-white/5 bg-white/5 p-2">
            <ArrowUpRight className="size-5 text-white/40 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-active:-translate-y-0.5 group-active:translate-x-0.5" />
          </div>
        </div>

        <div className="mb-8 space-y-2">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--gold)' }}
          >
            {kicker}
          </span>
          <h2 className="font-display text-[22px] font-bold leading-tight text-white">{title}</h2>
          <p className="text-[13.5px] leading-relaxed text-white/50">{desc}</p>
        </div>

        <div
          className="mt-auto flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--gold)' }}
        >
          <span>{cta}</span>
          <ArrowUpRight className="size-4" />
        </div>
      </div>
    </motion.button>
  )
}

function SecondaryCard({
  kicker,
  title,
  desc,
  cta,
  onClick,
}: {
  kicker: string
  title: string
  desc: string
  cta: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative w-full overflow-hidden rounded-[32px] bg-white/10 p-px text-left"
    >
      <div className="relative flex flex-col rounded-[31px] bg-[#0c0c0c] p-7">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <HelpCircle className="size-6 text-white/70" strokeWidth={2} />
          </div>
          <div className="rounded-full border border-white/5 p-2">
            <ArrowUpRight className="size-5 text-white/20 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-active:-translate-y-0.5 group-active:translate-x-0.5" />
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            {kicker}
          </span>
          <h2 className="font-display text-[20px] font-bold text-white">{title}</h2>
          <p className="text-[13.5px] leading-relaxed text-white/40">{desc}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-white/70">
          <span>{cta}</span>
          <ArrowUpRight className="size-4 opacity-60" />
        </div>
      </div>
    </motion.button>
  )
}

/* ─────────────── HERO ─────────────── */

function HeroCard({
  tr,
  onTelegram,
}: {
  tr: (k: keyof typeof T) => string
  onTelegram: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-5"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            <Sparkles className="size-3 text-primary" />
            {tr('hero_kicker')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            {tr('online_now')}
          </span>
        </div>

        <h2 className="mt-4 text-[26px] font-extrabold leading-[1.1] tracking-tight text-foreground">
          {tr('hero_title')}
        </h2>

        <button
          onClick={onTelegram}
          className="group mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-background transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            <MessageCircle className="size-4" />
            @{TG_HANDLE}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium opacity-70 transition-opacity group-hover:opacity-100">
            {tr('action_tg_cta')}
            <ArrowUpRight className="size-3.5" />
          </span>
        </button>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniStat icon={<Zap className="size-3.5" />} value={tr('stat_reply')} label={tr('stat_reply_label')} />
          <MiniStat icon={<Check className="size-3.5" />} value={tr('stat_orders')} label={tr('stat_orders_label')} />
          <MiniStat icon={<Clock className="size-3.5" />} value={tr('stat_uptime')} label={tr('stat_uptime_label')} />
        </div>
      </div>
    </motion.section>
  )
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-2.5 backdrop-blur">
      <div className="flex items-center gap-1 text-primary">{icon}</div>
      <div className="mt-1 text-sm font-bold leading-none tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

/* ─────────────── ACTION CARDS ─────────────── */

function ActionCard({
  kicker,
  title,
  desc,
  cta,
  onClick,
  icon,
  accent,
  external,
}: {
  kicker: string
  title: string
  desc: string
  cta: string
  onClick: () => void
  icon: React.ReactNode
  accent: 'primary' | 'muted'
  external?: boolean
}) {
  const isPrimary = accent === 'primary'
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition-colors ${
        isPrimary
          ? 'border-primary/30 bg-gradient-to-br from-primary/12 via-background to-background hover:border-primary/60'
          : 'border-border bg-card hover:border-foreground/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
            isPrimary
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
              : 'bg-secondary text-foreground'
          }`}
        >
          {icon}
        </div>
        <ArrowUpRight
          className={`size-4 shrink-0 -translate-y-0.5 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-1 group-hover:opacity-100 ${
            external ? '' : 'rotate-45'
          }`}
        />
      </div>

      <p
        className={`mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          isPrimary ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {kicker}
      </p>
      <h3 className="mt-1.5 text-lg font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{desc}</p>

      <div
        className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${
          isPrimary ? 'text-primary' : 'text-foreground'
        }`}
      >
        {cta}
        <ArrowUpRight className="size-3.5" />
      </div>
    </motion.button>
  )
}

function TrustRow({ tr: _tr }: { tr: (k: keyof typeof T) => string }) {
  const items = [
    { icon: Shield, en: 'Escrow-safe', ru: 'Безопасно', ar: 'حماية آمنة', zh: '安全担保', es: 'Escrow seguro', tr: 'Garantörlü güvenli', pt: 'Escrow seguro', fr: 'Sécurisé par escrow', uk: 'Безпечно через гаранта' },
    { icon: Zap, en: 'Instant reply', ru: 'Мгновенный ответ', ar: 'رد فوري', zh: '即时回复', es: 'Respuesta instantánea', tr: 'Anında cevap', pt: 'Resposta instantânea', fr: 'Réponse instantanée', uk: 'Миттєва відповідь' },
    { icon: Sparkles, en: 'Manager-led', ru: 'Личный менеджер', ar: 'مسؤول شخصي', zh: '专属经理', es: 'Con manager', tr: 'Yönetici destekli', pt: 'Com gerente', fr: 'Accompagné par un manager', uk: 'З особистим менеджером' },
  ]
  const { lang } = useI18n()
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card/40 px-4 py-3">
      {items.map((it) => {
        const Icon = it.icon
        const label = it[lang]
        return (
          <div key={it.en} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Icon className="size-3.5 text-primary" />
            {label}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────── FAQ VIEW ─────────────── */

function FaqView({
  tr,
  lang,
}: {
  onTelegram: () => void
  tr: (k: keyof typeof T) => string
  lang: Lang
}) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(FAQ[0]?.id ?? null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQ.filter((f) => {
      if (!q) return true
      return f.q[lang]?.toLowerCase().includes(q) || f.a[lang]?.toLowerCase().includes(q)
    })
  }, [query, lang])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 px-4 pb-4 pt-4"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{tr('faq_title')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{tr('faq_subtitle')}</p>
        </div>
        <span className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[10px] font-bold tabular-nums text-muted-foreground">
          {String(FAQ.length).padStart(2, '0')}
        </span>
      </div>

      <div className="glass flex items-center gap-2 rounded-2xl border border-border px-3.5 py-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('search_placeholder')}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((item, i) => {
            const isOpen = openId === item.id
            const meta = CATEGORY_META[item.category]
            const CatIcon = meta.icon

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className={`relative overflow-hidden rounded-2xl border bg-[#0c0c0c] transition-all ${
                  isOpen
                    ? `${meta.cardBorder} ${meta.cardShadow}`
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    {/* Kicker row: dot + mono category */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-block size-2 rounded-full ${meta.bar}`} />
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${meta.accent}`}
                      >
                        {getText(meta.label, lang)}
                      </span>
                    </div>

                    {/* Question title */}
                    <h3 className="font-outfit text-[17px] font-semibold leading-tight tracking-tight text-white">
                      {getText(item.q, lang)}
                    </h3>
                  </div>
                  <span
                    className={`ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      isOpen ? `${meta.cardBorder} ${meta.softBg} ${meta.accent}` : 'border-white/10 text-white/40'
                    }`}
                  >
                    {isOpen ? <CatIcon className="size-4" /> : <ChevronDown className="size-4" />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                    >
                      <div className="space-y-5 px-5 pb-5">
                        <RichAnswer text={getText(item.a, lang)} meta={meta} />
                      </div>
                      {/* Blueprint footer */}
                      <div className="flex items-center justify-between border-t border-white/5 px-5 py-3 opacity-70">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block size-1 rounded-full ${meta.bar}`} />
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/60">
                            AureX · Concierge
                          </span>
                        </div>
                        
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>


        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {tr('empty')}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────── RICH ANSWER RENDERER ─────────────── */


/* ─────────────── BRAND LOGOS ─────────────── */

// Real logos via simpleicons CDN + Google favicon fallback
const BRAND_LOGOS: Record<string, { src: string; label: string; href?: string }> = {
  USDT: { src: 'https://cdn.simpleicons.org/tether/26A17B', label: 'USDT' },
  BTC: { src: 'https://cdn.simpleicons.org/bitcoin/F7931A', label: 'BTC' },
  ETH: { src: 'https://cdn.simpleicons.org/ethereum/627EEA', label: 'ETH' },
  GRAM: { src: gramAsset.url, label: 'GRAM' },
  TON: { src: gramAsset.url, label: 'GRAM' },
  SOL: { src: 'https://cdn.simpleicons.org/solana/9945FF', label: 'SOL' },
  Telegram: { src: 'https://cdn.simpleicons.org/telegram/26A5E4', label: 'Telegram' },
  X: { src: 'https://cdn.simpleicons.org/x/ffffff', label: 'X' },
  'ADS Power': {
    src: 'https://www.adspower.com/_ipx/f_webp&q_100&fit_cover&s_120x120/dist/logo_global.png',
    label: 'ADS Power',
    href: 'https://www.adspower.com/share/8rOEOj',
  },
}


const CRYPTO_KEYS = ['USDT', 'BTC', 'ETH', 'GRAM', 'TON', 'SOL']

function extractCryptos(text: string): string[] {
  const found: string[] = []
  for (const k of CRYPTO_KEYS) {
    const re = new RegExp(`\\b${k}\\b`)
    if (re.test(text) && !found.includes(k)) found.push(k)
  }
  return found
}

/* ─────────────── INLINE TOKEN DECORATOR ─────────────── */

const BRAND_TOKENS = [
  'USDT', 'BTC', 'ETH', 'GRAM', 'TON', 'SOL', 'API', 'IPv4', 'IPv6',
  'TRC20', 'ERC20', 'BEP20', 'ADS Power', 'AureX', 'Telegram',
  'White-label', 'white-label',
]

function decorate(text: string, meta: CatMeta): React.ReactNode[] {
  const brandAlt = BRAND_TOKENS
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const pattern = new RegExp(
    `(«[^»]+»)|("[^"]+")|(\\$\\d[\\d.,]*|\\d+[\\d.,]*%|\\d+\\$)|(\\b\\d+(?:[-–]\\d+)?\\s?(?:мин(?:ут[аы]?)?|час(?:ов|а)?|ч|дн(?:ей|я)?|д|days?|hours?|min|мс|ms)\\b)|(${brandAlt})`,
    'gi',
  )

  const out: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const token = m[0]
    const isQuote = !!(m[1] || m[2])
    const isMoney = !!m[3]
    const isDuration = !!m[4]
    const isBrand = !!m[5]

    let cls = ''
    if (isQuote) {
      cls = `rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] font-medium text-white/90`
    } else if (isMoney) {
      cls = `rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/20`
    } else if (isDuration) {
      cls = `rounded ${meta.softBg} px-1.5 py-0.5 font-mono text-[11px] font-bold ${meta.accent} ring-1 ring-current/20`
    } else if (isBrand) {
      const logo = BRAND_LOGOS[token]
      if (logo?.href) {
        out.push(
          <a
            key={`t-${key++}`}
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-bold ${meta.accent} ring-1 ring-white/10 transition-colors hover:bg-white/[0.08]`}
          >
            <img src={logo.src} alt={logo.label} className="size-3 shrink-0" loading="lazy" />
            {token}
          </a>,
        )
      } else {
        cls = `rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-bold text-white/90 ring-1 ring-white/10`
        out.push(
          <span key={`t-${key++}`} className={cls}>
            {token}
          </span>,
        )
      }
    }

    last = m.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/* ─────────────── RICH ANSWER ─────────────── */

function CryptoStrip({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
        Settlement Assets
      </p>
      <div className="flex flex-wrap gap-1.5">
        {codes.map((code) => {
          const b = BRAND_LOGOS[code]
          if (!b) return null
          return (
            <div
              key={code}
              className="flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.03] px-2.5 py-1"
            >
              <img src={b.src} alt={b.label} className="size-3" loading="lazy" />
              <span className="font-mono text-[11px] font-bold text-white/80">{b.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BulletSpecGrid({ items, meta }: { items: string[]; meta: CatMeta }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((raw, li) => {
        const clean = raw.replace(/^[-•]\s+/, '')
        // Try to detect a brand mentioned in the line
        const brandKey = Object.keys(BRAND_LOGOS).find((k) =>
          new RegExp(`\\b${k.replace(/\s/g, '\\s')}\\b`, 'i').test(clean),
        )
        const logo = brandKey ? BRAND_LOGOS[brandKey] : null
        const isSponsored = !!logo?.href

        return (
          <div
            key={li}
            className={`relative overflow-hidden rounded-lg border p-3 ${
              isSponsored
                ? `${meta.cardBorder} ${meta.softBg} ring-1 ring-current/10`
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <div className="flex items-start gap-3">
              {logo ? (
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isSponsored ? 'bg-white/[0.06]' : ''}`}>
                  <img
                    src={logo.src}
                    alt={logo.label}
                    className={`shrink-0 ${isSponsored ? 'size-6' : 'size-4'}`}
                    loading="lazy"
                  />
                </div>
              ) : (
                <span className={`mt-1.5 inline-block size-1.5 rounded-full ${meta.bar}`} />
              )}
              <div className="flex-1">
                <p
                  className={`mb-1 font-mono text-[9px] font-bold uppercase tracking-widest ${meta.accent}`}
                >
                  REQ · {String(li + 1).padStart(2, '0')}
                </p>
                <span className="text-sm font-medium leading-snug text-white/90">{clean}</span>
              </div>
            </div>
            {isSponsored && (
              <a
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={`mt-3 flex items-center justify-between gap-2 rounded-lg border ${meta.cardBorder} bg-white/[0.04] px-3 py-2.5 text-sm font-semibold ${meta.accent} transition-colors hover:bg-white/[0.08]`}
              >
                <span className="font-medium">Открыть {logo.label}</span>
                <ArrowUpRight className="size-4 shrink-0" />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

function RichAnswer({ text, meta }: { text: string; meta: CatMeta }) {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  const cryptos = extractCryptos(text)
  const rendered = new Set<string>()

  return (
    <div className="space-y-5 pt-5">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const allBullets = lines.length > 1 && lines.every((l) => /^[-•]\s+/.test(l))

        if (allBullets) {
          return <BulletSpecGrid key={bi} items={lines} meta={meta} />
        }

        const first = lines[0] ?? ''
        const isCallout =
          /^=\s+/.test(first) ||
          /^(кратко|итог|важно|tl;dr|in short|note)/i.test(first)

        if (isCallout) {
          const body = lines
            .map((l, idx) =>
              idx === 0
                ? l
                    .replace(/^=\s+/, '')
                    .replace(/^(кратко|итог|важно|tl;dr|in short|note)\s*[-–—:]?\s*/i, '')
                : l,
            )
            .join(' ')
          return (
            <div
              key={bi}
              className={`rounded-r-lg border-l-2 ${meta.softBg} p-4`}
              style={{ borderLeftColor: 'currentColor' }}
            >
              <div className={meta.accent}>
                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                  TL;DR · Кратко
                </p>
              </div>
              <p className="text-[13px] leading-snug text-white/90">{decorate(body, meta)}</p>
            </div>
          )
        }

        // Regular paragraph — soft-break single \n into spaces
        const body = lines.join(' ')
        const showCryptoAfter = cryptos.length > 0 && !rendered.has('crypto') && CRYPTO_KEYS.some((k) => body.includes(k))
        if (showCryptoAfter) rendered.add('crypto')

        return (
          <div key={bi} className="space-y-4">
            <div className="space-y-3">
              <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
              <p className="text-[13.5px] leading-relaxed text-white/70">{decorate(body, meta)}</p>
            </div>
            {showCryptoAfter && <CryptoStrip codes={cryptos} />}
          </div>
        )
      })}

      {/* If crypto tokens present but no paragraph triggered the strip yet, show it once */}
      {cryptos.length > 0 && !rendered.has('crypto') && <CryptoStrip codes={cryptos} />}
    </div>
  )
}

