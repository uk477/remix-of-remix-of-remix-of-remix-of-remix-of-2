import type {
  AgedAccount,
  BoostService,
  CryptoCoin,
  MarketCategory,
  Order,
  OtherService,
  ServiceCategory,
  Topup,
} from './types'
import { SUPPLIER_FRESH, SUPPLIER_OLD_DATED, retailPrice } from './supplier-twitter'

// Top-level marketplace categories shown as large cards on the home screen
export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    id: 'boost',
    route: 'catalog',
    icon: 'Rocket',
    accent: 'gold',
    featured: true,
    name: { en: 'Boost', ru: 'Накрутка / Boost', ar: 'تعزيز', zh: '推广', es: 'Impulsión', tr: 'Takipçi Arttırma', pt: 'Impulsionamento', fr: 'Boost', uk: 'Накрутка' },
    desc: { en: 'Followers, likes, views & reposts', ru: 'Фолловеры, лайки, просмотры, репосты', ar: 'متابعون، إعجابات، مشاهدات، إعادة نشر', zh: '粉丝、点赞、浏览量与转发', es: 'Seguidores, likes, views y reposts', tr: 'Takipçiler, beğeniler, görüntülenmeler ve retweetler', pt: 'Seguidores, curtidas, visualizações e reposts', fr: 'Abonnés, likes, vues et reposts', uk: 'Фолловери, лайки, перегляди та репости' },
  },
  {
    id: 'aged',
    route: 'accounts',
    icon: 'Hourglass',
    accent: 'gold',
    name: { en: 'Aged Accounts', ru: 'Aged Аккаунты', ar: 'حسابات قديمة', zh: '老账号', es: 'Cuentas antiguas', tr: 'Eski hesaplar', pt: 'Contas antigas', fr: 'Comptes anciens', uk: 'Старі акаунти' },
    desc: { en: 'Vintage X accounts by year', ru: 'Старые аккаунты X по годам', ar: 'حسابات X قديمة حسب السنة', zh: '按年份划分的老X账号', es: 'Cuentas X antiguas por año', tr: 'Yıla göre eski X hesapları', pt: 'Contas X antigas por ano', fr: 'Comptes X anciens par année', uk: 'Старі акаунти X за роками' },
  },
  {
    id: 'followers_acc',
    route: 'accounts',
    icon: 'Users',
    accent: 'gold',
    name: { en: 'Accounts with Followers', ru: 'Аккаунты с фолловерами', ar: 'حسابات مع متابعين', zh: '带粉丝账号', es: 'Cuentas con seguidores', tr: 'Takipçili hesaplar', pt: 'Contas com seguidores', fr: 'Comptes avec abonnés', uk: 'Акаунти з фолловерами' },
    desc: { en: 'Ready-made audiences', ru: 'Готовая аудитория', ar: 'جماهير جاهزة', zh: '现成受众', es: 'Audiencias listas para usar', tr: 'Hazır kitleler', pt: 'Audiências prontas', fr: 'Audiences prêtes à l\'emploi', uk: 'Готова аудиторія' },
  },
  {
    id: 'smart_acc',
    route: 'accounts',
    icon: 'BrainCircuit',
    accent: 'gold',
    name: { en: 'Smart Follower Accounts', ru: 'Аккаунты со Smart Followers', ar: 'حسابات بمتابعين أذكياء', zh: '智能粉丝账号', es: 'Cuentas con seguidores smart', tr: 'Smart takipçili hesaplar', pt: 'Contas com seguidores smart', fr: 'Comptes avec abonnés smart', uk: 'Акаунти зі smart-фолловерами' },
    desc: { en: 'High-value niche audiences', ru: 'Ценная нишевая аудитория', ar: 'جماهير متخصصة عالية القيمة', zh: '高价值垂直受众', es: 'Audiencias nicho de alto valor', tr: 'Yüksek değerli niş kitleler', pt: 'Audiências nicho de alto valor', fr: 'Audiences de niche à forte valeur', uk: 'Цінна нішева аудиторія' },
  },
  {
    id: 'blue_acc',
    route: 'accounts',
    icon: 'BadgeCheck',
    accent: 'blue',
    name: { en: 'Blue Checkmark Accounts', ru: 'Аккаунты с синей галочкой', ar: 'حسابات بعلامة زرقاء', zh: '蓝标账号', es: 'Cuentas con check azul', tr: 'Mavi onaylı hesaplar', pt: 'Contas verificadas azul', fr: 'Comptes avec badge bleu', uk: 'Акаунти з синьою галочкою' },
    desc: { en: 'Verified X Premium', ru: 'Верификация X Premium', ar: 'موثّق X Premium', zh: '已认证 X Premium', es: 'X Premium verificado', tr: 'Doğrulanmış X Premium', pt: 'X Premium verificado', fr: 'X Premium vérifié', uk: 'Верифікований X Premium' },
  },
  {
    id: 'gold_acc',
    route: 'accounts',
    icon: 'BadgeCheck',
    accent: 'gold',
    name: { en: 'Gold Checkmark Accounts', ru: 'Аккаунты с золотой галочкой', ar: 'حسابات بعلامة ذهبية', zh: '金标账号', es: 'Cuentas con check dorado', tr: 'Altın onaylı hesaplar', pt: 'Contas verificadas douradas', fr: 'Comptes avec badge or', uk: 'Акаунти з золотою галочкою' },
    desc: { en: 'Verified Organizations', ru: 'Верификация организаций', ar: 'مؤسسات موثّقة', zh: '已认证组织', es: 'Organizaciones verificadas', tr: 'Doğrulanmış kuruluşlar', pt: 'Organizações verificadas', fr: 'Organisations vérifiées', uk: 'Верифіковані організації' },
  },
  {
    id: 'other',
    route: 'services',
    icon: 'Sparkles',
    accent: 'gold',
    name: { en: 'Other X Services', ru: 'Другие услуги X', ar: 'خدمات X أخرى', zh: '其他 X 服务', es: 'Otros servicios X', tr: 'Diğer X hizmetleri', pt: 'Outros serviços X', fr: 'Autres services X', uk: 'Інші послуги X' },
    desc: { en: 'Verification, auto-delete & more', ru: 'Верификация, автоудаление и др.', ar: 'توثيق، حذف تلقائي والمزيد', zh: '认证、自动删除等', es: 'Verificación, auto-borrado y más', tr: 'Doğrulama, otomatik silme ve daha fazlası', pt: 'Verificação, exclusão automática e mais', fr: 'Vérification, suppression auto et plus', uk: 'Верифікація, автовидалення та інше' },
  },
]

export const CATEGORIES: ServiceCategory[] = [
  {
    id: 'followers',
    icon: 'Users',
    name: { en: 'Followers', ru: 'Фолловеры', ar: 'متابعون', zh: '粉丝', es: 'Seguidores', tr: 'Takipçiler', pt: 'Seguidores', fr: 'Abonnés', uk: 'Фолловери' },
  },
  {
    id: 'likes',
    icon: 'Heart',
    name: { en: 'Likes', ru: 'Лайки', ar: 'إعجابات', zh: '点赞', es: 'Likes', tr: 'Beğeniler', pt: 'Curtidas', fr: 'Likes', uk: 'Лайки' },
  },
  {
    id: 'reposts',
    icon: 'Repeat2',
    name: { en: 'Reposts', ru: 'Репосты', ar: 'إعادة نشر', zh: '转发', es: 'Reposts', tr: 'Retweetler', pt: 'Reposts', fr: 'Reposts', uk: 'Репости' },
  },
  {
    id: 'bookmarks',
    icon: 'Bookmark',
    name: { en: 'Bookmarks', ru: 'Закладки', ar: 'إشارات مرجعية', zh: '收藏', es: 'Guardados', tr: 'Yer imleri', pt: 'Favoritos', fr: 'Signets', uk: 'Закладки' },
  },
  {
    id: 'views',
    icon: 'Eye',
    name: { en: 'Impressions', ru: 'Показы', ar: 'انطباعات', zh: '曝光量', es: 'Impresiones', tr: 'Gösterimler', pt: 'Impressões', fr: 'Impressions', uk: 'Покази' },
  },
]

export const SERVICES: BoostService[] = [
  {
    id: 'svc_glob_followers',
    categoryId: 'followers',
    region: 'global',
    name: { en: 'X — Global Followers', ru: 'X — Глобальные фолловеры', ar: 'X — متابعون عالميون', zh: 'X — 全球粉丝', es: 'X — Seguidores globales', tr: 'X — Global Takipçiler', pt: 'X — Seguidores globais', fr: 'X — Abonnés globaux', uk: 'X — Глобальні фолловери' },
    description: { en: 'High quality global followers with profile pictures. Stable and refill-guaranteed.', ru: 'Качественные глобальные фолловеры с аватарами. Стабильно, с гарантией рефилла.', ar: 'متابعون عالميون عالي الجودة مع صور. مستقر مع ضمان إعادة التعبئة.', zh: '高质量全球粉丝，含头像。稳定且保障补充。', es: 'Seguidores globales de alta calidad con foto de perfil. Estables y con garantía de refill.', tr: 'Profil fotoğraflı, yüksek kaliteli global takipçiler. Stabil ve refill garantili.', pt: 'Seguidores globais de alta qualidade com fotos de perfil. Estáveis e com garantia de refill.', fr: 'Abonnés globaux de haute qualité avec photos de profil. Stables et garantis refill.', uk: 'Якісні глобальні фолловери з аватарками. Стабільно, з гарантією рефілла.' },
    pricePer1000: 1.0,
    min: 100,
    max: 30000,
    refill: true,
    cancel: false,
    speed: { en: '1k–5k / day', ru: '1k–5k / день', ar: '1k–5k / يوم', zh: '1k–5k / 天', es: '1k–5k / día', tr: '1k–5k / gün', pt: '1k–5k / dia', fr: '1k–5k / jour', uk: '1k–5k / день' },
    popular: true,
  },
  {
    id: 'svc_premium_followers',
    categoryId: 'followers',
    region: 'global',
    name: { en: 'X — Premium Followers', ru: 'X — Премиум фолловеры', ar: 'X — متابعون مميزون', zh: 'X — 高级粉丝', es: 'X — Seguidores premium', tr: 'X — Premium Takipçiler', pt: 'X — Seguidores premium', fr: 'X — Abonnés premium', uk: 'X — Преміум фолловери' },
    description: { en: 'Aged active accounts with real engagement. Best for credibility.', ru: 'Активные старые аккаунты с реальным вовлечением. Лучшее для репутации.', ar: 'حسابات نشطة قديمة بتفاعل حقيقي. الأفضل للمصداقية.', zh: '有真实互动的老活跃账号，最有利于可信度。', es: 'Cuentas activas antiguas con engagement real. Mejor para credibilidad.', tr: 'Gerçek etkileşimli, eski aktif hesaplar. Güvenilirlik için en iyisi.', pt: 'Contas antigas ativas com engajamento real. Melhor para credibilidade.', fr: 'Comptes anciens actifs avec un vrai engagement. Idéal pour la crédibilité.', uk: 'Активні старі акаунти з реальним вовлеченням. Найкраще для репутації.' },
    pricePer1000: 3.5,
    min: 50,
    max: 10000,
    refill: true,
    cancel: false,
    speed: { en: '500–2k / day', ru: '500–2k / день', ar: '500–2k / يوم', zh: '500–2k / 天', es: '500–2k / día', tr: '500–2k / gün', pt: '500–2k / dia', fr: '500–2k / jour', uk: '500–2k / день' },
  },
  {
    id: 'svc_likes_fast',
    categoryId: 'likes',
    name: { en: 'X — Instant Likes', ru: 'X — Мгновенные лайки', ar: 'X — إعجابات فورية', zh: 'X — 即时点赞', es: 'X — Likes instantáneos', tr: 'X — Anında Beğeniler', pt: 'X — Curtidas instantâneas', fr: 'X — Likes instantanés', uk: 'X — Миттєві лайки' },
    description: { en: 'Super fast likes on any post. Starts within minutes.', ru: 'Очень быстрые лайки на любой пост. Старт за минуты.', ar: 'إعجابات سريعة جدًا على أي منشور. تبدأ خلال دقائق.', zh: '任意帖子超快点赞，几分钟内开始。', es: 'Likes super rápidos en cualquier post. Empiezan en minutos.', tr: 'Herhangi bir gönderiye çok hızlı beğeni. Dakikalar içinde başlar.', pt: 'Curtidas super rápidas em qualquer post. Começa em minutos.', fr: 'Likes ultra-rapides sur n\'importe quel post. Démarre en quelques minutes.', uk: 'Дуже швидкі лайки на будь-який пост. Старт за хвилини.' },
    pricePer1000: 0.8,
    min: 20,
    max: 50000,
    refill: false,
    cancel: true,
    speed: { en: 'Instant', ru: 'Мгновенно', ar: 'فوري', zh: '即时', es: 'Instantáneo', tr: 'Anında', pt: 'Instantâneo', fr: 'Instantané', uk: 'Миттєво' },
    popular: true,
  },
  {
    id: 'svc_reposts',
    categoryId: 'reposts',
    name: { en: 'X — Reposts (RT)', ru: 'X — Репосты (RT)', ar: 'X — إعادة نشر', zh: 'X — 转发 (RT)', es: 'X — Reposts (RT)', tr: 'X — Retweetler (RT)', pt: 'X — Reposts (RT)', fr: 'X — Reposts (RT)', uk: 'X — Репости (RT)' },
    description: { en: 'Boost reach with real reposts from active profiles.', ru: 'Увеличьте охват реальными репостами активных профилей.', ar: 'عزز الوصول بإعادة نشر حقيقية من حسابات نشطة.', zh: '通过真实账号转发提升覆盖率。', es: 'Aumenta el alcance con reposts reales de perfiles activos.', tr: 'Aktif profillerden gerçek retweetlerle erişimi artırın.', pt: 'Aumente o alcance com reposts reais de perfis ativos.', fr: 'Booster la portée avec de vrais reposts de profils actifs.', uk: 'Збільште охоплення реальними репостами активних профілів.' },
    pricePer1000: 2.2,
    min: 10,
    max: 20000,
    refill: true,
    cancel: false,
    speed: { en: '1k / day', ru: '1k / день', ar: '1k / يوم', zh: '1k / 天', es: '1k / día', tr: '1k / gün', pt: '1k / dia', fr: '1k / jour', uk: '1k / день' },
  },
  {
    id: 'svc_bookmarks',
    categoryId: 'bookmarks',
    name: { en: 'X — Bookmarks', ru: 'X — Закладки', ar: 'X — إشارات مرجعية', zh: 'X — 收藏', es: 'X — Guardados', tr: 'X — Yer İmleri', pt: 'X — Favoritos', fr: 'X — Signets', uk: 'X — Закладки' },
    description: { en: 'Increase post bookmarks to improve algorithmic ranking.', ru: 'Увеличьте закладки поста для улучшения ранжирования.', ar: 'زد الإشارات المرجعية لتحسين الترتيب الخوارزمي.', zh: '增加帖子收藏数，提升算法排名。', es: 'Aumenta los guardados para mejorar el ranking algorítmico.', tr: 'Algoritmik sıralamayı iyileştirmek için yer imlerini artırın.', pt: 'Aumente os favoritos para melhorar o ranking algorítmico.', fr: 'Augmentez les signets pour améliorer le classement algorithmique.', uk: 'Збільште закладки, щоб покращити алгоритмічне ранжування.' },
    pricePer1000: 1.5,
    min: 10,
    max: 15000,
    refill: false,
    cancel: true,
    speed: { en: 'Fast', ru: 'Быстро', ar: 'سريع', zh: '快速', es: 'Rápido', tr: 'Hızlı', pt: 'Rápido', fr: 'Rapide', uk: 'Швидко' },
  },
  {
    id: 'svc_views',
    categoryId: 'views',
    name: { en: 'X — Video / Post Views', ru: 'X — Просмотры', ar: 'X — مشاهدات', zh: 'X — 视频/帖子浏览量', es: 'X — Views de video / post', tr: 'X — Video / Gösterim', pt: 'X — Views de vídeo / post', fr: 'X — Vues vidéo / post', uk: 'X — Перегляди відео / постів' },
    description: { en: 'Cheap and fast views for posts and videos.', ru: 'Дёшево и быстро — просмотры постов и видео.', ar: 'مشاهدات رخيصة وسريعة للمنشورات والفيديو.', zh: '低价快速提升帖子和视频浏览量。', es: 'Views baratos y rápidos para posts y videos.', tr: 'Gönderi ve videolar için ucuz ve hızlı görüntülenme.', pt: 'Visualizações baratas e rápidas para posts e vídeos.', fr: 'Vues bon marché et rapides pour posts et vidéos.', uk: 'Дешеві та швидкі перегляди постів і відео.' },
    pricePer1000: 0.15,
    min: 100,
    max: 1000000,
    refill: false,
    cancel: false,
    speed: { en: 'Instant', ru: 'Мгновенно', ar: 'فوري', zh: '即时', es: 'Instantáneo', tr: 'Anında', pt: 'Instantâneo', fr: 'Instantané', uk: 'Миттєво' },
  },
  // ── Regional followers ────────────────────────────────────────────────
  {
    id: 'svc_jp_followers',
    categoryId: 'followers',
    region: 'jp',
    name: { en: 'X — Japan Followers', ru: 'X — Японские фолловеры', ar: 'X — متابعون يابانيون', zh: 'X — 日本粉丝', es: 'X — Seguidores Japón', tr: 'X — Japon Takipçiler', pt: 'X — Seguidores Japão', fr: 'X — Abonnés Japon', uk: 'X — Японські фолловери' },
    description: { en: 'Japanese-region followers with local activity. Ideal for JP audiences.', ru: 'Фолловеры из Японии с локальной активностью. Идеально для JP-аудитории.', ar: 'متابعون من اليابان بنشاط محلي.', zh: '来自日本的粉丝，含本地活跃度。', es: 'Seguidores de la región JP con actividad local.', tr: 'Yerel aktiviteye sahip Japonya bölgesi takipçileri.', pt: 'Seguidores da região do Japão com atividade local.', fr: 'Abonnés région JP avec activité locale.', uk: 'Фолловери з Японії з локальною активністю.' },
    pricePer1000: 5.5,
    min: 50,
    max: 8000,
    refill: true,
    cancel: false,
    speed: { en: '500 / day', ru: '500 / день', ar: '500 / يوم', zh: '500 / 天', es: '500 / día', tr: '500 / gün', pt: '500 / dia', fr: '500 / jour', uk: '500 / день' },
    popular: true,
  },
  {
    id: 'svc_kr_followers',
    categoryId: 'followers',
    region: 'kr',
    name: { en: 'X — Korea Followers', ru: 'X — Корейские фолловеры', ar: 'X — متابعون كوريون', zh: 'X — 韩国粉丝', es: 'X — Seguidores Corea', tr: 'X — Kore Takipçiler', pt: 'X — Seguidores Coreia', fr: 'X — Abonnés Corée', uk: 'X — Корейські фолловери' },
    description: { en: 'K-region followers with real profile signals. Perfect for K-pop / KR launches.', ru: 'Корейские фолловеры с реальными сигналами профиля. Идеально для K-pop и KR-запусков.', ar: 'متابعون كوريون بإشارات ملف شخصي حقيقية.', zh: '韩国地区真实资料信号粉丝，K-pop 首发首选。', es: 'Seguidores región K con señales reales.', tr: 'Gerçek profil sinyallerine sahip Kore bölgesi takipçileri.', pt: 'Seguidores da região K com sinais reais.', fr: 'Abonnés région K avec signaux réels.', uk: 'Корейські фолловери з реальними сигналами профілю.' },
    pricePer1000: 5.9,
    min: 50,
    max: 8000,
    refill: true,
    cancel: false,
    speed: { en: '500 / day', ru: '500 / день', ar: '500 / يوم', zh: '500 / 天', es: '500 / día', tr: '500 / gün', pt: '500 / dia', fr: '500 / jour', uk: '500 / день' },
  },
  {
    id: 'svc_us_followers',
    categoryId: 'followers',
    region: 'us',
    name: { en: 'X — USA Followers', ru: 'X — Американские фолловеры', ar: 'X — متابعون أمريكيون', zh: 'X — 美国粉丝', es: 'X — Seguidores EEUU', tr: 'X — ABD Takipçiler', pt: 'X — Seguidores EUA', fr: 'X — Abonnés USA', uk: 'X — Американські фолловери' },
    description: { en: 'US-region followers — best for ad reach and Western audiences.', ru: 'Американские фолловеры — лучше всего для охвата рекламы и западной аудитории.', ar: 'متابعون من الولايات المتحدة — الأفضل للجمهور الغربي.', zh: '美国地区粉丝，最适合广告与西方受众。', es: 'Seguidores US — mejores para alcance publicitario y audiencia occidental.', tr: 'ABD bölgesi takipçileri — reklam erişimi için en iyisi.', pt: 'Seguidores dos EUA — ideais para alcance publicitário.', fr: 'Abonnés région US — idéal pour la portée publicitaire.', uk: 'Американські фолловери — найкраще для реклами.' },
    pricePer1000: 6.5,
    min: 50,
    max: 10000,
    refill: true,
    cancel: false,
    speed: { en: '1k / day', ru: '1k / день', ar: '1k / يوم', zh: '1k / 天', es: '1k / día', tr: '1k / gün', pt: '1k / dia', fr: '1k / jour', uk: '1k / день' },
    popular: true,
  },
]

export const OTHER_SERVICES: OtherService[] = [
  {
    id: 'svc_verification',
    icon: 'BadgeCheck',
    name: { en: 'Account Verification', ru: 'Верификация аккаунта', ar: 'توثيق الحساب', zh: '账号认证', es: 'Verificación de cuenta', tr: 'Hesap doğrulama', pt: 'Verificação de conta', fr: 'Vérification de compte', uk: 'Верифікація акаунта' },
    description: { en: 'Get the blue checkmark on your own X account. We handle the full X Premium setup.', ru: 'Получите синюю галочку на своём аккаунте X. Полностью оформим X Premium за вас.', ar: 'احصل على العلامة الزرقاء لحسابك على X. نتولى إعداد X Premium بالكامل.', zh: '为您的X账号获取蓝标，我们全程处理X Premium设置。', es: 'Obtén la check azul en tu cuenta X. Nosotros gestionamos toda la configuración de X Premium.', tr: 'Kendi X hesabınızda mavi onay rozeti alın. X Premium kurulumunu tamamen biz hallediyoruz.', pt: 'Obtenha o selo azul na sua conta X. Cuidamos de toda a configuração do X Premium.', fr: 'Obtenez le badge bleu sur votre propre compte X. Nous gérons toute la configuration X Premium.', uk: 'Отримайте синю галочку на своєму акаунті X. Ми повністю оформляємо X Premium за вас.' },
    price: 29.0,
    unit: { en: 'one-time', ru: 'разово', ar: 'مرة واحدة', zh: '一次性', es: 'una vez', tr: 'tek seferlik', pt: 'uma vez', fr: 'une fois', uk: 'разово' },
    badge: { en: 'Popular', ru: 'Хит', ar: 'الأكثر طلبًا', zh: '热门', es: 'Popular', tr: 'Popüler', pt: 'Popular', fr: 'Populaire', uk: 'Хіт' },
    features: [
      { en: 'Blue checkmark', ru: 'Синяя галочка', ar: 'علامة زرقاء', zh: '蓝色认证标', es: 'Check azul', tr: 'Mavi onay rozeti', pt: 'Selo azul', fr: 'Badge bleu', uk: 'Синя галочка' },
      { en: 'Keeps your @handle', ru: 'Сохраняет ваш @', ar: 'يحافظ على معرّفك', zh: '保留您的@用户名', es: 'Mantiene tu @usuario', tr: '@kullanıcı adını korur', pt: 'Mantém seu @usuário', fr: 'Garde votre @handle', uk: 'Зберігає ваш @username' },
      { en: '3–7 days', ru: '3–7 дней', ar: '3–7 أيام', zh: '3–7天', es: '3–7 días', tr: '3–7 gün', pt: '3–7 dias', fr: '3–7 jours', uk: '3–7 днів' },
    ],
  },
  {
    id: 'svc_auto_delete',
    icon: 'Trash2',
    name: { en: 'Auto-Delete Tweets', ru: 'Автоудаление твитов', ar: 'حذف التغريدات تلقائيًا', zh: '自动删除推文', es: 'Auto-borrar tweets', tr: 'Tweetleri Otomatik Sil', pt: 'Auto-excluir tweets', fr: 'Auto-suppression de tweets', uk: 'Автовидалення твітів' },
    description: { en: 'Automatically delete your old tweets on a schedule. Keep your profile clean and private.', ru: 'Автоматически удаляйте старые твиты по расписанию. Держите профиль чистым и приватным.', ar: 'احذف تغريداتك القديمة تلقائيًا وفق جدول. حافظ على نظافة وخصوصية ملفك.', zh: '按计划自动删除旧推文，保持个人资料整洁私密。', es: 'Borra automáticamente tus tweets antiguos según un calendario. Mantén tu perfil limpio y privado.', tr: 'Eski tweetlerinizi programa göre otomatik silin. Profilinizi temiz ve özel tutun.', pt: 'Exclua automaticamente seus tweets antigos em uma programação. Mantenha seu perfil limpo e privado.', fr: 'Supprimez automatiquement vos anciens tweets selon un planning. Gardez votre profil propre et privé.', uk: 'Автоматично видаляйте старі твіти за розкладом. Тримайте профіль чистим і приватним.' },
    price: 9.0,
    unit: { en: 'per month', ru: 'в месяц', ar: 'شهريًا', zh: '每月', es: 'por mes', tr: 'aylık', pt: 'por mês', fr: 'par mois', uk: 'на місяць' },
    features: [
      { en: 'Custom schedule', ru: 'Гибкое расписание', ar: 'جدول مخصص', zh: '自定义计划', es: 'Calendario personalizado', tr: 'Özel program', pt: 'Agenda personalizada', fr: 'Planning personnalisé', uk: 'Гнучкий розклад' },
      { en: 'Keep pinned tweets', ru: 'Сохраняет закреплённые', ar: 'يبقي المثبتة', zh: '保留置顶推文', es: 'Mantener tweets fijados', tr: 'Sabitlenmiş tweetleri koru', pt: 'Manter tweets fixados', fr: 'Garder les tweets épinglés', uk: 'Зберігає закріплені твіти' },
      { en: 'Unlimited tweets', ru: 'Без лимита твитов', ar: 'تغريدات غير محدودة', zh: '无限制推文', es: 'Tweets ilimitados', tr: 'Sınırsız tweet', pt: 'Tweets ilimitados', fr: 'Tweets illimités', uk: 'Без ліміта твітів' },
    ],
  },
  {
    id: 'svc_handle_change',
    icon: 'AtSign',
    name: { en: 'Username (@handle) Change', ru: 'Смена имени (@)', ar: 'تغيير اسم المستخدم (@)', zh: '用户名（@handle）更改', es: 'Cambio de nombre de usuario (@handle)', tr: 'Kullanıcı Adı (@handle) Değişikliği', pt: 'Mudança de nome de usuário (@handle)', fr: 'Changement de nom d\'utilisateur (@handle)', uk: 'Зміна імені користувача (@handle)' },
    description: { en: 'Secure a rare or taken @username for your account through our channels.', ru: 'Получите редкий или занятый @username для вашего аккаунта через наши каналы.', ar: 'احصل على اسم مستخدم نادر أو محجوز لحسابك عبر قنواتنا.', zh: '通过我们的渠道为您的账号获取稀有或已被占用的@用户名。', es: 'Asegura un @username raro o tomado para tu cuenta a través de nuestros canales.', tr: 'Kanallarımız aracılığıyla hesabınız için nadir veya alınmış bir @kullanıcı adı edinin.', pt: 'Garanta um @username raro ou já utilizado para sua conta por meio de nossos canais.', fr: 'Sécurisez un @nom d\'utilisateur rare ou pris pour votre compte via nos canaux.', uk: 'Закріпіть рідкісний або зайнятий @username для вашого акаунта через наші канали.' },
    price: 49.0,
    unit: { en: 'one-time', ru: 'разово', ar: 'مرة واحدة', zh: '一次性', es: 'una vez', tr: 'tek seferlik', pt: 'uma vez', fr: 'une fois', uk: 'разово' },
    features: [
      { en: 'Rare handles', ru: 'Редкие @', ar: 'معرّفات نادرة', zh: '稀有用户名', es: 'Handles raros', tr: 'Nadir kullanıcı adları', pt: 'Handles raros', fr: 'Noms d\'utilisateur rares', uk: 'Рідкісні @імена' },
      { en: 'Safe transfer', ru: 'Безопасная передача', ar: 'نقل آمن', zh: '安全转让', es: 'Transferencia segura', tr: 'Güvenli transfer', pt: 'Transferência segura', fr: 'Transfert sécurisé', uk: 'Безпечна передача' },
    ],
  },
  {
    id: 'svc_ghostban_check',
    icon: 'ShieldAlert',
    name: { en: 'Shadowban Removal', ru: 'Снятие теневого бана', ar: 'إزالة الحظر الظلي', zh: '解除影子封禁', es: 'Eliminación de Shadowban', tr: 'Shadowban Kaldırma', pt: 'Remoção de Shadowban', fr: 'Suppression du Shadowban', uk: 'Зняття тіньового бану' },
    description: { en: 'Full shadowban diagnostic and removal so your posts reach the timeline again.', ru: 'Диагностика и снятие теневого бана — ваши посты снова попадут в ленту.', ar: 'تشخيص كامل وإزالة الحظر الظلي لتصل منشوراتك للتايم لاين مجددًا.', zh: '全面诊断并解除影子封禁，让您的帖子重新出现在时间线中。', es: 'Diagnóstico completo y eliminación del shadowban para que tus publicaciones vuelvan a aparecer en el timeline.', tr: 'Gönderilerinizin zaman akışına tekrar ulaşması için tam shadowban teşhisi ve kaldırma.', pt: 'Diagnóstico completo e remoção do shadowban para que suas publicações alcancem o timeline novamente.', fr: 'Diagnostic complet et suppression du shadowban pour que vos posts réapparaissent dans le fil d\'actualité.', uk: 'Повна діагностика та зняття тіньового бану, щоб ваші пости знову потрапляли до стрічки.' },
    price: 19.0,
    unit: { en: 'one-time', ru: 'разово', ar: 'مرة واحدة', zh: '一次性', es: 'una vez', tr: 'tek seferlik', pt: 'uma vez', fr: 'une fois', uk: 'разово' },
    features: [
      { en: 'Full diagnostic', ru: 'Полная диагностика', ar: 'تشخيص كامل', zh: '全面诊断', es: 'Diagnóstico completo', tr: 'Tam teşhis', pt: 'Diagnóstico completo', fr: 'Diagnostic complet', uk: 'Повна діагностика' },
      { en: 'Reach restored', ru: 'Охват восстановлен', ar: 'استعادة الوصول', zh: '覆盖率恢复', es: 'Alcance restaurado', tr: 'Erişim yenilendi', pt: 'Alcance restaurado', fr: 'Portée restaurée', uk: 'Охоплення відновлено' },
    ],
  },
  {
    id: 'svc_recovery',
    icon: 'KeyRound',
    name: { en: 'Account Recovery', ru: 'Восстановление аккаунта', ar: 'استعادة الحساب', zh: '账号找回', es: 'Recuperación de cuenta', tr: 'Hesap Kurtarma', pt: 'Recuperação de conta', fr: 'Récupération de compte', uk: 'Відновлення акаунта' },
    description: { en: 'Locked or suspended? We help recover access to your X account.', ru: 'Аккаунт заблокирован или приостановлен? Поможем восстановить доступ к X.', ar: 'حساب مقفل أو موقوف؟ نساعدك في استعادة الوصول إلى حسابك على X.', zh: '账号被锁定或封禁？我们帮助您恢复X账号访问权限。', es: '¿Bloqueado o suspendido? Te ayudamos a recuperar el acceso a tu cuenta X.', tr: 'Kilitlendi mi veya askıya alındı mı? X hesabınıza erişimi geri kazanmanıza yardım ediyoruz.', pt: 'Bloqueado ou suspenso? Ajudamos a recuperar o acesso à sua conta X.', fr: 'Bloqué ou suspendu ? Nous vous aidons à récupérer l\'accès à votre compte X.', uk: 'Заблоковано або призупинено? Допомагаємо відновити доступ до вашого акаунта X.' },
    price: 39.0,
    unit: { en: 'one-time', ru: 'разово', ar: 'مرة واحدة', zh: '一次性', es: 'una vez', tr: 'tek seferlik', pt: 'uma vez', fr: 'une fois', uk: 'разово' },
    features: [
      { en: 'Suspension appeals', ru: 'Апелляции блокировок', ar: 'استئناف الإيقاف', zh: '封禁申诉', es: 'Apelaciones de suspensión', tr: 'Askıya alma itirazları', pt: 'Recursos de suspensão', fr: 'Appels de suspension', uk: 'Апеляції щодо блокувань' },
      { en: 'Access restore', ru: 'Возврат доступа', ar: 'استعادة الوصول', zh: '恢复访问', es: 'Restauración de acceso', tr: 'Erişim geri yükleme', pt: 'Restauração de acesso', fr: 'Restauration de l\'accès', uk: 'Відновлення доступу' },
    ],
  },
  {
    id: 'svc_pinned_promo',
    icon: 'Megaphone',
    name: { en: 'Promo Post Boost', ru: 'Продвижение поста', ar: 'تعزيز منشور ترويجي', zh: '推广帖子', es: 'Impulso de publicación promocional', tr: 'Promosyon Gönderi Artırma', pt: 'Impulsionamento de post promocional', fr: 'Boost de post promotionnel', uk: 'Просування рекламного поста' },
    description: { en: 'Managed promotion of a single post across niche communities for maximum reach.', ru: 'Ручное продвижение одного поста по нишевым сообществам для максимального охвата.', ar: 'ترويج مُدار لمنشور واحد عبر مجتمعات متخصصة لأقصى وصول.', zh: '通过垂直社区对单篇帖子进行专业推广，实现最大覆盖。', es: 'Promoción gestionada de una sola publicación en comunidades de nicho para máximo alcance.', tr: 'Maksimum erişim için tek bir gönderinin niş topluluklarda yönetilen tanıtımı.', pt: 'Promoção gerenciada de uma única publicação em comunidades de nicho para máximo alcance.', fr: 'Promotion gérée d\'un seul post dans des communautés de niche pour une portée maximale.', uk: 'Кероване просування одного поста у нішевих спільнотах для максимального охоплення.' },
    price: 25.0,
    unit: { en: 'per post', ru: 'за пост', ar: 'لكل منشور', zh: '每篇帖子', es: 'por publicación', tr: 'gönderi başına', pt: 'por publicação', fr: 'par post', uk: 'за пост' },
    features: [
      { en: 'Niche targeting', ru: 'Нишевый таргет', ar: 'استهداف متخصص', zh: '垂直定向', es: 'Segmentación de nicho', tr: 'Niş hedefleme', pt: 'Segmentação de nicho', fr: 'Ciblage de niche', uk: 'Нішевий таргетинг' },
      { en: 'Report included', ru: 'С отчётом', ar: 'مع تقرير', zh: '含报告', es: 'Informe incluido', tr: 'Rapor dahil', pt: 'Relatório incluído', fr: 'Rapport inclus', uk: 'Зі звітом' },
    ],
  },
]

// Per-year aged accounts, mirrored 1:1 from the supplier catalog (Old Dated
// Twitter Accounts, 2007..2026) with retail markup applied.
function agedBadge(year: number, stock: number): AgedAccount['badge'] | undefined {
  if (year <= 2008) return { en: 'OG · Legendary', ru: 'OG · Легенда', ar: 'OG · أسطوري', zh: 'OG · 传奇', es: 'OG · Legendaria', tr: 'OG · Efsanevi', pt: 'OG · Lendária', fr: 'OG · Légendaire', uk: 'OG · Легенда' }
  if (year <= 2010) return { en: 'OG', ru: 'OG', ar: 'OG', zh: 'OG', es: 'OG', tr: 'OG', pt: 'OG', fr: 'OG', uk: 'OG' }
  if (stock >= 1000) return { en: 'Best value', ru: 'Топ цена', ar: 'أفضل قيمة', zh: '性价比', es: 'Mejor precio', tr: 'En iyi fiyat', pt: 'Melhor custo', fr: 'Meilleur prix', uk: 'Топ ціна' }
  if (stock > 0 && stock <= 25) return { en: 'Rare', ru: 'Редкий', ar: 'نادر', zh: '稀有', es: 'Rara', tr: 'Nadir', pt: 'Raro', fr: 'Rare', uk: 'Рідкісний' }
  return undefined
}

const AGED_YEARS: Array<{
  year: number
  price: number
  base: number
  stock: number
  followers: number
  badge?: AgedAccount['badge']
}> = SUPPLIER_OLD_DATED.map((y) => ({
  year: y.year,
  price: retailPrice(y.base, 'dated'),
  base: y.base,
  stock: y.stock,
  followers: 0,
  badge: agedBadge(y.year, y.stock),
}))

const AGED_FEATURES_COMMON: AgedAccount['features'] = [
  { en: 'Email included', ru: 'Почта в комплекте', ar: 'البريد مرفق', zh: '含邮箱', es: 'Email incluido', tr: 'E-posta dahil', pt: 'E-mail incluído', fr: 'E-mail inclus', uk: 'Пошта в комплекті' },
  { en: 'Full access', ru: 'Полный доступ', ar: 'وصول كامل', zh: '完整访问权限', es: 'Acceso completo', tr: 'Tam erişim', pt: 'Acesso completo', fr: 'Accès complet', uk: 'Повний доступ' },
  { en: '2FA ready', ru: 'Готов к 2FA', ar: 'جاهز لـ 2FA', zh: '支持2FA', es: 'Compatible con 2FA', tr: '2FA hazır', pt: 'Pronto para 2FA', fr: 'Prêt pour 2FA', uk: 'Готовий до 2FA' },
]

function agedDesc(year: number): AgedAccount['description'] {
  const age = 2026 - year
  if (age >= 15) return { en: `OG vintage account from ${year}. Extremely rare, maximum trust.`, ru: `Винтажный OG-аккаунт ${year} года. Крайне редкий, максимум доверия.`, ar: `حساب OG قديم من ${year}. نادر جدًا وموثوق للغاية.`, zh: `${year} 年的 OG 老号，极为稀有，信任度极高。`, es: `Cuenta OG vintage de ${year}. Extremadamente rara, máxima confianza.`, tr: `${year} yılından OG vintage hesap. Son derece nadir, maksimum güven.`, pt: `Conta OG vintage de ${year}. Extremamente rara, máxima confiança.`, fr: `Compte OG vintage de ${year}. Extrêmement rare, confiance maximale.`, uk: `Вінтажний OG-акаунт ${year} року. Надзвичайно рідкісний, максимум довіри.` }
  if (age >= 8) return { en: `Well-aged ${year} account — ideal balance of trust and price.`, ru: `Хорошо отлежавшийся аккаунт ${year} года — идеальный баланс доверия и цены.`, ar: `حساب ${year} قديم جيدًا — توازن مثالي بين الثقة والسعر.`, zh: `${year} 年成熟老号 — 信任度与价格的完美平衡。`, es: `Cuenta de ${year} bien envejecida — equilibrio ideal entre confianza y precio.`, tr: `${year} yılından iyi eskitilmiş hesap — güven ve fiyat arasında ideal denge.`, pt: `Conta de ${year} bem amadurecida — equilíbrio ideal entre confiança e preço.`, fr: `Compte de ${year} bien vieilli — équilibre idéal entre confiance et prix.`, uk: `Добре вистояний акаунт ${year} року — ідеальний баланс довіри та ціни.` }
  if (age >= 3) return { en: `Solid ${year} account for daily work and campaigns.`, ru: `Надёжный аккаунт ${year} года для повседневной работы и кампаний.`, ar: `حساب ${year} موثوق للعمل اليومي والحملات.`, zh: `适合日常工作和推广活动的 ${year} 年账号。`, es: `Cuenta sólida de ${year} para trabajo diario y campañas.`, tr: `Günlük iş ve kampanyalar için sağlam ${year} hesabı.`, pt: `Conta sólida de ${year} para trabalho diário e campanhas.`, fr: `Compte solide de ${year} pour le travail quotidien et les campagnes.`, uk: `Надійний акаунт ${year} року для щоденної роботи та кампаній.` }
  return { en: `Fresh ${year} account, ideal for bulk and automation.`, ru: `Свежий аккаунт ${year} года — отлично для массовых задач и автоматизации.`, ar: `حساب ${year} جديد، مثالي للكميات الكبيرة والأتمتة.`, zh: `${year} 年全新账号，适合批量和自动化。`, es: `Cuenta nueva de ${year}, ideal para volumen y automatización.`, tr: `Yeni ${year} hesabı, toplu ve otomasyon için ideal.`, pt: `Conta nova de ${year}, ideal para volume e automação.`, fr: `Compte récent de ${year}, idéal pour le volume et l'automatisation.`, uk: `Свіжий акаунт ${year} року, чудово для масових задач та автоматизації.` }
}

const AGED_ACCOUNTS: AgedAccount[] = AGED_YEARS.map((y) => ({
  id: `acc_year_${y.year}`,
  category: 'aged',
  name: {
    en: 'Nickname',
    ru: 'Nickname',
    ar: 'Nickname',
    zh: 'Nickname',
    es: 'Nickname',
    tr: 'Nickname',
    pt: 'Nickname',
    fr: 'Nickname',
    uk: 'Nickname',
  },
  description: agedDesc(y.year),
  yearRange: String(y.year),
  year: y.year,
  pricePerAccount: y.price,
  supplierBase: y.base,
  supplierKind: 'dated' as const,
  stock: y.stock,
  followers: y.followers,
  badge: y.badge,
  features: AGED_FEATURES_COMMON,
}))

// Fresh Twitter Accounts — bulk blanks from the supplier ($0.05 base).
const FRESH_ACCOUNT: AgedAccount = {
  id: 'acc_fresh_bulk',
  category: 'aged',
  name: { en: 'Fresh', ru: 'Fresh', ar: 'Fresh', zh: 'Fresh', es: 'Fresh', tr: 'Fresh', pt: 'Fresh', fr: 'Fresh', uk: 'Fresh' },
  description: {
    en: 'Fresh Twitter (X) blanks with email access and ct0 cookie. Perfect for bulk and automation.',
    ru: 'Свежие пустышки Twitter (X) с почтой и cookie ct0. Идеально для опта и автоматизации.',
    ar: 'حسابات Twitter (X) جديدة مع بريد وكوكي ct0. مثالية للجملة والأتمتة.',
    zh: '带邮箱和 ct0 cookie 的全新 Twitter (X) 空号，适合批量与自动化。',
    es: 'Cuentas nuevas de Twitter (X) con email y cookie ct0. Ideal para volumen y automatización.',
    tr: 'E-posta ve ct0 çerezli yeni Twitter (X) hesapları. Toplu ve otomasyon için ideal.',
    pt: 'Contas novas do Twitter (X) com e-mail e cookie ct0. Ideal para volume e automação.',
    fr: 'Comptes Twitter (X) neufs avec e-mail et cookie ct0. Idéal pour le volume et l\'automatisation.',
    uk: 'Свіжі пустишки Twitter (X) з поштою та cookie ct0. Ідеально для опту та автоматизації.',
  },
  yearRange: 'FRESH',
  year: SUPPLIER_FRESH.year,
  pricePerAccount: retailPrice(SUPPLIER_FRESH.base, 'fresh'),
  supplierBase: SUPPLIER_FRESH.base,
  supplierKind: 'fresh',
  stock: SUPPLIER_FRESH.stock,
  followers: 0,
  badge: { en: 'Bulk', ru: 'Опт', ar: 'بالجملة', zh: '批量', es: 'Volumen', tr: 'Toplu', pt: 'Volume', fr: 'En gros', uk: 'Опт' },
  features: [
    { en: 'Email included', ru: 'Почта в комплекте', ar: 'البريد مرفق', zh: '含邮箱', es: 'Email incluido', tr: 'E-posta dahil', pt: 'E-mail incluído', fr: 'E-mail inclus', uk: 'Пошта в комплекті' },
    { en: 'ct0 + auth_token', ru: 'ct0 + auth_token', ar: 'ct0 + auth_token', zh: 'ct0 + auth_token', es: 'ct0 + auth_token', tr: 'ct0 + auth_token', pt: 'ct0 + auth_token', fr: 'ct0 + auth_token', uk: 'ct0 + auth_token' },
    { en: 'Instant delivery', ru: 'Моментальная выдача', ar: 'تسليم فوري', zh: '即时交付', es: 'Entrega instantánea', tr: 'Anında teslim', pt: 'Entrega instantânea', fr: 'Livraison instantanée', uk: 'Миттєва видача' },
  ],
}

export const ACCOUNTS: AgedAccount[] = [
  FRESH_ACCOUNT,
  ...AGED_ACCOUNTS,
  // --- Accounts with followers ---
  {
    id: 'acc_foll_1k',
    category: 'followers_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Established account with 1K real-looking followers. Great starter audience.', ru: 'Раскрученный аккаунт с 1K живых фолловеров. Отличный старт.', ar: 'حساب راسخ مع 1000 متابع واقعي. جمهور بداية رائع.', zh: '拥有1K真实外观粉丝的成熟账号，适合入门受众。', es: 'Cuenta establecida con 1K de seguidores de aspecto real. Gran audiencia inicial.', tr: 'Gerçek görünümlü 1K takipçili köklü hesap. Başlangıç kitlesi için harika.', pt: 'Conta estabelecida com 1K de seguidores de aparência real. Ótima audiência inicial.', fr: 'Compte établi avec 1 000 abonnés d\'apparence réelle. Excellente audience de départ.', uk: 'Розкручений акаунт з 1K реалістичних підписників. Чудова стартова аудиторія.' },
    yearRange: '2018–2021',
    pricePerAccount: 12.0,
    stock: 38,
    followers: 1000,
    features: [
      { en: 'Email included', ru: 'Почта в комплекте', ar: 'البريد مرفق', zh: '含邮箱', es: 'Email incluido', tr: 'E-posta dahil', pt: 'E-mail incluído', fr: 'E-mail inclus', uk: 'Пошта в комплекті' },
      { en: 'Real followers', ru: 'Живые фолловеры', ar: 'متابعون حقيقيون', zh: '真实粉丝', es: 'Seguidores reales', tr: 'Gerçek takipçiler', pt: 'Seguidores reais', fr: 'Vrais abonnés', uk: 'Реальні підписники' },
    ],
  },
  {
    id: 'acc_foll_10k',
    category: 'followers_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Mid-tier influencer account with 10K engaged followers.', ru: 'Аккаунт уровня микро-инфлюенсера с 10K вовлечённых фолловеров.', ar: 'حساب مؤثر متوسط مع 10 آلاف متابع متفاعل.', zh: '中级影响力账号，拥有1万活跃粉丝。', es: 'Cuenta de influencer de nivel medio con 10K seguidores comprometidos.', tr: '10K aktif takipçili orta seviye influencer hesabı.', pt: 'Conta de influenciador de nível médio com 10K seguidores engajados.', fr: 'Compte d\'influenceur de niveau intermédiaire avec 10 000 abonnés engagés.', uk: 'Акаунт мікро-інфлюенсера з 10K залучених підписників.' },
    yearRange: '2016–2020',
    pricePerAccount: 89.0,
    stock: 11,
    followers: 10000,
    badge: { en: 'Hot', ru: 'Хит', ar: 'رائج', zh: '热销', es: 'Tendencia', tr: 'Popüler', pt: 'Em alta', fr: 'Tendance', uk: 'Хіт' },
    features: [
      { en: 'Email included', ru: 'Почта в комплекте', ar: 'البريد مرفق', zh: '含邮箱', es: 'Email incluido', tr: 'E-posta dahil', pt: 'E-mail incluído', fr: 'E-mail inclus', uk: 'Пошта в комплекті' },
      { en: 'Organic growth', ru: 'Органический рост', ar: 'نمو عضوي', zh: '自然增长', es: 'Crecimiento orgánico', tr: 'Organik büyüme', pt: 'Crescimento orgânico', fr: 'Croissance organique', uk: 'Органічне зростання' },
    ],
  },
  {
    id: 'acc_foll_50k',
    category: 'followers_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Large audience account, perfect for brands and media pages.', ru: 'Крупная аудитория — идеально для брендов и медиа-страниц.', ar: 'حساب بجمهور كبير، مثالي للعلامات التجارية.', zh: '大型受众账号，适合品牌和媒体页面。', es: 'Cuenta con gran audiencia, perfecta para marcas y páginas de medios.', tr: 'Büyük kitleli hesap, markalar ve medya sayfaları için mükemmel.', pt: 'Conta com grande audiência, perfeita para marcas e páginas de mídia.', fr: 'Compte avec une grande audience, parfait pour les marques et pages médias.', uk: 'Акаунт з великою аудиторією, ідеальний для брендів та медіа-сторінок.' },
    yearRange: '2014–2018',
    pricePerAccount: 340.0,
    stock: 4,
    followers: 50000,
    features: [
      { en: 'Email included', ru: 'Почта в комплекте', ar: 'البريد مرفق', zh: '含邮箱', es: 'Email incluido', tr: 'E-posta dahil', pt: 'E-mail incluído', fr: 'E-mail inclus', uk: 'Пошта в комплекті' },
      { en: 'Full transfer', ru: 'Полная передача', ar: 'نقل كامل', zh: '完整转让', es: 'Transferencia completa', tr: 'Tam transfer', pt: 'Transferência completa', fr: 'Transfert complet', uk: 'Повна передача' },
    ],
  },
  // --- Themed follower accounts (each niche has its own card) ---
  ...([
    { id: 'foll_crypto',   fol: 24500,  year: '2017–2020', price: 480,  stock: 5, ru: 'Крипто · 24.5K',   en: 'Crypto · 24.5K',   verif: 'blue'  as const },
    { id: 'foll_ai',       fol: 18200,  year: '2019–2022', price: 320,  stock: 8, ru: 'ИИ · 18.2K',        en: 'AI · 18.2K',        verif: undefined },
    { id: 'foll_nsfw',     fol: 65000,  year: '2016–2019', price: 540,  stock: 2, ru: '18+ · 65K',         en: '18+ · 65K',         verif: undefined },
    { id: 'foll_gaming',   fol: 42000,  year: '2015–2018', price: 380,  stock: 4, ru: 'Игры · 42K',        en: 'Gaming · 42K',      verif: 'blue'  as const },
    { id: 'foll_finance',  fol: 12800,  year: '2013–2017', price: 610,  stock: 3, ru: 'Финансы · 12.8K',   en: 'Finance · 12.8K',   verif: 'blue'  as const },
    { id: 'foll_business', fol: 33500,  year: '2014–2018', price: 450,  stock: 6, ru: 'Бизнес · 33.5K',    en: 'Business · 33.5K',  verif: undefined },
    { id: 'foll_lifestyle',fol: 28000,  year: '2017–2021', price: 260,  stock: 7, ru: 'Лайфстайл · 28K',   en: 'Lifestyle · 28K',   verif: undefined },
    { id: 'foll_meme',     fol: 120000, year: '2016–2019', price: 690,  stock: 3, ru: 'Мемы · 120K',       en: 'Memes · 120K',      verif: undefined },
    { id: 'foll_luxury',   fol: 15400,  year: '2012–2016', price: 890,  stock: 1, ru: 'Люкс · 15.4K',      en: 'Luxury · 15.4K',    verif: 'gold'  as const },
    { id: 'foll_sports',   fol: 47000,  year: '2015–2019', price: 420,  stock: 5, ru: 'Спорт · 47K',       en: 'Sports · 47K',      verif: 'blue'  as const },
    { id: 'foll_fashion',  fol: 36000,  year: '2016–2020', price: 390,  stock: 4, ru: 'Мода · 36K',        en: 'Fashion · 36K',     verif: undefined },
    { id: 'foll_music',    fol: 52000,  year: '2014–2018', price: 510,  stock: 3, ru: 'Музыка · 52K',      en: 'Music · 52K',       verif: 'blue'  as const },
    { id: 'foll_travel',   fol: 21000,  year: '2016–2020', price: 280,  stock: 9, ru: 'Тревел · 21K',      en: 'Travel · 21K',      verif: undefined },
    { id: 'foll_food',     fol: 19500,  year: '2017–2021', price: 240,  stock: 11,ru: 'Еда · 19.5K',       en: 'Food · 19.5K',      verif: undefined },
    { id: 'foll_cars',     fol: 27500,  year: '2015–2019', price: 360,  stock: 4, ru: 'Авто · 27.5K',      en: 'Auto · 27.5K',      verif: undefined },
    { id: 'foll_news',     fol: 89000,  year: '2011–2015', price: 720,  stock: 0, ru: 'Новости · 89K',     en: 'News · 89K',        verif: 'blue'  as const },
    { id: 'foll_anime',    fol: 44000,  year: '2016–2020', price: 340,  stock: 6, ru: 'Аниме · 44K',       en: 'Anime · 44K',       verif: undefined },
    { id: 'foll_art',      fol: 22800,  year: '2015–2019', price: 300,  stock: 5, ru: 'Арт · 22.8K',       en: 'Art · 22.8K',       verif: undefined },
  ]).map((x) => ({
    id: x.id,
    category: 'followers_acc' as const,
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: `Themed account with ${x.en.toLowerCase()} audience.`, ru: `Тематический аккаунт: ${x.ru.toLowerCase()}.`, ar: `حساب مواضيعي: ${x.en}`, zh: `主题账号：${x.en}`, es: `Cuenta temática: ${x.en}`, tr: `Tematik hesap: ${x.en}`, pt: `Conta temática: ${x.en}`, fr: `Compte thématique : ${x.en}`, uk: `Тематичний акаунт: ${x.ru}` },
    yearRange: x.year,
    pricePerAccount: x.price,
    stock: x.stock,
    followers: x.fol,
    verification: x.verif,
    features: [
      { en: 'Email included', ru: 'Почта в комплекте', ar: 'البريد مرفق', zh: '含邮箱', es: 'Email incluido', tr: 'E-posta dahil', pt: 'E-mail incluído', fr: 'E-mail inclus', uk: 'Пошта в комплекті' },
      { en: 'Full transfer',  ru: 'Полная передача',   ar: 'نقل كامل',   zh: '完整转让', es: 'Transferencia completa', tr: 'Tam transfer', pt: 'Transferência completa', fr: 'Transfert complet', uk: 'Повна передача' },
    ],
  })),
  // --- Smart follower accounts ---
  {
    id: 'acc_smart_crypto',
    category: 'smart_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Followed by high-value crypto & finance accounts. Premium reach.', ru: 'На аккаунт подписаны ценные крипто- и финанс-аккаунты. Премиум охват.', ar: 'يتابعه حسابات كريبتو ومالية عالية القيمة. وصول مميز.', zh: '被高价值加密货币和金融账号关注，高级覆盖。', es: 'Seguido por cuentas de cripto y finanzas de alto valor. Alcance premium.', tr: 'Yüksek değerli kripto ve finans hesapları tarafından takip ediliyor. Premium erişim.', pt: 'Seguido por contas de cripto e finanças de alto valor. Alcance premium.', fr: 'Suivi par des comptes crypto et finance à forte valeur. Portée premium.', uk: 'На нього підписані цінні крипто- та фінансові акаунти. Преміум охоплення.' },
    yearRange: '2017–2020',
    pricePerAccount: 210.0,
    stock: 6,
    followers: 8500,
    smartFollowers: 1200,
    autoDelivery: true,
    badge: { en: 'Smart', ru: 'Smart', ar: 'ذكي', zh: '智能', es: 'Inteligente', tr: 'Akıllı', pt: 'Inteligente', fr: 'Intelligent', uk: 'Розумний' },
    features: [
      { en: '1.2K smart followers', ru: '1.2K smart-фолловеров', ar: '1200 متابع ذكي', zh: '1.2K智能粉丝', es: '1.2K seguidores inteligentes', tr: '1.2K akıllı takipçi', pt: '1.2K seguidores inteligentes', fr: '1.2K abonnés intelligents', uk: '1.2K розумних підписників' },
      { en: 'Niche verified reach', ru: 'Нишевый вериф. охват', ar: 'وصول موثّق متخصص', zh: '垂直认证覆盖', es: 'Alcance verificado de nicho', tr: 'Nişe özgü doğrulanmış erişim', pt: 'Alcance verificado de nicho', fr: 'Portée de niche vérifiée', uk: 'Нішевий перевірений охват' },
    ],
  },
  {
    id: 'acc_smart_tech',
    category: 'smart_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Audience of founders, devs and VCs. Highest signal engagement.', ru: 'Аудитория из основателей, разработчиков и венчура. Максимальный сигнал.', ar: 'جمهور من المؤسسين والمطورين والمستثمرين.', zh: '由创始人、开发者和风投组成的受众，最高信号互动。', es: 'Audiencia de fundadores, desarrolladores y VCs. El mayor engagement de señal.', tr: 'Kurucular, geliştiriciler ve VC\'lerden oluşan kitle. En yüksek sinyal etkileşimi.', pt: 'Audiência de fundadores, desenvolvedores e VCs. Maior engajamento de sinal.', fr: 'Audience de fondateurs, développeurs et VCs. Engagement signal le plus élevé.', uk: 'Аудиторія засновників, розробників та венчурних інвесторів. Найвищий сигнальний engagement.' },
    yearRange: '2015–2019',
    pricePerAccount: 265.0,
    stock: 3,
    followers: 12000,
    smartFollowers: 2100,
    autoDelivery: false,
    features: [
      { en: '2.1K smart followers', ru: '2.1K smart-фолловеров', ar: '2100 متابع ذكي', zh: '2.1K智能粉丝', es: '2.1K seguidores inteligentes', tr: '2.1K akıllı takipçi', pt: '2.1K seguidores inteligentes', fr: '2.1K abonnés intelligents', uk: '2.1K розумних підписників' },
      { en: 'Founder audience', ru: 'Аудитория фаундеров', ar: 'جمهور المؤسسين', zh: '创始人受众', es: 'Audiencia de fundadores', tr: 'Kurucu kitlesi', pt: 'Audiência de fundadores', fr: 'Audience de fondateurs', uk: 'Аудиторія засновників' },
    ],
  },
  // --- Blue checkmark accounts (follower-tier catalog) ---
  {
    id: 'acc_blue_tier1',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Start', ru: 'Blue Verified · Start', ar: 'Blue Verified · Start', zh: 'Blue Verified · Start', es: 'Blue Verified · Start', tr: 'Blue Verified · Start', pt: 'Blue Verified · Start', fr: 'Blue Verified · Start', uk: 'Blue Verified · Start' },
    description: {
      en: 'Fresh blue verified account with a paid checkmark and a small audience. A clean base for any task.',
      ru: 'Свежий аккаунт с оплаченной синей галочкой и небольшой аудиторией. Чистая база под любые задачи.',
      ar: 'حساب موثّق أزرق جديد بعلامة مدفوعة وجمهور صغير. قاعدة نظيفة لأي مهمة.',
      zh: '全新蓝标账号，已付费认证，粉丝较少。适合各种用途的干净基础号。',
      es: 'Cuenta verificada azul nueva con check pagado y audiencia pequeña. Base limpia para cualquier tarea.',
      tr: 'Ödenmiş mavi tikli, küçük kitleli yeni hesap. Her iş için temiz bir temel.',
      pt: 'Conta verificada azul nova com selo pago e audiência pequena. Base limpa para qualquer tarefa.',
      fr: 'Nouveau compte vérifié bleu avec badge payé et petite audience. Base propre pour toute tâche.',
      uk: 'Свіжий акаунт з оплаченою синьою галочкою та невеликою аудиторією. Чиста база під будь-які задачі.',
    },
    yearRange: '2023–2025',
    year: 2024,
    pricePerAccount: 12.0,
    stock: 44,
    verification: 'blue',
    followersRange: [0, 50],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '0–50 followers', ru: '0–50 фолловеров', ar: '0–50 متابع', zh: '0–50 粉丝', es: '0–50 seguidores', tr: '0–50 takipçi', pt: '0–50 seguidores', fr: '0–50 abonnés', uk: '0–50 фолловерів' },
    ],
  },
  {

    id: 'acc_blue_tier2',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Growth', ru: 'Blue Verified · Growth', ar: 'Blue Verified · Growth', zh: 'Blue Verified · Growth', es: 'Blue Verified · Growth', tr: 'Blue Verified · Growth', pt: 'Blue Verified · Growth', fr: 'Blue Verified · Growth', uk: 'Blue Verified · Growth' },
    description: {
      en: 'Warmed-up blue verified account with a small audience. Ready for outreach and light posting.',
      ru: 'Прогретый аккаунт с синей галочкой и небольшой аудиторией. Готов к рассылкам и лёгкому постингу.',
      ar: 'حساب موثّق أزرق مُهيّأ بجمهور صغير. جاهز للتواصل والنشر الخفيف.',
      zh: '带蓝标的养号，有少量粉丝。适合外联和轻量发文。',
      es: 'Cuenta verificada azul ya calentada con audiencia pequeña. Lista para outreach y posting ligero.',
      tr: 'Küçük kitleye sahip ısıtılmış mavi onaylı hesap. Outreach ve hafif paylaşım için hazır.',
      pt: 'Conta verificada azul aquecida com pequena audiência. Pronta para outreach e posts leves.',
      fr: 'Compte vérifié bleu déjà chauffé avec petite audience. Prêt pour outreach et posts légers.',
      uk: 'Прогрітий акаунт із синьою галочкою та невеликою аудиторією. Готовий до розсилок і легкого постингу.',
    },
    yearRange: '2021–2023',
    year: 2022,
    pricePerAccount: 22.0,
    stock: 31,
    verification: 'blue',
    followersRange: [100, 500],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '100–500 followers', ru: '100–500 фолловеров', ar: '100–500 متابع', zh: '100–500 粉丝', es: '100–500 seguidores', tr: '100–500 takipçi', pt: '100–500 seguidores', fr: '100–500 abonnés', uk: '100–500 фолловерів' },
    ],
  },
  {
    id: 'acc_blue_tier3',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Pro', ru: 'Blue Verified · Pro', ar: 'Blue Verified · Pro', zh: 'Blue Verified · Pro', es: 'Blue Verified · Pro', tr: 'Blue Verified · Pro', pt: 'Blue Verified · Pro', fr: 'Blue Verified · Pro', uk: 'Blue Verified · Pro' },
    description: {
      en: 'Established blue verified account with a solid mid-tier following. Great for authority plays.',
      ru: 'Устоявшийся аккаунт с синей галочкой и уверенной средней аудиторией. Отлично для авторитетных схем.',
      ar: 'حساب موثّق أزرق راسخ بجمهور متوسط قوي. مثالي لتعزيز السلطة.',
      zh: '成熟蓝标账号，中等规模粉丝，适合权威型玩法。',
      es: 'Cuenta verificada azul establecida con audiencia media sólida. Ideal para jugadas de autoridad.',
      tr: 'Sağlam orta seviye kitlesi olan yerleşik mavi onaylı hesap. Otorite oyunları için harika.',
      pt: 'Conta verificada azul consolidada com audiência média sólida. Ótima para jogadas de autoridade.',
      fr: 'Compte vérifié bleu établi avec une audience moyenne solide. Idéal pour jouer l\'autorité.',
      uk: 'Стабільний акаунт із синьою галочкою та впевненою середньою аудиторією. Ідеально для авторитетних схем.',
    },
    yearRange: '2018–2021',
    year: 2020,
    pricePerAccount: 45.0,
    stock: 17,
    verification: 'blue',
    followersRange: [500, 1000],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '500–1K followers', ru: '500–1K фолловеров', ar: '500–1K متابع', zh: '500–1K 粉丝', es: '500–1K seguidores', tr: '500–1K takipçi', pt: '500–1K seguidores', fr: '500–1K abonnés', uk: '500–1K фолловерів' },
    ],
  },
  {
    id: 'acc_blue_tier4',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Rising', ru: 'Blue Verified · Rising', ar: 'Blue Verified · Rising', zh: 'Blue Verified · Rising', es: 'Blue Verified · Rising', tr: 'Blue Verified · Rising', pt: 'Blue Verified · Rising', fr: 'Blue Verified · Rising', uk: 'Blue Verified · Rising' },
    description: {
      en: 'Blue verified account with a real 1K–2.5K audience. Strong starting presence.',
      ru: 'Аккаунт с синей галочкой и реальной аудиторией 1K–2.5K. Уверенный стартовый вес.',
      ar: 'حساب موثّق أزرق بجمهور حقيقي 1K–2.5K. حضور قوي للبداية.',
      zh: '蓝标账号，1K–2.5K真实粉丝，适合起步。',
      es: 'Cuenta verificada azul con audiencia real de 1K–2.5K. Presencia sólida para empezar.',
      tr: '1K–2.5K gerçek kitleye sahip mavi onaylı hesap. Güçlü başlangıç varlığı.',
      pt: 'Conta verificada azul com audiência real de 1K–2.5K. Presença forte para começar.',
      fr: 'Compte vérifié bleu avec audience réelle 1K–2.5K. Présence solide pour démarrer.',
      uk: 'Акаунт із синьою галочкою та реальною аудиторією 1K–2.5K. Впевнений стартовий вагомість.',
    },
    yearRange: '2013–2017',
    year: 2016,
    pricePerAccount: 89.0,
    stock: 6,
    verification: 'blue',
    followersRange: [1000, 2500],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '1K–2.5K followers', ru: '1K–2.5K фолловеров', ar: '1K–2.5K متابع', zh: '1K–2.5K 粉丝', es: '1K–2.5K seguidores', tr: '1K–2.5K takipçi', pt: '1K–2.5K seguidores', fr: '1K–2.5K abonnés', uk: '1K–2.5K фолловерів' },
    ],
  },
  {
    id: 'acc_blue_tier5',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Elite', ru: 'Blue Verified · Elite', ar: 'Blue Verified · Elite', zh: 'Blue Verified · Elite', es: 'Blue Verified · Elite', tr: 'Blue Verified · Elite', pt: 'Blue Verified · Elite', fr: 'Blue Verified · Elite', uk: 'Blue Verified · Elite' },
    description: {
      en: 'Top-tier blue verified account with an established 2.5K–5K real audience. Maximum trust.',
      ru: 'Топовый аккаунт с синей галочкой и устоявшейся реальной аудиторией 2.5K–5K. Максимум доверия.',
      ar: 'حساب موثّق أزرق من الطراز الأول بجمهور حقيقي 2.5K–5K. أقصى ثقة.',
      zh: '顶级蓝标账号，2.5K–5K真实粉丝，最高可信度。',
      es: 'Cuenta verificada azul de primer nivel con audiencia real de 2.5K–5K. Máxima confianza.',
      tr: '2.5K–5K gerçek kitleye sahip en üst düzey mavi onaylı hesap. Maksimum güven.',
      pt: 'Conta verificada azul topo de linha com audiência real de 2.5K–5K. Máxima confiança.',
      fr: 'Compte vérifié bleu haut de gamme avec audience réelle 2.5K–5K. Confiance maximale.',
      uk: 'Топовий акаунт із синьою галочкою та реальною аудиторією 2.5K–5K. Максимум довіри.',
    },
    yearRange: '2012–2016',
    year: 2015,
    pricePerAccount: 129.0,
    stock: 4,
    verification: 'blue',
    followersRange: [2500, 5000],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '2.5K–5K followers', ru: '2.5K–5K фолловеров', ar: '2.5K–5K متابع', zh: '2.5K–5K 粉丝', es: '2.5K–5K seguidores', tr: '2.5K–5K takipçi', pt: '2.5K–5K seguidores', fr: '2.5K–5K abonnés', uk: '2.5K–5K фолловерів' },
    ],
  },
  {
    id: 'acc_blue_tier6',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Scale', ru: 'Blue Verified · Scale', ar: 'Blue Verified · Scale', zh: 'Blue Verified · Scale', es: 'Blue Verified · Scale', tr: 'Blue Verified · Scale', pt: 'Blue Verified · Scale', fr: 'Blue Verified · Scale', uk: 'Blue Verified · Scale' },
    description: {
      en: 'High-authority blue verified account with a 5K–10K audience. Built for serious campaigns.',
      ru: 'Авторитетный аккаунт с синей галочкой и аудиторией 5K–10K. Для серьёзных кампаний.',
      ar: 'حساب موثّق أزرق ذو سلطة عالية بجمهور 5K–10K. مُعد للحملات الجادة.',
      zh: '高权威蓝标账号，5K–10K粉丝，适合严肃营销。',
      es: 'Cuenta verificada azul de alta autoridad con audiencia 5K–10K. Para campañas serias.',
      tr: '5K–10K kitlesi olan yüksek otoriteli mavi onaylı hesap. Ciddi kampanyalar için.',
      pt: 'Conta verificada azul de alta autoridade com audiência 5K–10K. Feita para campanhas sérias.',
      fr: 'Compte vérifié bleu haute autorité avec audience 5K–10K. Conçu pour les campagnes sérieuses.',
      uk: 'Авторитетний акаунт із синьою галочкою та аудиторією 5K–10K. Для серйозних кампаній.',
    },
    yearRange: '2011–2015',
    year: 2014,
    pricePerAccount: 189.0,
    stock: 3,
    verification: 'blue',
    followersRange: [5000, 10000],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '5K–10K followers', ru: '5K–10K фолловеров', ar: '5K–10K متابع', zh: '5K–10K 粉丝', es: '5K–10K seguidores', tr: '5K–10K takipçi', pt: '5K–10K seguidores', fr: '5K–10K abonnés', uk: '5K–10K фолловерів' },
    ],
  },
  {
    id: 'acc_blue_tier7',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Authority', ru: 'Blue Verified · Authority', ar: 'Blue Verified · Authority', zh: 'Blue Verified · Authority', es: 'Blue Verified · Authority', tr: 'Blue Verified · Authority', pt: 'Blue Verified · Authority', fr: 'Blue Verified · Authority', uk: 'Blue Verified · Authority' },
    description: {
      en: 'Premium blue verified account with a 10K–15K audience. Maximum authority and reach.',
      ru: 'Премиум аккаунт с синей галочкой и аудиторией 10K–15K. Максимум авторитета и охвата.',
      ar: 'حساب موثّق أزرق مميز بجمهور 10K–15K. أقصى سلطة وانتشار.',
      zh: '高级蓝标账号，10K–15K粉丝，最高权威与触达。',
      es: 'Cuenta verificada azul premium con audiencia 10K–15K. Máxima autoridad y alcance.',
      tr: '10K–15K kitlesi olan premium mavi onaylı hesap. Maksimum otorite ve erişim.',
      pt: 'Conta verificada azul premium com audiência 10K–15K. Máxima autoridade e alcance.',
      fr: 'Compte vérifié bleu premium avec audience 10K–15K. Autorité et portée maximales.',
      uk: 'Преміум акаунт із синьою галочкою та аудиторією 10K–15K. Максимум авторитету та охоплення.',
    },
    yearRange: '2010–2014',
    year: 2013,
    pricePerAccount: 289.0,
    stock: 2,
    verification: 'blue',
    followersRange: [10000, 15000],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '10K–15K followers', ru: '10K–15K фолловеров', ar: '10K–15K متابع', zh: '10K–15K 粉丝', es: '10K–15K seguidores', tr: '10K–15K takipçi', pt: '10K–15K seguidores', fr: '10K–15K abonnés', uk: '10K–15K фолловерів' },
    ],
  },
  {
    id: 'acc_blue_tier8',
    category: 'blue_acc',
    name: { en: 'Blue Verified · Apex', ru: 'Blue Verified · Apex', ar: 'Blue Verified · Apex', zh: 'Blue Verified · Apex', es: 'Blue Verified · Apex', tr: 'Blue Verified · Apex', pt: 'Blue Verified · Apex', fr: 'Blue Verified · Apex', uk: 'Blue Verified · Apex' },
    description: {
      en: 'Flagship blue verified account with a 15K–20K audience. The strongest presence in the catalog.',
      ru: 'Флагманский аккаунт с синей галочкой и аудиторией 15K–20K. Самый сильный аккаунт в каталоге.',
      ar: 'حساب موثّق أزرق رائد بجمهور 15K–20K. أقوى حضور في الكتالوج.',
      zh: '旗舰蓝标账号，15K–20K粉丝，目录中最强存在。',
      es: 'Cuenta verificada azul insignia con audiencia 15K–20K. La presencia más fuerte del catálogo.',
      tr: '15K–20K kitlesi olan amiral gemisi mavi onaylı hesap. Katalogdaki en güçlü varlık.',
      pt: 'Conta verificada azul carro-chefe com audiência 15K–20K. A presença mais forte do catálogo.',
      fr: 'Compte vérifié bleu phare avec audience 15K–20K. La présence la plus forte du catalogue.',
      uk: 'Флагманський акаунт із синьою галочкою та аудиторією 15K–20K. Найсильніший акаунт у каталозі.',
    },
    yearRange: '2009–2013',
    year: 2012,
    pricePerAccount: 389.0,
    stock: 1,
    verification: 'blue',
    followersRange: [15000, 20000],
    topicIds: ['business'],
    badge: { en: 'Verified', ru: 'Verified', ar: 'موثّق', zh: '已认证', es: 'Verificado', tr: 'Doğrulanmış', pt: 'Verificado', fr: 'Vérifié', uk: 'Верифікований' },
    features: [
      { en: 'Blue checkmark paid', ru: 'Синяя галочка оплачена', ar: 'العلامة الزرقاء مدفوعة', zh: '蓝标已付费', es: 'Check azul pagado', tr: 'Mavi tik ödendi', pt: 'Selo azul pago', fr: 'Badge bleu payé', uk: 'Синя галочка оплачена' },
      { en: '15K–20K followers', ru: '15K–20K фолловеров', ar: '15K–20K متابع', zh: '15K–20K 粉丝', es: '15K–20K seguidores', tr: '15K–20K takipçi', pt: '15K–20K seguidores', fr: '15K–20K abonnés', uk: '15K–20K фолловерів' },
    ],
  },
  // --- Gold checkmark accounts ---
  {
    id: 'acc_gold_org',
    category: 'gold_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Verified Organizations account with the gold checkmark. Maximum authority.', ru: 'Аккаунт Verified Organizations с золотой галочкой. Максимальный авторитет.', ar: 'حساب مؤسسات موثّق بعلامة ذهبية. أقصى سلطة.', zh: '带金标的认证组织账号，最高权威性。', es: 'Cuenta de Organizaciones Verificadas con la verificación dorada. Máxima autoridad.', tr: 'Altın onay rozetli Doğrulanmış Kuruluşlar hesabı. Maksimum otorite.', pt: 'Conta de Organizações Verificadas com o selo dourado. Máxima autoridade.', fr: 'Compte Organisations vérifiées avec le badge or. Autorité maximale.', uk: 'Акаунт Verified Organizations з золотою галочкою. Максимальний авторитет.' },
    yearRange: '2016–2021',
    pricePerAccount: 620.0,
    stock: 3,
    verification: 'gold',
    badge: { en: 'Gold', ru: 'Gold', ar: 'ذهبي', zh: '金标', es: 'Dorado', tr: 'Altın', pt: 'Dourado', fr: 'Or', uk: 'Золотий' },
    features: [
      { en: 'Gold checkmark', ru: 'Золотая галочка', ar: 'علامة ذهبية', zh: '金色认证标', es: 'Verificación dorada', tr: 'Altın onay rozeti', pt: 'Selo dourado', fr: 'Badge or', uk: 'Золота галочка' },
      { en: 'Org verification', ru: 'Верификация организации', ar: 'توثيق مؤسسة', zh: '组织认证', es: 'Verificación de organización', tr: 'Kuruluş doğrulaması', pt: 'Verificação de organização', fr: 'Vérification d\'organisation', uk: 'Верифікація організації' },
    ],
  },
  {
    id: 'acc_gold_premium',
    category: 'gold_acc',
    name: { en: 'Nickname', ru: 'Nickname', ar: 'Nickname', zh: 'Nickname', es: 'Nickname', tr: 'Nickname', pt: 'Nickname', fr: 'Nickname', uk: 'Nickname' },
    description: { en: 'Top-tier gold verified org account with affiliate badges enabled.', ru: 'Топовый золотой org-аккаунт с включёнными аффилиат-бейджами.', ar: 'حساب مؤسسة ذهبي من الطراز الأول مع شارات تابعة.', zh: '顶级金标认证组织账号，启用联属标识。', es: 'Cuenta de organización verificada dorada de primer nivel con insignias de afiliados activadas.', tr: 'Ortaklık rozetleri etkinleştirilmiş en üst düzey altın doğrulanmış org hesabı.', pt: 'Conta de organização verificada dourada de alto nível com emblemas de afiliados ativados.', fr: 'Compte org vérifié or de premier rang avec badges affiliés activés.', uk: 'Топовий золотий верифікований org-акаунт із увімкненими афіліат-значками.' },
    yearRange: '2013–2018',
    pricePerAccount: 940.0,
    stock: 1,
    verification: 'gold',
    features: [
      { en: 'Gold checkmark', ru: 'Золотая галочка', ar: 'علامة ذهبية', zh: '金色认证标', es: 'Verificación dorada', tr: 'Altın onay rozeti', pt: 'Selo dourado', fr: 'Badge or', uk: 'Золота галочка' },
      { en: 'Affiliates enabled', ru: 'Аффилиаты включены', ar: 'الشركاء مفعّلون', zh: '联属功能已启用', es: 'Afiliados activados', tr: 'Ortaklıklar etkin', pt: 'Afiliados ativados', fr: 'Affiliés activés', uk: 'Афіліати увімкнено' },
    ],
  },
]

export const QTY_PRESETS = [1, 2, 5, 10, 15, 25, 50, 100]

export type CoinGroup = {
  id: string
  symbol: string
  name: string
  networks: CryptoCoin[]
}

// Grouped catalog — the top-up picker shows one card per coin,
// then expands the supported networks for that coin.
export const COIN_GROUPS: CoinGroup[] = [
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether',
    networks: [
      { id: 'usdt_trc20', symbol: 'USDT', name: 'Tether', network: 'TRC20', usdRate: 1, address: 'TXk9pC8qE3fL2Nd7Rb1Vm4Sy6Zx0aB2c' },
      { id: 'usdt_bep20', symbol: 'USDT', name: 'Tether', network: 'BEP20', usdRate: 1, address: '0xBEp20a19c4d5f6E7A8b91C2d3E4F5061' },
      { id: 'usdt_erc20', symbol: 'USDT', name: 'Tether', network: 'ERC20', usdRate: 1, address: '0xAe190a4f8B2c1d0E9f3A6b5C7d8E2F41' },
      { id: 'usdt_polygon', symbol: 'USDT', name: 'Tether', network: 'Polygon', usdRate: 1, address: '0xP0Ly9c8B7a6D5e4F3210aBcDeF987654' },
      { id: 'usdt_sol', symbol: 'USDT', name: 'Tether', network: 'Solana', usdRate: 1, address: '9skK8nHb2Vq4pRy6TzUa1XvL3MjNhGdCsBqEwF7ajeJ' },
      { id: 'usdt_ton', symbol: 'USDT', name: 'Tether', network: 'TON', usdRate: 1, address: 'UQCn7pQ4bT2eR5vLh0MjXsD8kY1WzA6oPfE9iC3nToNa' },
    ],
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    networks: [
      { id: 'usdc_erc20', symbol: 'USDC', name: 'USD Coin', network: 'ERC20', usdRate: 1, address: '0xC1rC1e7a2B3c4D5e6F7891a2B3c4D5E6' },
      { id: 'usdc_sol', symbol: 'USDC', name: 'USD Coin', network: 'Solana', usdRate: 1, address: 'EPjFWdd5AufqSSqeM2q1Vf9tkzr4XjSol1CUsDcMint' },
      { id: 'usdc_base', symbol: 'USDC', name: 'USD Coin', network: 'Base', usdRate: 1, address: '0xBa5e0c4A7b3D2f1E9c8B6d5A4F3E2D1c' },
    ],
  },
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    networks: [
      { id: 'btc', symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', usdRate: 63312, address: 'bc1qplyv7g6h4k8n2r5t3w9x0z1a2b3c4d5e6f7ga7c' },
    ],
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    networks: [
      { id: 'eth', symbol: 'ETH', name: 'Ethereum', network: 'ERC20', usdRate: 1875.92, address: '0xEt7h04a19c4d5f6E7A8b91C2d3E4F5069d5' },
    ],
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    networks: [
      { id: 'sol', symbol: 'SOL', name: 'Solana', network: 'Solana', usdRate: 73.53, address: '9skK8nHb2Vq4pRy6TzUa1XvL3MjNhGdCsBqEwF7ajeJ' },
    ],
  },
  {
    // Toncoin (TON) → Gram (GRAM) rebrand, 15.06.2026. Chain stays The Open Network.
    id: 'ton',
    symbol: 'GRAM',
    name: 'Gram',
    networks: [
      { id: 'ton', symbol: 'GRAM', name: 'Gram', network: 'TON', usdRate: 1.42, address: 'UQAn5pQ4bT2eR5vLh0MjXsD8kY1WzA6oPfE9iC3nT0Nb' },
    ],
  },
  {
    id: 'pol',
    symbol: 'POL',
    name: 'Polygon',
    networks: [
      { id: 'pol', symbol: 'POL', name: 'Polygon', network: 'Polygon', usdRate: 0.0729, address: '0xP0L9c8B7a6D5e4F3210aBcDeF9876543' },
    ],
  },

  {
    id: 'xrp',
    symbol: 'XRP',
    name: 'Ripple',
    networks: [
      { id: 'xrp', symbol: 'XRP', name: 'Ripple', network: 'XRP', usdRate: 1.081, address: 'rXrPl3dg7Kt9pQb2Vn8YmZa1Bc4DfEgHj' },
    ],
  },
  {
    id: 'xmr',
    symbol: 'XMR',
    name: 'Monero',
    networks: [
      { id: 'xmr', symbol: 'XMR', name: 'Monero', network: 'Monero', usdRate: 363.39, address: '48mNrKp4Qc2eR5vLh0MjXsD8kY1WzA6oPfE9iC3nT0Nb7yV3aBcDeFgHjKlMnPqRsTuVwXyZ' },
    ],
  },
  {
    id: 'ltc',
    symbol: 'LTC',
    name: 'Litecoin',
    networks: [
      { id: 'ltc', symbol: 'LTC', name: 'Litecoin', network: 'Litecoin', usdRate: 44.83, address: 'ltc1qL7c3vp4nx8k2mr5t9w1z0a2b3c4d5e6f7lt8c' },
    ],
  },
  {
    id: 'doge',
    symbol: 'DOGE',
    name: 'Dogecoin',
    networks: [
      { id: 'doge', symbol: 'DOGE', name: 'Dogecoin', network: 'Dogecoin', usdRate: 0.0707, address: 'D8gEc0iN4a2B3c5D6e7F8g9H0j1K2l3M4n' },
    ],
  },
  {
    id: 'dai',
    symbol: 'DAI',
    name: 'Dai',
    networks: [
      { id: 'dai', symbol: 'DAI', name: 'Dai', network: 'ERC20', usdRate: 1, address: '0xDa1194c4d5f6E7A8b91C2d3E4F506da1069' },
    ],
  },
]

// Flat list of every (coin, network) invoice — kept for legacy imports.
export const COINS: CryptoCoin[] = COIN_GROUPS.flatMap((g) => g.networks)

export const PROMO_CODES: Record<string, number> = {
  XBOOST10: 0.1,
  WELCOME15: 0.15,
  OG2025: 0.2,
}

export const DEMO_ORDERS: Order[] = [
  {
    id: 'FH-90213',
    date: Date.now() - 1000 * 60 * 60 * 6,
    title: 'X — Global Followers · 5,000',
    amount: 5.0,
    status: 'in_progress',
    refillable: true,
    kind: 'boost',
    paid: true,
  },
  {
    id: 'FH-90187',
    date: Date.now() - 1000 * 60 * 60 * 36,
    title: 'Twitter Account (2013–2016) · 2 pcs',
    amount: 8.0,
    status: 'completed',
    refillable: false,
    kind: 'account',
    paid: true,
  },
  {
    id: 'FH-90120',
    date: Date.now() - 1000 * 60 * 60 * 72,
    title: 'X — Instant Likes · 1,000',
    amount: 0.8,
    status: 'completed',
    refillable: false,
    kind: 'boost',
    paid: true,
  },
]

export const DEMO_TOPUPS: Topup[] = [
  {
    id: 'TP-44921',
    date: Date.now() - 1000 * 60 * 60 * 3,
    amount: 20.0,
    coin: 'USDT',
    network: 'TRC-20',
    status: 'success',
  },
  {
    id: 'TP-44880',
    date: Date.now() - 1000 * 60 * 30,
    amount: 15.0,
    coin: 'GRAM',
    network: 'TON',
    status: 'pending',
  },
  {
    id: 'TP-44812',
    date: Date.now() - 1000 * 60 * 60 * 26,
    amount: 50.0,
    coin: 'BTC',
    network: 'Bitcoin',
    status: 'declined',
  },
  {
    id: 'TP-44790',
    date: Date.now() - 1000 * 60 * 60 * 50,
    amount: 10.0,
    coin: 'ETH',
    network: 'ERC-20',
    status: 'success',
  },
]

// Redeemable promo codes → bonus added to balance (demo)
export const PROMO_BONUSES: Record<string, number> = {
  AUREX: 5,
  WELCOME10: 10,
  VIP25: 25,
}
/**
 * Recompute retail prices for every item mirrored from the supplier catalog.
 * Called whenever the markup config changes (admin panel / live settings),
 * so prices update without a rebuild or restart.
 */
export function repriceSupplierAccounts(): void {
  for (const a of ACCOUNTS) {
    if (typeof a.supplierBase !== 'number') continue
    a.pricePerAccount = retailPrice(a.supplierBase, a.supplierKind ?? 'dated')
  }
}
