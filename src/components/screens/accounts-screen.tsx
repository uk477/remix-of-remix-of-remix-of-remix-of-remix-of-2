"use client";

import frontrunproLogo from "@/assets/frontrunpro-logo.png";

import { AccountDescriptionSheet } from "@/components/account-description-sheet";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownNarrowWide,
  ArrowRight,
  ArrowUpNarrowWide,
  BadgeCheck,
  Bitcoin,
  BrainCircuit,
  Briefcase,
  Car,
  Cat,
  CalendarDays,
  Check,
  ChevronUp,
  ChevronRight,
  Clock,
  Coffee,
  Crown,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Info,
  Loader2,
  Trash2,
  Gamepad2,
  Hourglass,
  Landmark,
  Laugh,
  Music,
  Newspaper,
  Package,
  Palette,
  Pizza,
  Plane,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Shirt,
  Star,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  Trophy,
  Truck,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ACCOUNTS, MARKET_CATEGORIES, QTY_PRESETS } from "@/lib/data";
import { money } from "@/lib/format";
import { retailPrice } from "@/lib/supplier-twitter";
import { usePricing } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/lib/nav";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  rowToAccount,
  useFollowerAccounts,
  updateFollowerAccount,
  deleteFollowerAccount,
  createFollowerAccount,
  type FollowerAccountInput,
  type FollowerAccountRow,
} from "@/lib/follower-accounts";

import type { AgedAccount, MarketCategoryId } from "@/lib/types";
import { ScreenHeader } from "../screen-header";
import { useToast } from "../toast";
import { FollowerAccountEditor } from "../follower-account-editor";
import { ChevronLeft, Pencil, Plus as PlusIcon } from "lucide-react";
import { AurxMark } from "../aurx-mark";
import { XLogo } from "../x-logo";
import { SupplierItemsList } from "../supplier-items-list";
import { spListProducts, type SpProductSummary } from "@/lib/socialplatforms.functions";
import { VerifiedBadge } from "../icons/verified-badge";
import { BlueVerifiedShowcase } from "../blue-verified-showcase";

import { EditProfileModal } from "../order-form";
import {
  ExternalLink,
  KeyRound,
  Mail,
  Cookie,
  ShieldOff,
  ChevronDown,
  Copy,
  HandshakeIcon,
  Handshake,
  GripVertical,
  ArrowLeftRight,
} from "lucide-react";
import {
  DragReorderGrid,
  SwapGrid,
  ReorderToolbar,
  type ReorderMode,
} from "../accounts-reorder-grid";
import { useXProfile } from "@/lib/x-profile";
import { refreshAccountsFromX } from "@/lib/x-refresh.functions";
import {
  formatCompactFollowers,
  formatCompactFollowersLatin,
  verificationFromX,
} from "@/lib/x-utils";
import { RefreshCw } from "lucide-react";

function pcsWord(qty: number, lang: string): string {
  if (lang === "ru") {
    const n = Math.abs(qty) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return "шт.";
    if (n1 > 1 && n1 < 5) return "шт.";
    return "шт.";
  }
  if (lang === "uk") return "шт.";
  if (lang === "ar") return "قطعة";
  if (lang === "zh") return "件";
  if (lang === "es") return "uds";
  if (lang === "tr") return "adet";
  if (lang === "pt") return "un";
  if (lang === "fr") return "pcs";
  return "pcs";
}

const ICONS: Record<string, LucideIcon> = {
  Hourglass,
  Users,
  BrainCircuit,
  BadgeCheck,
};

const CURRENT_YEAR = 2026;

/* ============================================================
   CREDENTIAL CARD — terminal-style delivery preview
   ============================================================ */

const CRED_FIELDS: Array<{ key: string; sample: string; optional?: boolean }> = [
  { key: "login", sample: "aurex_user_2026" },
  { key: "password", sample: "X9k#mQ7vLp2$nR" },
  { key: "email", sample: "inbox@rambler.ru" },
  { key: "email_pass", sample: "M8w!zT4bYc6@qF" },
  { key: "ct0", sample: "a1b2c3d4e5f6…" },
  { key: "auth_token", sample: "7f9e2d…c4b1" },
  { key: "phone", sample: "+1 ••• •••• ••", optional: true },
];

const CRED_LABEL: Record<string, string> = {
  login: "Логин",
  password: "Пароль",
  email: "Почта",
  email_pass: "Пароль почты",
  ct0: "ct0",
  auth_token: "auth_token",
  phone: "Номер телефона",
};

function CredentialCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-xl border border-primary/15 bg-[oklch(0.13_0.006_70)]"
    >
      {/* terminal header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-black/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive/70" />
          <span className="size-2 rounded-full bg-warning/80" />
          <span className="size-2 rounded-full bg-success/70" />
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.25em] text-muted-foreground">
          account.txt
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.25em] text-primary/70">
          .txt
        </span>
      </div>

      <div className="divide-y divide-border/40">
        {CRED_FIELDS.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.06, duration: 0.35, ease: "easeOut" }}
            className="group flex items-center gap-3 px-3 py-2.5"
          >
            <span className="w-[110px] shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
              {CRED_LABEL[f.key]}
              {f.optional && (
                <span className="ml-1 text-primary/60 normal-case tracking-normal">?</span>
              )}
            </span>
            <span className="text-muted-foreground/60">:</span>
            <span className="relative flex-1 truncate font-mono text-[12px] text-foreground/90">
              <span className="select-none blur-[5px] transition-[filter] duration-300 group-hover:blur-0">
                {f.sample}
              </span>
              <motion.span
                aria-hidden
                className="absolute inset-y-0 -left-1 w-6 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                initial={{ x: 0, opacity: 0 }}
                animate={{ x: ["0%", "600%"], opacity: [0, 1, 0] }}
                transition={{
                  duration: 1.6,
                  delay: 0.2 + i * 0.08,
                  ease: "easeInOut",
                }}
              />
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ============================================================
   SPEC LIST — animated account stats
   ============================================================ */

const SPECS = [
  { label: "Фолловеры", value: "0 – 50", hint: "органичный старт", pct: 12 },
  { label: "Твиты / Ретвиты", value: "0 – 1K", hint: "чистая история", pct: 45 },
  { label: "Регистрация", value: "Тир 1 – 3", hint: "страны первого мира", pct: 88 },
];

function SpecList() {
  return (
    <div className="space-y-2">
      {SPECS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {s.label}
            </span>
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
              className="bg-gradient-to-b from-[oklch(0.95_0.09_92)] to-[oklch(0.7_0.12_78)] bg-clip-text font-mono text-[14px] font-semibold tabular-nums tracking-tight text-transparent"
            >
              {s.value}
            </motion.span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">{s.hint}</p>
          <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-black/40">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${s.pct}%` }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70"
              style={{ boxShadow: "0 0 8px hsl(var(--primary)/0.6)" }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ============================================================
   BULK DISCOUNT — wholesale tier breakdown
   ============================================================ */

const DISCOUNT_TIERS = [
  { min: 5, rate: 0.03 },
  { min: 10, rate: 0.05 },
  { min: 50, rate: 0.15 },
];

function DiscountCard({ qty, pricePerAccount }: { qty: number; pricePerAccount: number }) {
  const currentTier = [...DISCOUNT_TIERS].reverse().find((t) => qty >= t.min);
  const nextTier = DISCOUNT_TIERS.find((t) => qty < t.min);
  const currentRate = currentTier?.rate ?? 0;
  const savedNow = qty * pricePerAccount * currentRate;
  const needed = nextTier ? nextTier.min - qty : 0;

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-snug text-muted-foreground">
        Берёшь больше — платишь меньше за штуку. Скидка ставится сама.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/20">
        {DISCOUNT_TIERS.map((tier, i) => {
          const unlocked = qty >= tier.min;
          const isCurrent = currentTier?.min === tier.min;
          return (
            <motion.div
              key={tier.min}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={`flex items-center justify-between px-4 py-3 ${
                i > 0 ? "border-t border-border/50" : ""
              } ${isCurrent ? "bg-primary/10" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-[15px] font-bold tabular-nums ${
                    unlocked ? "text-foreground" : "text-muted-foreground/70"
                  }`}
                >
                  {tier.min}+
                </span>
                <span
                  className={`text-[13px] ${
                    unlocked ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  аккаунтов
                </span>
              </div>
              <span
                className={`font-mono text-[15px] font-bold tabular-nums ${
                  unlocked ? "text-primary" : "text-muted-foreground/70"
                }`}
              >
                −{Math.round(tier.rate * 100)}%
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-[12px] leading-relaxed">
        {currentRate > 0 ? (
          <span className="text-foreground">
            Сейчас скидка{" "}
            <span className="font-mono font-bold text-primary">
              −{Math.round(currentRate * 100)}%
            </span>
            . Экономишь <span className="font-mono font-semibold">{money(savedNow)}</span>.
            {nextTier && (
              <>
                {" "}
                Добавь ещё <span className="font-mono font-semibold">{needed}</span> — и будет{" "}
                <span className="font-mono font-bold text-primary">
                  −{Math.round(nextTier.rate * 100)}%
                </span>
                .
              </>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">
            До скидки не хватает{" "}
            <span className="font-mono font-semibold text-foreground">{needed}</span> аккаунтов.
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ACCOUNT LIVE BANNER — X-profile mock with rolling followers
   Mirrors the boost-followers preview banner but pre-fills the
   count with the account's own follower number. The count-up
   plays once on mount so the card feels "alive".
   ============================================================ */

function slugifyHandle(input: string): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]/g, "");
  return (ascii || "account").slice(0, 15).toLowerCase();
}

function normalizeXAccountUrl(raw: string | undefined, fallbackHandle: string) {
  const value = raw?.trim();
  if (!value) {
    return {
      href: `https://x.com/${fallbackHandle}`,
      label: `x.com/${fallbackHandle}`,
      handle: fallbackHandle,
    };
  }

  if (value.startsWith("@")) {
    const handle =
      value
        .slice(1)
        .replace(/[^A-Za-z0-9_]/g, "")
        .slice(0, 15) || fallbackHandle;
    return { href: `https://x.com/${handle}`, label: `x.com/${handle}`, handle };
  }

  const withoutProtocol = value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
  if (/^(x\.com|twitter\.com)\//i.test(withoutProtocol)) {
    const label = withoutProtocol.replace(/^twitter\.com/i, "x.com");
    const handle = label.match(/^x\.com\/([^/?#]+)/i)?.[1] ?? fallbackHandle;
    return { href: `https://${label}`, label, handle };
  }

  const handle = withoutProtocol.replace(/[^A-Za-z0-9_]/g, "").slice(0, 15) || fallbackHandle;
  return { href: `https://x.com/${handle}`, label: `x.com/${handle}`, handle };
}

function AccountLiveBanner({ account, lang }: { account: AgedAccount; lang: string }) {
  const isAged = account.category === "aged";
  const baseName = account.name[lang as "ru" | "en"] ?? account.name.en ?? "Account";
  const profileName = "Nickname";
  const handleFallback = normalizeXAccountUrl(account.accountUrl, slugifyHandle(baseName)).handle;
  // Live X data (avatar / banner / name / handle / counts) — not for aged listings.
  const live = useXProfile(isAged ? undefined : account.accountUrl);
  const handle = live?.user_name || handleFallback;
  const target = live?.followers ?? account.smartFollowers ?? account.followers ?? 0;
  const followersText = target.toLocaleString("en-US");
  const followingText = (live?.following ?? 0).toLocaleString("en-US");
  const yearMatch = account.yearRange?.match(/\d{4}/);
  const liveYear = live?.joined_at ? String(new Date(live.joined_at).getUTCFullYear()) : "";
  const year = liveYear || String(account.year ?? (yearMatch ? yearMatch[0] : "2020"));
  const age = Math.max(0, CURRENT_YEAR - Number(year || CURRENT_YEAR));

  const storageKey = `aurx.profile.v2.${account.id}`;
  const [customName, setCustomName] = useState<string>("");
  const [customAvatar, setCustomAvatar] = useState<string>("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setCustomName("");
    setCustomAvatar("");
  }, [storageKey]);

  const displayName = customName || live?.name || profileName;
  const avatarSrc = customAvatar || live?.avatar_url || "";
  const bannerSrc = live?.banner_url || "";
  const liveVerification = live
    ? verificationFromX(
        live.is_blue_verified,
        live.verified_type,
        live.is_verified,
        account.verification ?? null,
      )
    : (account.verification ?? "none");
  const showBlue = liveVerification === "blue";
  const showGold = liveVerification === "gold";
  const showGray = liveVerification === "gray";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black"
    >
      <div className="h-[76px] overflow-hidden bg-[#333639]">
        {bannerSrc && (
          <img src={bannerSrc} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>

      <div className="relative px-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="-mt-10 flex size-[72px] items-center justify-center overflow-hidden rounded-full border-[4px] border-black bg-[#1d1f23]">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" loading="lazy" className="size-full object-cover" />
            ) : (
              <AurxMark className="size-[70%] opacity-90" />
            )}
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setEditing(true)}
            className="mt-3 cursor-pointer rounded-full border border-white/25 px-3.5 py-1 text-[13px] font-bold text-white/95 transition-colors hover:bg-white/10 active:bg-white/15"
          >
            Edit profile
          </button>
        </div>

        <div className="mt-2">
          <p
            className="flex items-center gap-1 text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-white"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            <span className="truncate">{displayName}</span>
            {showBlue && <VerifiedBadge className="size-[18px] shrink-0 text-[#1d9bf0]" />}
            {showGold && <VerifiedBadge className="size-[18px] shrink-0 text-[#e7b100]" />}
            {showGray && <VerifiedBadge className="size-[18px] shrink-0 text-[#a8b3bd]" />}
          </p>
          <p
            className="text-[14px] leading-tight text-[#71767b]"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            @{handle}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-1 text-[14px] text-[#71767b]">
          <CalendarDays className="size-[16px]" strokeWidth={2} />
          <span>Joined {year}</span>
          <ChevronRight className="size-[14px]" strokeWidth={2.5} />
        </div>

        <div className="mt-3 flex items-center gap-5 text-[14px] text-[#71767b]">
          <span>
            <span className="font-bold text-white">{followingText}</span> Following
          </span>
          <span>
            <span className="font-bold text-white">{followersText}</span> Followers
          </span>
        </div>
      </div>

      <SmartFollowersBlock
        list={account.smartFollowersList ?? []}
        count={account.smartFollowers ?? 0}
      />

      <AnimatePresence>
        {editing && (
          <EditProfileModal
            handle={handle}
            initialName={customName}
            initialAvatar={customAvatar}
            realName={live?.name ?? ""}
            realAvatar={live?.avatar_url ?? ""}
            realBanner={live?.banner_url ?? ""}
            onClose={() => setEditing(false)}
            onSave={(name: string, avatar: string) => {
              setCustomName(name);
              setCustomAvatar(avatar);
              setEditing(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function fmtCount(n: number) {
  const trunc = (v: number) => {
    const t = Math.floor(v * 10) / 10;
    return t % 1 === 0 ? t.toFixed(0) : t.toFixed(1);
  };
  if (n >= 1_000_000) return `${trunc(n / 1_000_000)}M`;
  if (n >= 1000) return `${trunc(n / 1000)}K`;
  return `${n}`;
}

function accountMeta(a: AgedAccount, t: (k: never) => string) {
  if (a.verification === "blue") return t("verified_blue" as never);
  if (a.verification === "gold") return t("verified_gold" as never);
  if (a.smartFollowers) return `${fmtCount(a.smartFollowers)} ${t("smart_label" as never)}`;
  if (a.followers) return `${fmtCount(a.followers)} ${t("followers_label" as never)}`;
  return a.yearRange;
}

function followerInputFromAccount(
  account: AgedAccount,
  category: "followers_acc" | "smart_acc",
): FollowerAccountInput {
  const topicIds = getAccountTopics(account);
  const primaryTopic = topicIds[0] ?? TOPIC_ROTATION[0];
  const topic = TOPICS[primaryTopic];
  const followers = account.followers ?? account.followersRange?.[1] ?? account.smartFollowers ?? 1;

  return {
    name_ru: account.name.ru || account.name.en || `${topic.label.ru} · ${fmtCount(followers)}`,
    name_en: account.name.en || account.name.ru || `${topic.label.en} · ${fmtCount(followers)}`,
    description_ru: account.description.ru || "",
    description_en: account.description.en || account.description.ru || "",
    description_enabled: account.descriptionEnabled ?? false,
    year_range: account.yearRange || String(account.year ?? CURRENT_YEAR),
    price_per_account: account.pricePerAccount,
    stock: account.stock,
    followers,
    verification: account.verification ?? "none",
    badge_ru: account.badge?.ru ?? topic.label.ru,
    badge_en: account.badge?.en ?? topic.label.en,
    features: (account.features ?? []).map((feature) => ({
      ru: feature.ru || feature.en || "",
      en: feature.en || feature.ru || "",
    })),
    is_active: true,
    topic_id: primaryTopic,
    topic_ids: topicIds.length ? topicIds : [primaryTopic],
    account_url: account.accountUrl ?? null,
    smart_followers: category === "smart_acc" ? (account.smartFollowers ?? 0) : null,
    category,
  };
}

export function AccountsScreen() {
  const { t, lang } = useI18n();
  const { back, param } = useNav();
  const { soldAccounts } = useStore();
  const { isAdmin } = useAuth();
  const { show: showToast } = useToast();
  const [account, setAccount] = useState<AgedAccount | null>(null);

  // Latch the category: TanStack Router re-renders this component with cleared
  // search params during the exit transition (e.g. back to `/`). Without the
  // latch, `param` momentarily becomes null → categoryId defaults to 'aged' →
  // aged gallery flashes for one frame before the route unmounts.
  const lastCategoryRef = useRef<MarketCategoryId>((param as MarketCategoryId) || "aged");
  const categoryId: MarketCategoryId = param
    ? (param as MarketCategoryId) === lastCategoryRef.current
      ? lastCategoryRef.current
      : (lastCategoryRef.current = param as MarketCategoryId)
    : lastCategoryRef.current;
  const category = MARKET_CATEGORIES.find((c) => c.id === categoryId);

  // DB-backed follower / smart accounts (admin-editable)
  const isFollowers = categoryId === "followers_acc";
  const isSmart = categoryId === "smart_acc";
  const isDbCat = isFollowers || isSmart;
  const {
    rows: allDbRows,
    loading: dbLoading,
    reload: reloadFollowerAccounts,
  } = useFollowerAccounts();
  const dbRows = useMemo(
    () => allDbRows.filter((r) => (r.category ?? "followers_acc") === categoryId),
    [allDbRows, categoryId],
  );
  const isListLoading = isDbCat && dbLoading && dbRows.length === 0;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorRow, setEditorRow] = useState<FollowerAccountRow | null>(null);
  const [adminSheetFor, setAdminSheetFor] = useState<AgedAccount | null>(null);
  const [xSelectMode, setXSelectMode] = useState(false);
  const [selectedXIds, setSelectedXIds] = useState<Set<string>>(new Set());
  const [xRefreshing, setXRefreshing] = useState(false);

  const rowById = useMemo(() => {
    const m = new Map<string, FollowerAccountRow>();
    for (const r of dbRows) m.set(r.id, r);
    return m;
  }, [dbRows]);

  const list = useMemo(() => {
    if (isDbCat) {
      const source =
        dbRows.length > 0
          ? dbRows.map((r) => rowToAccount(r))
          : dbLoading
            ? []
            : ACCOUNTS.filter((a) => a.category === categoryId);
      return source.map((acc) => ({
        ...acc,
        stock: Math.max(0, acc.stock - (soldAccounts[acc.id] ?? 0)),
      }));
    }
    return ACCOUNTS.filter((a) => a.category === categoryId).map((a) => ({
      ...a,
      stock: Math.max(0, a.stock - (soldAccounts[a.id] ?? 0)),
    }));
  }, [isDbCat, dbRows, dbLoading, categoryId, soldAccounts]);

  const liveAccount = account
    ? { ...account, stock: Math.max(0, account.stock - (soldAccounts[account.id] ?? 0)) }
    : null;

  const handleAdminMenu = isDbCat && isAdmin ? (a: AgedAccount) => setAdminSheetFor(a) : undefined;
  const toggleXSelected = useCallback((id: string) => {
    setSelectedXIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runSelectedXRefresh = useCallback(async () => {
    const ids = Array.from(selectedXIds).filter((id) => rowById.has(id));
    if (!ids.length) {
      showToast("Выбери карточки из базы для обновления");
      return;
    }
    setXRefreshing(true);
    try {
      const r = await refreshAccountsFromX({ data: { ids } });
      await reloadFollowerAccounts();
      showToast(
        r.updated
          ? `Обновлено ${r.updated}${r.notFound ? ` · не найдено ${r.notFound}` : ""}${r.failed ? ` · ошибок ${r.failed}` : ""}`
          : (r.results[0]?.error ?? "Нечего обновлять"),
      );
      setSelectedXIds(new Set());
      setXSelectMode(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setXRefreshing(false);
    }
  }, [selectedXIds, rowById, showToast, reloadFollowerAccounts]);
  const handleAdd =
    isDbCat && isAdmin
      ? () => {
          setEditorRow(null);
          setEditorOpen(true);
        }
      : undefined;

  if (liveAccount) {
    return <AccountDetail account={liveAccount} onBack={() => setAccount(null)} />;
  }

  const screen =
    categoryId === "aged" ? (
      <AgedGallery
        list={list}
        title={category ? category.name[lang] : t("aged_accounts")}
        onBack={back}
        onOpen={setAccount}
      />
    ) : (
      <FilterableAccountsView
        list={list}
        title={category ? category.name[lang] : t("aged_accounts")}
        onBack={back}
        onOpen={setAccount}
        isBlue={category?.accent === "blue"}
        Icon={category ? (ICONS[category.icon] ?? Package) : Package}
        loading={isListLoading}
        onAdminMenu={handleAdminMenu}
        onAdd={handleAdd}
        categoryId={categoryId}
        xSelectMode={xSelectMode}
        selectedXIds={selectedXIds}
        xRefreshing={xRefreshing}
        onSetXSelectMode={setXSelectMode}
        onToggleXSelect={toggleXSelected}
        onSetXSelection={setSelectedXIds}
        onClearXSelection={() => setSelectedXIds(new Set())}
        onRefreshXSelection={runSelectedXRefresh}
      />
    );

  return (
    <>
      {screen}
      {isDbCat && isAdmin && (
        <FollowerAccountEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          row={editorRow}
          category={isSmart ? "smart_acc" : "followers_acc"}
        />
      )}

      {adminSheetFor && (
        <AdminActionSheet
          account={adminSheetFor}
          row={rowById.get(adminSheetFor.id) ?? null}
          onClose={() => setAdminSheetFor(null)}
          onOpen={() => {
            setAccount(adminSheetFor);
            setAdminSheetFor(null);
          }}
          onEdit={async () => {
            const row = rowById.get(adminSheetFor.id);
            if (row) {
              setEditorRow(row);
              setEditorOpen(true);
              setAdminSheetFor(null);
              return;
            }

            const accountToImport = adminSheetFor;
            setAdminSheetFor(null);
            try {
              showToast("Переношу карточку в базу…");
              const created = await createFollowerAccount(
                followerInputFromAccount(accountToImport, isSmart ? "smart_acc" : "followers_acc"),
              );
              await reloadFollowerAccounts();
              setEditorRow(created as unknown as FollowerAccountRow);
              setEditorOpen(true);
              showToast("Карточка открыта на редактирование");
            } catch (e) {
              showToast(e instanceof Error ? e.message : "Не удалось открыть редактирование");
            }
          }}
          onSelectForRefresh={() => {
            const id = adminSheetFor.id;
            setXSelectMode(true);
            if (rowById.has(id)) toggleXSelected(id);
            else showToast("Сначала перенеси демо-карточку в базу через редактирование");
            setAdminSheetFor(null);
          }}
        />
      )}
    </>
  );
}

function AdminActionSheet({
  account,
  row,
  onClose,
  onOpen,
  onEdit,
  onSelectForRefresh,
}: {
  account: AgedAccount;
  row: FollowerAccountRow | null;
  onClose: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onSelectForRefresh: () => void;
}) {
  const { show } = useToast();
  useScrollLock(true);
  const [busy, setBusy] = useState<null | "sold" | "hide" | "dup" | "del" | "x">(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const soldOut = (row?.stock ?? account.stock) <= 0;
  const hidden = row ? !row.is_active : false;

  const run = async (
    kind: "sold" | "hide" | "dup" | "del",
    fn: () => Promise<void>,
    ok: string,
  ) => {
    if (!row) return;
    setBusy(kind);
    try {
      await fn();
      show(ok);
      if (kind === "del" || kind === "dup") onClose();
    } catch (e) {
      show(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  };

  const toggleSold = () =>
    run(
      "sold",
      () => updateFollowerAccount(row!.id, { stock: soldOut ? 1 : 0 }),
      soldOut ? "Возвращено в наличие" : "Помечено проданным",
    );

  const toggleHidden = () =>
    run(
      "hide",
      () => updateFollowerAccount(row!.id, { is_active: hidden }),
      hidden ? "Показано" : "Скрыто",
    );

  const duplicate = () =>
    run(
      "dup",
      async () => {
        const r = row!;
        await createFollowerAccount({
          name_ru: r.name_ru,
          name_en: r.name_en,
          description_ru: r.description_ru,
          description_en: r.description_en,
          description_enabled: r.description_enabled ?? false,
          year_range: r.year_range,
          price_per_account: Number(r.price_per_account),
          stock: r.stock,
          followers: r.followers,
          verification: r.verification,
          badge_ru: r.badge_ru,
          badge_en: r.badge_en,
          features: r.features ?? [],
          is_active: r.is_active,
          topic_id: r.topic_id,
          topic_ids: (r.topic_ids ?? []).filter((x): x is string => !!x),
          account_url: r.account_url,
          smart_followers: r.smart_followers,
          category: r.category ?? "followers_acc",
        });
      },
      "Дубликат создан",
    );

  const refreshFromX = async () => {
    if (!row) return;
    if (!row.account_url) {
      show("У карточки не указана ссылка x.com");
      return;
    }
    setBusy("x");
    try {
      const r = await refreshAccountsFromX({ data: { ids: [row.id] } });
      if (r.updated > 0) show("Данные обновлены из X");
      else if (r.notFound > 0) show("Аккаунт не найден в X");
      else show(r.results[0]?.error ?? "Не удалось обновить");
    } catch (e) {
      show(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setBusy(null);
    }
  };

  const remove = () => run("del", () => deleteFollowerAccount(row!.id), "Удалено");

  const ActionBtn = ({
    icon: Icon,
    label,
    onClick,
    variant = "default",
    loading,
    disabled,
  }: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    variant?: "default" | "primary" | "danger" | "warn";
    loading?: boolean;
    disabled?: boolean;
  }) => {
    const styles =
      variant === "primary"
        ? "bg-primary text-primary-foreground hover:brightness-110"
        : variant === "danger"
          ? "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : variant === "warn"
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
            : "border border-white/10 bg-white/[0.03] text-foreground hover:border-white/20 hover:bg-white/[0.06]";
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className={`flex h-14 items-center gap-3 rounded-xl px-4 text-left text-[14px] font-medium transition-all disabled:opacity-50 ${styles}`}
      >
        <Icon className={`size-[18px] shrink-0 ${loading ? "animate-spin" : ""}`} />
        <span className="flex-1 truncate">{label}</span>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[oklch(0.13_0.004_260)] p-4 pb-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />

        {/* Card summary */}
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              {account.name.ru}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>${Number(row?.price_per_account ?? account.pricePerAccount).toFixed(2)}</span>
              <span className="opacity-40">·</span>
              <span>{soldOut ? "Продано" : `${row?.stock ?? account.stock} шт.`}</span>
              {hidden && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-amber-400">Скрыто</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <ActionBtn icon={ExternalLink} label="Открыть карточку" onClick={onOpen} />
          <ActionBtn icon={Pencil} label="Редактировать" onClick={onEdit} variant="primary" />
          <ActionBtn
            icon={Check}
            label="Выбрать для массового обновления"
            onClick={onSelectForRefresh}
            disabled={!row}
          />
          <ActionBtn
            icon={RefreshCw}
            label="Обновить из X"
            onClick={refreshFromX}
            loading={busy === "x"}
            disabled={!row}
          />
          {!row && (
            <p className="px-1 text-[11.5px] leading-snug text-amber-400/90">
              Демо-карточка ещё не в базе. «Редактировать» автоматически перенесёт её в базу и сразу
              откроет настоящее редактирование.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn
              icon={soldOut ? RotateCcw : Tag}
              label={soldOut ? "Вернуть в наличие" : "Пометить проданным"}
              onClick={toggleSold}
              loading={busy === "sold"}
              disabled={!row}
              variant="warn"
            />
            <ActionBtn
              icon={hidden ? Eye : EyeOff}
              label={hidden ? "Показать" : "Скрыть"}
              onClick={toggleHidden}
              loading={busy === "hide"}
              disabled={!row}
            />
          </div>
          <ActionBtn
            icon={Copy}
            label="Дублировать"
            onClick={duplicate}
            loading={busy === "dup"}
            disabled={!row}
          />
          <ActionBtn
            icon={busy === "del" ? Loader2 : Trash2}
            label={confirmDel ? "Нажми ещё раз чтобы удалить" : "Удалить"}
            onClick={() => (confirmDel ? remove() : setConfirmDel(true))}
            loading={busy === "del"}
            disabled={!row}
            variant="danger"
          />
          <button
            onClick={onClose}
            className="mt-1 flex h-11 items-center justify-center rounded-xl text-[13px] text-muted-foreground hover:text-foreground"
          >
            Отмена
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   FILTERABLE VIEW — clean market desk for follower accounts
   ============================================================ */

const FL_LABELS = {
  ru: {
    all: "Все",
    stock: "В наличии",
    out: "Нет в наличии",
    empty: "Ничего не найдено",
    reset: "Сбросить",
    search: "Поиск по товару",
    followers: "Фолловеры",
    smart: "Smart-фолловеры",

    price: "Цена",
    year: "Год регистрации",
    topic: "Тематика",
    filters: "Фильтры",
    optional: "необязательно",
    show: "Применить",
    newest: "Сначала новые",
    from: "от",
    to: "до",
    availability: "Наличие",
    sort: "Сортировка",
    recommended: "Рекомендовано",
    highFollowers: "Больше фолловеров",
    lowPrice: "Сначала дешевле",
    highPrice: "Сначала дороже",
    perAccount: "за аккаунт",
    pieces: "шт.",
    selected: "подобрано",
  },
  en: {
    all: "All",
    stock: "In stock",
    out: "Sold out",
    empty: "Nothing found",
    reset: "Reset",
    search: "Search product",
    followers: "Followers",
    smart: "Smart followers",

    price: "Price",
    year: "Registration year",
    topic: "Topic",
    filters: "Filters",
    optional: "optional",
    show: "Apply",
    newest: "Newest first",
    from: "from",
    to: "to",
    availability: "Availability",
    sort: "Sort",
    recommended: "Recommended",
    highFollowers: "Most followers",
    lowPrice: "Price: low to high",
    highPrice: "Price: high to low",
    perAccount: "per account",
    pieces: "pcs",
    selected: "selected",
  },
} as const;

function fmtK(n: number) {
  return formatCompactFollowers(n);
}

function fmtM(n: number) {
  return formatCompactFollowersLatin(n);
}

function parsePositiveNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function accountReach(a: AgedAccount) {
  return a.followers ?? a.smartFollowers ?? 0;
}

/* ============================================================
   TOPIC SYSTEM — per-niche card identity
   ============================================================ */

import { TOPICS, TOPIC_ROTATION, isTopicId, type TopicId, type TopicMeta } from "@/lib/topics";

const TOPIC_BY_ID: Record<string, TopicId> = {
  acc_smart_crypto: "crypto",
  acc_smart_tech: "ai",
  acc_blue_std: "business",
  acc_blue_aged: "finance",
  acc_gold_org: "luxury",
  acc_gold_premium: "luxury",
  acc_foll_1k: "meme",
  acc_foll_10k: "lifestyle",
  acc_foll_50k: "gaming",
  foll_crypto: "crypto",
  foll_ai: "ai",
  foll_nsfw: "nsfw",
  foll_gaming: "gaming",
  foll_finance: "finance",
  foll_business: "business",
  foll_lifestyle: "lifestyle",
  foll_meme: "meme",
  foll_luxury: "luxury",
  foll_sports: "sports",
  foll_fashion: "fashion",
  foll_music: "music",
  foll_travel: "travel",
  foll_food: "food",
  foll_cars: "cars",
  foll_news: "news",
  foll_anime: "anime",
  foll_art: "art",
};

/**
 * Full ordered list of topics for the account. Primary is index 0.
 * Falls back to legacy single-topic + deterministic hash rules
 * when the account has no explicit topic set.
 */
function getAccountTopics(a: AgedAccount): TopicId[] {
  const out: TopicId[] = [];
  const push = (id: string | undefined) => {
    if (id && isTopicId(id) && !out.includes(id)) out.push(id);
  };
  if (Array.isArray(a.topicIds)) {
    for (const id of a.topicIds) push(id);
  }
  push(a.topicId);
  if (out.length > 0) return out;
  // Legacy fallbacks (only used when nothing is set explicitly)
  const explicit = TOPIC_BY_ID[a.id];
  if (explicit) return [explicit];
  const yearMatch = a.id.match(/^acc_year_(\d{4})$/);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    return [TOPIC_ROTATION[(y - 2009) % TOPIC_ROTATION.length]];
  }
  let h = 0;
  for (let i = 0; i < a.id.length; i++) h = (h * 31 + a.id.charCodeAt(i)) >>> 0;
  return [TOPIC_ROTATION[h % TOPIC_ROTATION.length]];
}

/**
 * Which topic's icon/color the card should render right now.
 * - No filter → primary.
 * - Filter matches primary → primary (stable anchor).
 * - Filter matches a secondary → first matching secondary by account order.
 */
function getDisplayTopic(a: AgedAccount, selectedTopics: Set<TopicId>): TopicMeta {
  const topics = getAccountTopics(a);
  if (topics.length === 0) return TOPICS[TOPIC_ROTATION[0]];
  if (selectedTopics.size === 0) return TOPICS[topics[0]];
  if (selectedTopics.has(topics[0])) return TOPICS[topics[0]];
  const match = topics.find((t) => selectedTopics.has(t));
  return TOPICS[match ?? topics[0]];
}

/** Primary topic — used for lookups that need one canonical answer. */
function getTopic(a: AgedAccount): TopicMeta {
  return TOPICS[getAccountTopics(a)[0] ?? TOPIC_ROTATION[0]];
}

/** Short ticker/monogram code for a topic — Bloomberg-style chip. */
const TOPIC_CODES: Record<TopicId, string> = {
  crypto: "₿",
  ai: "AI",
  nsfw: "18+",
  gaming: "GG",
  finance: "$",
  business: "BIZ",
  lifestyle: "LIF",
  meme: "LOL",
  luxury: "LUX",
  sports: "SPT",
  fashion: "FSN",
  music: "♪",
  travel: "TRV",
  food: "F&B",
  cars: "AUTO",
  news: "NWS",
  anime: "JP",
  art: "ART",
};
function getTopicCode(id: TopicId): string {
  return TOPIC_CODES[id] ?? id.slice(0, 3).toUpperCase();
}

function accountMatchesTopics(a: AgedAccount, selectedTopics: Set<TopicId>): boolean {
  if (selectedTopics.size === 0) return true;
  const topics = getAccountTopics(a);
  for (const t of topics) if (selectedTopics.has(t)) return true;
  return false;
}

type StockFilter = "all" | "in" | "out";
type AccountSort = "recommended" | "newest" | "priceAsc" | "priceDesc" | "followers";

function parseAccountYear(a: AgedAccount): number | null {
  if (typeof a.year === "number") return a.year;
  const m = a.yearRange?.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

function FilterableAccountsView({
  list,
  title,
  onBack,
  onOpen,
  isBlue,
  loading = false,
  onAdminMenu,
  onAdd,
  categoryId,
  xSelectMode = false,
  selectedXIds = new Set(),
  xRefreshing = false,
  onSetXSelectMode,
  onToggleXSelect,
  onSetXSelection,
  onClearXSelection,
  onRefreshXSelection,
}: {
  list: AgedAccount[];
  title: string;
  onBack?: () => void;
  onOpen: (a: AgedAccount) => void;
  isBlue: boolean;
  Icon: LucideIcon;
  loading?: boolean;
  onAdminMenu?: (a: AgedAccount) => void;
  onAdd?: () => void;
  categoryId: MarketCategoryId;
  hideBackAndFilter?: boolean;
  xSelectMode?: boolean;
  selectedXIds?: Set<string>;
  xRefreshing?: boolean;
  onSetXSelectMode?: (v: boolean) => void;
  onToggleXSelect?: (id: string) => void;
  onSetXSelection?: (ids: Set<string>) => void;
  onClearXSelection?: () => void;
  onRefreshXSelection?: () => void;
}) {
  const { t, lang } = useI18n();
  const L = (FL_LABELS as unknown as Record<string, typeof FL_LABELS.en>)[lang] ?? FL_LABELS.en;

  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [minSmart, setMinSmart] = useState("");
  const [maxSmart, setMaxSmart] = useState("");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<Set<TopicId>>(new Set());
  const [sort, setSort] = useState<AccountSort>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const availableTopics = useMemo(() => {
    const s = new Set<TopicId>();
    for (const a of list) for (const t of getAccountTopics(a)) s.add(t);
    return TOPIC_ROTATION.filter((id) => s.has(id));
  }, [list]);

  const filtered = useMemo(() => {
    const fMin = parsePositiveNumber(minFollowers);
    const fMax = parsePositiveNumber(maxFollowers);
    const sMin = parsePositiveNumber(minSmart);
    const sMax = parsePositiveNumber(maxSmart);
    const pMin = parsePositiveNumber(minPrice);
    const pMax = parsePositiveNumber(maxPrice);

    const yMin = parsePositiveNumber(minYear);
    const yMax = parsePositiveNumber(maxYear);

    const out = list.filter((a) => {
      const followers = accountReach(a);
      if (fMin !== null && followers < fMin) return false;
      if (fMax !== null && followers > fMax) return false;
      const smart = a.smartFollowers ?? 0;
      if (sMin !== null && smart < sMin) return false;
      if (sMax !== null && smart > sMax) return false;
      if (pMin !== null && a.pricePerAccount < pMin) return false;

      if (pMax !== null && a.pricePerAccount > pMax) return false;
      const y = parseAccountYear(a);
      if (yMin !== null && (y === null || y < yMin)) return false;
      if (yMax !== null && (y === null || y > yMax)) return false;
      if (!accountMatchesTopics(a, selectedTopics)) return false;
      return true;
    });

    out.sort((a, b) => {
      const aOut = a.stock <= 0;
      const bOut = b.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      if (sort === "priceAsc") {
        if (a.pricePerAccount !== b.pricePerAccount) return a.pricePerAccount - b.pricePerAccount;
      } else if (sort === "priceDesc") {
        if (a.pricePerAccount !== b.pricePerAccount) return b.pricePerAccount - a.pricePerAccount;
      } else if (sort === "followers") {
        const diff = accountReach(b) - accountReach(a);
        if (diff !== 0) return diff;
      } else if (sort === "newest") {
        // "Новые" = недавно добавленные карточки: сортируем по created_at desc,
        // при равных метках — по ручному sort_order asc.
        const aTime = a.createdAt ?? 0;
        const bTime = b.createdAt ?? 0;
        if (bTime !== aTime) return bTime - aTime;
        const so =
          (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
        if (so !== 0) return so;
      } else {
        // Default: respect admin manual order (new cards get min-10, so they surface at the top).
        const so =
          (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
        if (so !== 0) return so;
        const diff = b.stock - a.stock || accountReach(a) - accountReach(b);
        if (diff !== 0) return diff;
      }
      // Final tiebreaker: admin manual order (sortOrder ascending).
      return (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
    });

    return out;
  }, [
    list,
    minFollowers,
    maxFollowers,
    minSmart,
    maxSmart,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    selectedTopics,
    sort,
  ]);

  const totalStock = list.reduce((s, a) => s + a.stock, 0);

  const reset = () => {
    setMinFollowers("");
    setMaxFollowers("");
    setMinSmart("");
    setMaxSmart("");

    setMinPrice("");
    setMaxPrice("");
    setMinYear("");
    setMaxYear("");
    setSelectedTopics(new Set());
    setSort("newest");
  };

  const selectAllFiltered = () => {
    onSetXSelection?.(new Set(filtered.filter((a) => a.accountUrl).map((a) => a.id)));
    onSetXSelectMode?.(true);
  };

  const accentText = isBlue ? "text-info" : "text-primary";

  const isAdminMode = !!onAdminMenu;
  const [reorderMode, setReorderMode] = useState<ReorderMode>("off");
  const { show: toast } = useToast();

  // Sorted list in DB order (used for reorder/swap views).
  const orderedList = list;

  const renderCardForReorder = (a: AgedAccount, i: number) => (
    <AccountCard
      account={a}
      index={i}
      displayTopic={getDisplayTopic(a, selectedTopics)}
      onOpen={() => {}}
      lang={lang}
      labels={L}
      accentText={accentText}
      followersLabel={a.smartFollowers ? t("smart_label" as never) : t("followers_label" as never)}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ScreenHeader
        title={title}
        subtitle={
          reorderMode === "off"
            ? loading
              ? " "
              : `${filtered.length} ${t("items_count")} · ${totalStock} ${t("in_stock")}`
            : reorderMode === "drag"
              ? "Зажми и перетащи"
              : "Выбери 2 карточки"
        }
        onBack={onBack}
        right={
          <div className="flex items-center gap-1.5">
            {isAdminMode && reorderMode === "off" && (
              <>
                <button
                  onClick={() => onSetXSelectMode?.(!xSelectMode)}
                  aria-label="Выбор"
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-transform active:scale-95 ${
                    xSelectMode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/40 bg-primary/10 text-primary"
                  }`}
                >
                  <Check className="size-4" strokeWidth={2.4} />
                  <span className="hidden xs:inline">Выбор</span>
                </button>
                <button
                  onClick={() => setReorderMode("drag")}
                  aria-label="Переместить"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-[12px] font-semibold text-primary transition-transform active:scale-95"
                >
                  <GripVertical className="size-4" strokeWidth={2.2} />
                  <span className="hidden xs:inline">Порядок</span>
                </button>
                <button
                  onClick={() => setReorderMode("swap")}
                  aria-label="Обмен"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-[12px] font-semibold text-primary transition-transform active:scale-95"
                >
                  <ArrowLeftRight className="size-4" strokeWidth={2.2} />
                  <span className="hidden xs:inline">Обмен</span>
                </button>
              </>
            )}
            {reorderMode === "off" && (
              <button
                onClick={() => setFiltersOpen(true)}
                aria-label={L.filters}
                className="relative flex h-9 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-[12px] font-semibold text-foreground transition-transform active:scale-95"
              >
                <SlidersHorizontal className="size-4" strokeWidth={2.2} />
                <span className="hidden xs:inline">{L.filters}</span>
              </button>
            )}
          </div>
        }
      />

      <ReorderToolbar
        mode={reorderMode}
        onChange={setReorderMode}
        labels={{
          drag: "Режим перемещения — зажми карточку и тащи",
          swap: "Режим обмена — выбери 2 карточки",
          done: "Готово",
        }}
      />

      {isAdminMode && xSelectMode && reorderMode === "off" && (
        <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-30 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="h-9 rounded-xl border border-border bg-secondary px-3 text-[12px] font-bold text-foreground"
            >
              Все найденные
            </button>
            <button
              type="button"
              onClick={onClearXSelection}
              className="h-9 rounded-xl border border-border bg-card px-3 text-[12px] font-bold text-muted-foreground"
            >
              Снять
            </button>
            <button
              type="button"
              onClick={onRefreshXSelection}
              disabled={!selectedXIds.size || xRefreshing}
              className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-[12px] font-black text-primary-foreground disabled:opacity-45"
            >
              <RefreshCw className={`size-3.5 ${xRefreshing ? "animate-spin" : ""}`} />
              Обновить {selectedXIds.size}
            </button>
          </div>
        </div>
      )}

      {reorderMode === "drag" ? (
        <DragReorderGrid
          list={orderedList}
          renderCard={renderCardForReorder}
          onError={(m) => toast(m)}
        />
      ) : reorderMode === "swap" ? (
        <SwapGrid list={orderedList} renderCard={renderCardForReorder} onError={(m) => toast(m)} />
      ) : isBlue ? (
        <BlueVerifiedShowcase
          list={filtered}
          lang={lang}
          onOpen={onOpen}
          onAdminMenu={onAdminMenu}
        />
      ) : (
        <>
          <PaginatedGrid
            filtered={filtered}
            selectedTopics={selectedTopics}
            onOpen={onOpen}
            lang={lang}
            labels={L}
            accentText={accentText}
            reset={reset}
            followersLabelSmart={t("smart_label" as never)}
            followersLabelDefault={t("followers_label" as never)}
            loading={loading}
            onAdminMenu={onAdminMenu}
            categoryId={categoryId}
            xSelectMode={xSelectMode}
            selectedXIds={selectedXIds}
            onToggleXSelect={onToggleXSelect}
          />
        </>
      )}


      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        labels={L}
        lang={lang}
        categoryId={categoryId}
        applied={{
          sort,
          minFollowers,
          maxFollowers,
          minSmart,
          maxSmart,
          minPrice,
          maxPrice,
          minYear,
          maxYear,
          selectedTopics,
        }}
        availableTopics={availableTopics}
        list={list}
        onApply={(v) => {
          setSort(v.sort);
          setMinFollowers(v.minFollowers);
          setMaxFollowers(v.maxFollowers);
          setMinSmart(v.minSmart);
          setMaxSmart(v.maxSmart);
          setMinPrice(v.minPrice);
          setMaxPrice(v.maxPrice);
          setMinYear(v.minYear);
          setMaxYear(v.maxYear);
          setSelectedTopics(v.selectedTopics);
          setFiltersOpen(false);
        }}
      />

      {onAdd && (
        <button
          onClick={onAdd}
          className="fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] transition-transform hover:scale-105"
          aria-label="Добавить карточку"
        >
          <PlusIcon className="size-6" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   FILTERS SHEET — bottom-drawer filter panel
   ============================================================ */

type FilterValues = {
  sort: AccountSort;
  minFollowers: string;
  maxFollowers: string;
  minSmart: string;
  maxSmart: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  selectedTopics: Set<TopicId>;
};

function FiltersSheet({
  open,
  onClose,
  labels,
  lang,
  categoryId,
  applied,
  availableTopics,
  list,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  labels: typeof FL_LABELS.en;
  lang: string;
  categoryId: MarketCategoryId;
  applied: FilterValues;
  availableTopics: TopicId[];
  list: AgedAccount[];
  onApply: (v: FilterValues) => void;
}) {
  useScrollLock(open);
  const isSmartCat = categoryId === "smart_acc";
  // Local draft state — only committed to parent on Apply
  const [sort, setSort] = useState<AccountSort>(applied.sort);
  const [minFollowers, setMinFollowers] = useState(applied.minFollowers);
  const [maxFollowers, setMaxFollowers] = useState(applied.maxFollowers);
  const [minSmart, setMinSmart] = useState(applied.minSmart);
  const [maxSmart, setMaxSmart] = useState(applied.maxSmart);
  const [minPrice, setMinPrice] = useState(applied.minPrice);
  const [maxPrice, setMaxPrice] = useState(applied.maxPrice);
  const [minYear, setMinYear] = useState(applied.minYear);
  const [maxYear, setMaxYear] = useState(applied.maxYear);
  const [selectedTopics, setSelectedTopics] = useState<Set<TopicId>>(applied.selectedTopics);

  // Reset draft to applied every time the sheet opens
  useEffect(() => {
    if (open) {
      setSort(applied.sort);
      setMinFollowers(applied.minFollowers);
      setMaxFollowers(applied.maxFollowers);
      setMinSmart(applied.minSmart);
      setMaxSmart(applied.maxSmart);

      setMinPrice(applied.minPrice);
      setMaxPrice(applied.maxPrice);
      setMinYear(applied.minYear);
      setMaxYear(applied.maxYear);
      setSelectedTopics(new Set(applied.selectedTopics));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleTopic = (id: TopicId) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetDraft = () => {
    setSort("newest");
    setMinFollowers("");
    setMaxFollowers("");
    setMinSmart("");
    setMaxSmart("");

    setMinPrice("");
    setMaxPrice("");
    setMinYear("");
    setMaxYear("");
    setSelectedTopics(new Set());
  };

  const sortOptions: { value: AccountSort; label: string; Icon: LucideIcon }[] = [
    { value: "newest", label: labels.newest, Icon: Clock },
    { value: "priceAsc", label: labels.lowPrice, Icon: ArrowDownNarrowWide },
    { value: "priceDesc", label: labels.highPrice, Icon: ArrowUpNarrowWide },
  ];

  const draftCount = useMemo(() => {
    const fMin = parsePositiveNumber(minFollowers);
    const fMax = parsePositiveNumber(maxFollowers);
    const sMin = parsePositiveNumber(minSmart);
    const sMax = parsePositiveNumber(maxSmart);
    const pMin = parsePositiveNumber(minPrice);
    const pMax = parsePositiveNumber(maxPrice);
    const yMin = parsePositiveNumber(minYear);
    const yMax = parsePositiveNumber(maxYear);

    return list.filter((a) => {
      const followers = accountReach(a);
      if (fMin !== null && followers < fMin) return false;
      if (fMax !== null && followers > fMax) return false;
      const smart = a.smartFollowers ?? 0;
      if (sMin !== null && smart < sMin) return false;
      if (sMax !== null && smart > sMax) return false;
      if (pMin !== null && a.pricePerAccount < pMin) return false;
      if (pMax !== null && a.pricePerAccount > pMax) return false;
      const y = parseAccountYear(a);
      if (yMin !== null && (y === null || y < yMin)) return false;
      if (yMax !== null && (y === null || y > yMax)) return false;
      if (!accountMatchesTopics(a, selectedTopics)) return false;
      return true;
    }).length;
  }, [
    list,
    minFollowers,
    maxFollowers,
    minSmart,
    maxSmart,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    selectedTopics,
  ]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-3xl border-t border-border bg-background shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <SlidersHorizontal className="size-4 shrink-0 text-primary" strokeWidth={2.4} />
              <h2 className="flex-1 text-[15px] font-bold">{labels.filters}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-transform active:scale-90"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* Sort */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {labels.sort}
                </p>
                <div className="flex flex-col gap-2">
                  {sortOptions.map((o) => {
                    const active = sort === o.value;
                    const Icon = o.Icon;
                    return (
                      <button
                        key={o.value}
                        onClick={() => setSort(o.value)}
                        className={`flex h-11 items-center gap-2.5 rounded-xl border px-3.5 text-left text-[13px] font-semibold transition-colors ${
                          active
                            ? "border-primary/60 bg-primary/15 text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon
                          className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                          strokeWidth={2.2}
                        />
                        <span className="flex-1">{o.label}</span>
                        {active && (
                          <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.7)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topics */}
              {availableTopics.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {labels.topic}{" "}
                    <span className="font-mono normal-case text-muted-foreground/60">
                      ({labels.optional})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTopics.map((id) => {
                      const meta = TOPICS[id];
                      const active = selectedTopics.has(id);
                      const TopicIcon = meta.Icon;
                      const label = meta.label[lang === "ru" ? "ru" : "en"];
                      return (
                        <button
                          key={id}
                          onClick={() => toggleTopic(id)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors"
                          style={
                            active
                              ? {
                                  borderColor: meta.accent,
                                  background: `color-mix(in oklab, ${meta.accent} 18%, transparent)`,
                                  color: meta.accent,
                                }
                              : {
                                  borderColor: "oklch(from var(--border) l c h)",
                                  color: "oklch(from var(--foreground) l c h / 0.8)",
                                }
                          }
                        >
                          <TopicIcon className="size-3.5" strokeWidth={2.3} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Followers */}
              <RangeField
                label={`${labels.followers} (${labels.optional})`}
                from={minFollowers}
                to={maxFollowers}
                onFrom={setMinFollowers}
                onTo={setMaxFollowers}
                fromPlaceholder={labels.from}
                toPlaceholder={labels.to}
                prefix=""
              />

              {/* Smart followers — only for smart_acc */}
              {isSmartCat && (
                <RangeField
                  label={`${labels.smart} (${labels.optional})`}
                  from={minSmart}
                  to={maxSmart}
                  onFrom={setMinSmart}
                  onTo={setMaxSmart}
                  fromPlaceholder={labels.from}
                  toPlaceholder={labels.to}
                  prefix=""
                />
              )}

              {/* Year */}
              <RangeField
                label={`${labels.year} (${labels.optional})`}
                from={minYear}
                to={maxYear}
                onFrom={setMinYear}
                onTo={setMaxYear}
                fromPlaceholder="2009"
                toPlaceholder="2026"
                prefix=""
              />

              {/* Price */}
              <RangeField
                label={`${labels.price} (${labels.optional})`}
                from={minPrice}
                to={maxPrice}
                onFrom={setMinPrice}
                onTo={setMaxPrice}
                fromPlaceholder={labels.from}
                toPlaceholder={labels.to}
                prefix="$"
              />
            </div>

            {/* Footer CTA */}
            <div className="flex items-stretch gap-2 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={resetDraft}
                className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-4 text-[13px] font-semibold text-foreground transition-transform active:scale-[0.97]"
              >
                <RotateCcw className="size-4" strokeWidth={2.2} />
                {labels.reset}
              </button>
              <button
                onClick={() =>
                  onApply({
                    sort,
                    minFollowers,
                    maxFollowers,
                    minSmart,
                    maxSmart,
                    minPrice,

                    maxPrice,
                    minYear,
                    maxYear,
                    selectedTopics,
                  })
                }
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7)] transition-transform active:scale-[0.98]"
              >
                {labels.show}
                <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 font-mono text-[12px] tabular-nums">
                  {draftCount}
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const PAGE_SIZE = 8; // 2 cols × 4 rows

function PaginatedGrid({
  filtered,
  selectedTopics,
  onOpen,
  lang,
  labels,
  accentText,
  reset,
  followersLabelSmart,
  followersLabelDefault,
  loading,
  onAdminMenu,
  categoryId,
  xSelectMode = false,
  selectedXIds = new Set(),
  onToggleXSelect,
}: {
  filtered: AgedAccount[];
  selectedTopics: Set<TopicId>;
  onOpen: (a: AgedAccount) => void;
  lang: string;
  labels: typeof FL_LABELS.en;
  accentText: string;
  reset: () => void;
  followersLabelSmart: string;
  followersLabelDefault: string;
  loading?: boolean;
  onAdminMenu?: (a: AgedAccount) => void;
  categoryId?: MarketCategoryId;
  xSelectMode?: boolean;
  selectedXIds?: Set<string>;
  onToggleXSelect?: (id: string) => void;
}) {
  const isSmart = false;
  const isBlue = categoryId === "blue_acc";
  const pageSize = PAGE_SIZE;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // reset to first page whenever filter set shrinks below current
  if (page !== currentPage && currentPage >= 1) {
    // safe: setState in render triggers re-render, guarded by inequality
    queueMicrotask(() => setPage(currentPage));
  }

  if (loading) return <AccountGridSkeleton />;

  if (filtered.length === 0) {
    return (
      <div className="px-4 pb-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center"
        >
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
          <button
            onClick={reset}
            className="rounded-lg border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            {labels.reset}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8">
      <div
        className={
          isSmart
            ? "flex flex-col border-t border-white/10"
            : isBlue
              ? "flex flex-col gap-3"
              : "grid grid-cols-2 gap-3"
        }
      >
        <AnimatePresence mode="popLayout" initial>
          {pageItems.map((a, i) => {
            const isSelected = selectedXIds.has(a.id);
            const canSelect = Boolean(a.accountUrl);
            const openOrSelect = () => {
              if (xSelectMode) {
                if (canSelect) onToggleXSelect?.(a.id);
                return;
              }
              onOpen(a);
            };
            const card = isSmart ? (
              <SmartAccountCard
                account={a}
                index={i}
                displayTopic={getDisplayTopic(a, selectedTopics)}
                onOpen={openOrSelect}
                lang={lang}
                labels={labels}
                onAdminMenu={onAdminMenu ? () => onAdminMenu(a) : undefined}
              />
            ) : isBlue ? (
              <BlueVerifiedCard
                account={a}
                index={i}
                onOpen={openOrSelect}
                lang={lang}
                labels={labels}
                onAdminMenu={onAdminMenu ? () => onAdminMenu(a) : undefined}
              />
            ) : (
              <AccountCard
                account={a}
                index={i}
                displayTopic={getDisplayTopic(a, selectedTopics)}
                onOpen={openOrSelect}
                lang={lang}
                labels={labels}
                accentText={accentText}
                followersLabel={a.smartFollowers ? followersLabelSmart : followersLabelDefault}
                onAdminMenu={onAdminMenu ? () => onAdminMenu(a) : undefined}
              />
            );

            return (
              <div key={a.id} className="relative">
                {card}
                {xSelectMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canSelect) onToggleXSelect?.(a.id);
                    }}
                    disabled={!canSelect}
                    className={`absolute left-2 top-2 z-30 flex size-8 items-center justify-center rounded-xl border backdrop-blur transition-transform active:scale-95 disabled:opacity-40 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/90 text-muted-foreground"
                    }`}
                    aria-label={isSelected ? "Снять выбор" : "Выбрать карточку"}
                    title={canSelect ? "Выбрать для X-обновления" : "Нет ссылки X"}
                  >
                    {isSelected ? <Check className="size-4" strokeWidth={3} /> : null}
                  </button>
                )}
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <PagePicker currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}

function PagePicker({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (n: number) => void;
}) {
  const [padOpen, setPadOpen] = useState(false);
  const [draft, setDraft] = useState("");
  useScrollLock(padOpen);

  const openPad = () => {
    setDraft("");
    setPadOpen(true);
  };
  const closePad = () => setPadOpen(false);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return closePad();
    const clamped = Math.min(totalPages, Math.max(1, n));
    onChange(clamped);
    closePad();
  };

  const pressDigit = (d: string) => {
    setDraft((prev) => {
      const next = (prev + d).replace(/^0+/, "");
      // cap length to avoid huge numbers
      return next.slice(0, 6);
    });
  };
  const pressBack = () => setDraft((prev) => prev.slice(0, -1));

  const previewNum = draft
    ? Math.min(totalPages, Math.max(1, parseInt(draft, 10) || 1))
    : currentPage;
  const outOfRange = draft !== "" && (parseInt(draft, 10) > totalPages || parseInt(draft, 10) < 1);

  return (
    <>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95 disabled:opacity-25 disabled:hover:text-muted-foreground"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={openPad}
          className="tabular-nums text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Page ${currentPage} of ${totalPages}. Tap to enter page`}
        >
          <span className="text-foreground font-medium">{currentPage}</span>
          <span className="mx-1.5 opacity-40">/</span>
          <span>{totalPages}</span>
        </button>

        <button
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95 disabled:opacity-25 disabled:hover:text-muted-foreground"
          aria-label="Next page"
        >
          <ChevronRight className="size-5" strokeWidth={2} />
        </button>
      </div>

      <AnimatePresence>
        {padOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            onClick={closePad}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-t-3xl border border-border bg-card p-5 pb-6 shadow-2xl sm:rounded-3xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Page
                </span>
                <button
                  onClick={closePad}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div
                className={`mb-1 flex h-16 items-center justify-center rounded-2xl border font-mono text-4xl font-bold tabular-nums ${
                  outOfRange
                    ? "border-red-500/60 bg-red-500/10 text-red-400"
                    : "border-primary/50 bg-primary/10 text-primary"
                }`}
              >
                {draft || currentPage}
              </div>
              <div className="mb-4 text-center text-[11px] font-medium text-muted-foreground">
                {outOfRange ? `1 – ${totalPages}` : `→ page ${previewNum} of ${totalPages}`}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => pressDigit(d)}
                    className="h-12 rounded-xl border border-border bg-background/60 font-mono text-lg font-semibold text-foreground transition-colors hover:border-primary/40 active:bg-primary/10"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={pressBack}
                  className="h-12 rounded-xl border border-border bg-background/60 font-mono text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 active:bg-primary/10"
                  aria-label="Backspace"
                >
                  ⌫
                </button>
                <button
                  onClick={() => pressDigit("0")}
                  className="h-12 rounded-xl border border-border bg-background/60 font-mono text-lg font-semibold text-foreground transition-colors hover:border-primary/40 active:bg-primary/10"
                >
                  0
                </button>
                <button
                  onClick={() => commit(draft || String(currentPage))}
                  disabled={outOfRange}
                  className="h-12 rounded-xl border border-primary/60 bg-primary/20 font-mono text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AccountGridSkeleton() {
  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div
            key={i}
            className="min-h-[148px] overflow-hidden rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="h-3 w-16 rounded-full bg-secondary animate-pulse" />
              <div className="size-4 rounded-full bg-secondary animate-pulse" />
            </div>
            <div className="mt-8 h-7 w-20 rounded-md bg-secondary animate-pulse" />
            <div className="mt-2 h-2.5 w-24 rounded-full bg-secondary animate-pulse" />
            <div className="mt-8 flex items-end justify-between">
              <div className="space-y-2">
                <div className="h-2 w-14 rounded-full bg-secondary animate-pulse" />
                <div className="h-5 w-16 rounded-md bg-secondary animate-pulse" />
              </div>
              <div className="size-7 rounded-full bg-secondary animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ACCOUNT CARD — Midnight gold luxury
   ============================================================ */

function AccountCard({
  account,
  index,
  displayTopic,
  onOpen,
  lang,
  labels,
  accentText,
  followersLabel,
  onAdminMenu,
}: {
  account: AgedAccount;
  index: number;
  displayTopic?: TopicMeta;
  onOpen: () => void;
  lang: string;
  labels: typeof FL_LABELS.en;
  accentText: string;
  followersLabel: string;
  onAdminMenu?: () => void;
}) {
  const soldOut = account.stock <= 0;
  const followers = accountReach(account);

  const verif = account.verification;
  const isBlue = verif === "blue";
  const isGold = verif === "gold";
  const isVerified = isBlue || isGold;
  const verifColor = isGold ? "oklch(0.85 0.14 88)" : "oklch(0.72 0.15 235)";

  const topic = displayTopic ?? getTopic(account);
  const TopicIcon = topic.Icon;
  const topicLabel = topic.label[lang === "ru" ? "ru" : "en"];
  const isNsfw = topic.id === "nsfw";
  const featured = index % 3 === 1;

  // Long-press for admin
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = () => {
    if (!onAdminMenu) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onAdminMenu();
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (!soldOut) onOpen();
  };

  const accent = topic.accent;
  const glow = topic.glow;

  return (
    <div>
      <motion.div
        layout="position"
        role="button"
        tabIndex={soldOut && !onAdminMenu ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => {
          if (onAdminMenu) {
            e.preventDefault();
            longPressFired.current = true;
            onAdminMenu();
          }
        }}
        whileTap={{ scale: soldOut ? 1 : 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
          delay: Math.min(index, 7) * 0.015,
        }}
        className={[
          "group relative flex w-full flex-col overflow-hidden rounded-2xl border p-4 text-left outline-none transition-all duration-300",
          soldOut
            ? "cursor-not-allowed border-white/5 bg-[oklch(0.11_0.003_260)] opacity-45 grayscale"
            : featured
              ? "border-white/[0.12] bg-[oklch(0.17_0.006_68)] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.55)]"
              : "border-white/[0.06] bg-[oklch(0.13_0.004_260)] hover:border-white/[0.12] hover:bg-[oklch(0.15_0.005_260)]",
        ].join(" ")}
      >
        {onAdminMenu && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              longPressFired.current = true;
              onAdminMenu();
            }}
            className="absolute right-3 top-3 z-20 flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label={`Редактировать ${account.name.ru}`}
            title="Редактировать"
          >
            <Pencil className="size-3" strokeWidth={2.2} />
          </button>
        )}

        {/* Featured accent rail */}
        {!soldOut && featured && (
          <div
            aria-hidden
            className="absolute left-0 top-0 h-full w-[3px]"
            style={{ background: `linear-gradient(to bottom, ${accent}, transparent)` }}
          />
        )}

        {/* Ambient corner glow */}
        {!soldOut && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-50 blur-3xl"
            style={{ background: glow }}
          />
        )}

        {/* Header: topic chip + verification */}
        <div className="relative mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {isNsfw ? (
              <span
                className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-dm-sans text-[10px] font-black tracking-tight"
                style={{
                  borderColor: soldOut ? "oklch(0.35 0 0)" : accent,
                  color: soldOut ? "oklch(0.55 0 0)" : accent,
                  background: soldOut
                    ? "transparent"
                    : `color-mix(in oklab, ${accent} 12%, transparent)`,
                }}
              >
                NSFW / 18+
              </span>
            ) : (
              <span
                className="inline-flex min-w-0 items-center gap-1 font-dm-sans text-[10px] font-semibold uppercase tracking-[0.16em] opacity-95"
                style={{ color: soldOut ? "oklch(0.55 0 0)" : accent }}
              >
                <TopicIcon className="size-3 shrink-0" strokeWidth={2.25} />
                <span className="truncate">{topicLabel}</span>
              </span>
            )}
          </div>

          <div className={onAdminMenu ? "relative mr-9" : "relative"}>
            {isVerified ? (
              <VerifiedBadge
                className="size-4"
                style={{ color: soldOut ? "oklch(0.4 0 0)" : verifColor }}
              />
            ) : (
              <div className="relative">
                <VerifiedBadge className="size-4 text-zinc-700" />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="h-[1.5px] w-4 rotate-45 rounded-full bg-red-600/70" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Followers — hero */}
        <div className="mb-3 flex flex-col">
          <span
            className={[
              "font-space-grotesk font-semibold leading-none tracking-[-0.03em] tabular-nums text-white",
              account.followersRange ? "text-[24px]" : "text-[30px]",
              soldOut ? "text-zinc-500" : "text-white",
            ].join(" ")}
          >
            {account.followersRange
              ? `${fmtK(account.followersRange[0])}–${fmtK(account.followersRange[1])}`
              : fmtK(followers)}
          </span>
          <span className="mt-1 font-dm-sans text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
            {lang === "ru" ? "Фолловеров" : "Followers"}
          </span>
        </div>

        {account.smartFollowers ? (
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-dm-sans text-[11px] font-medium text-white/60">
              {followersLabel}
            </span>
            <span className="font-space-grotesk text-[15px] font-semibold leading-none tracking-tight tabular-nums text-white/80">
              {account.smartFollowers < 1000
                ? account.smartFollowers
                : fmtK(account.smartFollowers)}
            </span>
          </div>
        ) : null}

        {/* Footer: year + price */}
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-dm-sans text-[10px] font-medium uppercase tracking-wider text-white/40">
              Est. {parseAccountYear(account) ?? "2020"}
            </span>
            <span
              className={[
                "font-space-grotesk text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
                soldOut ? "text-zinc-600" : "text-white",
              ].join(" ")}
            >
              {money(account.pricePerAccount)}
            </span>
          </div>
          {!soldOut && (
            <span
              className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/80"
            >
              <ArrowRight className="size-3.5" />
            </span>
          )}
        </div>

        {/* Sold-out red diagonal strike */}
        {soldOut && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <div
              className="absolute left-1/2 top-1/2 h-[1.5px] w-[160%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-red-600"
              style={{ boxShadow: "0 0 10px rgba(220,38,38,0.75)" }}
            />
            <span className="absolute bottom-2 right-2 text-[8px] font-black uppercase tracking-tighter text-red-500">
              {labels.out}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function BlueVerifiedCard({
  account,
  index,
  onOpen,
  lang,
  labels,
  onAdminMenu,
}: {
  account: AgedAccount;
  index: number;
  onOpen: () => void;
  lang: string;
  labels: typeof FL_LABELS.en;
  onAdminMenu?: () => void;
}) {
  const soldOut = account.stock <= 0;
  const range = account.followersRange;
  const rangeText = range ? `${fmtK(range[0])}–${fmtK(range[1])}` : fmtK(accountReach(account));

  // Tier derived from followers ceiling: II / III / IV (tier I was removed)
  const tierRoman = range ? (range[1] <= 500 ? "II" : range[1] <= 1000 ? "III" : "IV") : "II";
  const tierName = tierRoman === "II" ? "Growth" : tierRoman === "III" ? "Pro" : "Elite";

  const yearText = account.yearRange || (account.year ? String(account.year) : "—");
  const featured = index % 3 === 1;

  // Long-press for admin
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = () => {
    if (!onAdminMenu) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onAdminMenu();
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (!soldOut) onOpen();
  };

  const BLUE = "oklch(0.72 0.15 235)";

  return (
    <motion.div
      layout="position"
      role="button"
      tabIndex={soldOut && !onAdminMenu ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => {
        if (onAdminMenu) {
          e.preventDefault();
          longPressFired.current = true;
          onAdminMenu();
        }
      }}
      whileTap={{ scale: soldOut ? 1 : 0.985 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index, 6) * 0.03,
      }}
      className={[
        "group relative isolate flex w-full flex-col overflow-hidden rounded-[20px] border text-left outline-none transition-all duration-300",
        soldOut
          ? "cursor-not-allowed border-white/5 bg-indigo-950 opacity-45 grayscale"
          : featured
            ? "border-indigo-500/45 bg-gradient-to-br from-indigo-900 via-indigo-950 to-indigo-1000 shadow-[0_30px_70px_-40px_rgba(79,70,229,0.6)] hover:border-indigo-500/70"
            : "border-white/[0.07] bg-indigo-950/80 hover:border-indigo-500/30 hover:bg-indigo-900/50",
      ].join(" ")}
    >
      {/* Ambient glow */}
      {!soldOut && featured && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-indigo-500/20 blur-3xl"
        />
      )}

      {/* Top row */}
      <div className="relative flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex size-11 shrink-0 items-center justify-center rounded-xl border",
              featured
                ? "border-indigo-500/35 bg-indigo-500/12"
                : "border-white/[0.08] bg-white/[0.04]",
            ].join(" ")}
          >
            <VerifiedBadge className="size-6" style={{ color: BLUE }} />
          </div>
          <div className="flex flex-col">
            <span className="font-space-grotesk text-[13px] font-semibold tracking-[-0.01em] text-white">
              {tierName}
            </span>
            <span className="font-dm-sans text-[10px] font-medium uppercase tracking-[0.22em] text-white/35">
              tier {tierRoman}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {featured && !soldOut && (
            <span className="rounded-full border border-indigo-500/35 bg-indigo-500/12 px-2.5 py-1 font-dm-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
              {lang === "ru" ? "Популярный" : "Popular"}
            </span>
          )}
          {onAdminMenu && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                longPressFired.current = true;
                onAdminMenu();
              }}
              className="z-20 flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:text-white"
              aria-label={`Редактировать ${account.name.ru}`}
              title="Редактировать"
            >
              <Pencil className="size-3" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Hero metric */}
      <div className="relative px-5 pt-4">
        <div className="flex items-baseline gap-2">
          <span className="font-space-grotesk text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-white">
            {rangeText}
          </span>
          <span className="font-dm-sans text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
            {labels.followers.toLowerCase()}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-dm-sans text-[11px] font-medium tabular-nums text-white/65">
            {yearText}
          </span>
          <span
            className={[
              "rounded-md border px-2 py-1 font-dm-sans text-[11px] font-medium",
              featured
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                : "border-white/[0.08] bg-white/[0.03] text-white/65",
            ].join(" ")}
          >
            {lang === "ru" ? "Верифицирован" : "Verified"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div
        aria-hidden
        className={[
          "mx-5 mt-4 h-px",
          featured
            ? "bg-gradient-to-r from-indigo-500/40 via-indigo-500/10 to-transparent"
            : "bg-white/[0.06]",
        ].join(" ")}
      />

      {/* Footer */}
      <div className="relative flex items-center justify-between px-5 py-4">
        <div className="flex flex-col">
          <span className="font-dm-sans text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
            {lang === "ru" ? "Цена" : "Price"}
          </span>
          <span className="font-space-grotesk text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-white">
            {money(account.pricePerAccount)}
          </span>
        </div>
        {!soldOut && (
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-dm-sans text-[12px] font-semibold transition-all duration-300",
              featured
                ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-200 group-hover:bg-indigo-500/25"
                : "border-white/10 bg-white/[0.04] text-white/70 group-hover:border-indigo-500/30 group-hover:text-white",
            ].join(" ")}
          >
            {lang === "ru" ? "Купить" : "Buy"}
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        )}
      </div>

      {soldOut && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-[1.5px] w-[160%] -translate-x-1/2 -translate-y-1/2 rotate-[10deg] bg-red-600"
            style={{ boxShadow: "0 0 10px rgba(220,38,38,0.7)" }}
          />
          <span className="absolute bottom-2 right-3 text-[9px] font-black uppercase tracking-tighter text-red-500">
            {labels.out}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function SmartAccountCard({
  account,
  index,
  displayTopic,
  onOpen,
  lang,
  labels,
  onAdminMenu,
}: {
  account: AgedAccount;
  index: number;
  displayTopic?: TopicMeta;
  onOpen: () => void;
  lang: string;
  labels: typeof FL_LABELS.en;
  onAdminMenu?: () => void;
}) {
  const soldOut = account.stock <= 0;
  const topic = displayTopic ?? getTopic(account);
  const TopicIcon = topic.Icon;
  const topicLabel = topic.label[lang === "ru" ? "ru" : "en"];
  const isNsfw = topic.id === "nsfw";
  const year = parseAccountYear(account) ?? account.yearRange;
  const followers = account.followers ?? 0;
  const smart = account.smartFollowers ?? 0;
  const autoDelivery = account.autoDelivery === true;

  const isRu = lang === "ru";
  const followersLbl = isRu ? "Фолловеры" : "Followers";
  const smartLbl = isRu ? "Smart" : "Smart";
  const yearLbl = isRu ? "Год" : "Year";
  const autoLbl = isRu ? "Автовыдача" : "Auto-delivery";
  const yesLbl = isRu ? "Да" : "Yes";
  const noLbl = isRu ? "Нет" : "No";

  // Long-press for admin
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = () => {
    if (!onAdminMenu) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onAdminMenu();
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (!soldOut) onOpen();
  };

  return (
    <motion.div
      layout="position"
      role="button"
      tabIndex={soldOut && !onAdminMenu ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => {
        if (onAdminMenu) {
          e.preventDefault();
          longPressFired.current = true;
          onAdminMenu();
        }
      }}
      whileHover={soldOut ? undefined : { rotateX: -1.5, z: 6 }}
      whileTap={soldOut ? undefined : { scale: 0.985, rotateX: 3, z: -4 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index, 7) * 0.012,
      }}
      style={{ perspective: 900, transformStyle: "preserve-3d" }}
      className={`group relative flex w-full items-stretch border-b border-white/10 text-left outline-none transition-colors hover:bg-white/[0.02] ${
        soldOut ? "cursor-not-allowed opacity-50 grayscale" : ""
      }`}
    >
      {/* Left accent bar keyed to topic */}
      <div
        aria-hidden
        className="w-[3px] shrink-0"
        style={{ background: soldOut ? "var(--muted-foreground)" : topic.accent }}
      />

      <div className="flex flex-1 items-center gap-3 px-3.5 py-3">
        {/* Sequence № — plain integer */}
        <div className="w-5 shrink-0 font-mono text-[13px] font-semibold leading-none text-white/45 tabular-nums">
          {index + 1}
        </div>

        {/* Topic ticker chip — 3D coin */}
        <div aria-hidden className="relative h-9 w-9 shrink-0" style={{ perspective: 600 }}>
          <motion.div
            className="relative h-full w-full rounded-[9px]"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: [0, 4, 0, -4, 0], rotateX: [0, -3, 0, 3, 0] }}
            transition={{
              duration: 7 + (index % 5),
              repeat: Infinity,
              ease: "easeInOut",
              delay: (index % 6) * 0.4,
            }}
            whileHover={{ rotateY: 180, scale: 1.05 }}
          >
            {/* Front face */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[9px] px-1"
              style={{
                backfaceVisibility: "hidden",
                background: `linear-gradient(155deg, color-mix(in oklab, ${topic.accent} 32%, transparent) 0%, color-mix(in oklab, ${topic.accent} 10%, transparent) 55%, color-mix(in oklab, ${topic.accent} 22%, black 8%) 100%)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${topic.accent} 50%, transparent), inset 0 1px 0 color-mix(in oklab, ${topic.accent} 65%, white 20%), inset 0 -4px 8px -4px color-mix(in oklab, ${topic.accent} 40%, black 30%), 0 4px 10px -4px ${topic.glow}`,
              }}
            >
              {/* Rotating specular sheen */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)",
                  mixBlendMode: "overlay",
                  transform: "translateX(-30%)",
                  animation: `sheen ${5 + (index % 4)}s ease-in-out infinite`,
                }}
              />
              <span
                className="relative font-mono text-[11px] font-bold leading-none tracking-[0.04em]"
                style={{
                  color: `color-mix(in oklab, ${topic.accent} 88%, white 12%)`,
                  textShadow: `0 1px 0 color-mix(in oklab, ${topic.accent} 40%, black 60%)`,
                }}
              >
                {getTopicCode(topic.id)}
              </span>
            </div>
            {/* Back face — metallic accent */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-[9px]"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: `radial-gradient(circle at 30% 25%, color-mix(in oklab, ${topic.accent} 60%, white 30%), color-mix(in oklab, ${topic.accent} 70%, black 20%) 70%)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${topic.accent} 70%, white 20%), 0 6px 14px -6px ${topic.glow}`,
              }}
            >
              <span className="font-display text-[10px] font-black uppercase leading-none tracking-[0.08em] text-black/70">
                {topicLabel.slice(0, 3)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Middle: topic label + stats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-[13px] font-semibold uppercase tracking-[0.01em] text-white">
              {isNsfw ? "NSFW / 18+" : topicLabel}
            </h3>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[13px] font-bold leading-none text-gold tabular-nums">
                {fmtK(smart)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gold/70">
                Smart
              </span>
            </div>
            <span aria-hidden className="h-3 w-px bg-white/15" />
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[13px] font-bold leading-none text-white/90 tabular-nums">
                {fmtK(followers)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
                {isRu ? "Всего" : "Total"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: year pill (Twitter-style) */}
        <span className="inline-flex shrink-0 items-center rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold leading-none text-white/80 tabular-nums">
          {year}
        </span>

        {/* Admin menu */}
        {onAdminMenu && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              longPressFired.current = true;
              onAdminMenu();
            }}
            className="ml-1 flex size-7 items-center justify-center rounded-full text-white/25 transition-colors hover:text-white active:scale-95"
            aria-label={`Редактировать ${account.name.ru}`}
          >
            <Pencil className="size-3" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Sold-out red diagonal strike */}
      {soldOut && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-[1.5px] w-[160%] -translate-x-1/2 -translate-y-1/2 rotate-[6deg] bg-red-600"
            style={{ boxShadow: "0 0 10px rgba(220,38,38,0.75)" }}
          />
        </div>
      )}
    </motion.div>
  );
}

function Stat({
  label,
  value,
  soldOut,
  accent,
}: {
  label: string;
  value: string;
  soldOut: boolean;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={`font-display text-[15px] font-bold leading-none tabular-nums ${
          soldOut ? "text-zinc-500" : "text-white"
        }`}
        style={accent && !soldOut ? { color: accent } : undefined}
      >
        {value}
      </span>
      <span className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function RangeField({
  label,
  from,
  to,
  onFrom,
  onTo,
  fromPlaceholder,
  toPlaceholder,
  prefix,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  fromPlaceholder: string;
  toPlaceholder: string;
  prefix: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="mb-2 truncate text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="flex h-9 items-center rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground focus-within:border-primary/60">
          {prefix && <span className="shrink-0">{prefix}</span>}
          <input
            inputMode="decimal"
            value={from}
            onChange={(e) => onFrom(e.target.value.replace(/[^ -~\d.,]/g, ""))}
            placeholder={fromPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-center font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="flex h-9 items-center rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground focus-within:border-primary/60">
          {prefix && <span className="shrink-0">{prefix}</span>}
          <input
            inputMode="decimal"
            value={to}
            onChange={(e) => onTo(e.target.value.replace(/[^ -~\d.,]/g, ""))}
            placeholder={toPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-center font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
    </div>
  );
}

function SortSelect({
  value,
  onChange,
  labels,
}: {
  value: AccountSort;
  onChange: (v: AccountSort) => void;
  labels: typeof FL_LABELS.en;
}) {
  return (
    <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-[12px] font-medium text-secondary-foreground">
      <span className="text-muted-foreground">{labels.sort}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AccountSort)}
        className="bg-transparent text-[12px] font-semibold text-foreground outline-none"
      >
        <option value="recommended">{labels.recommended}</option>
        <option value="followers">{labels.highFollowers}</option>
        <option value="priceAsc">{labels.lowPrice}</option>
        <option value="priceDesc">{labels.highPrice}</option>
      </select>
    </label>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 shrink-0 rounded-lg border px-3 text-[12px] font-semibold tabular-nums transition-colors ${
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
      }`}
    >
      {dot && (
        <span
          className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${
            active ? "bg-success" : "bg-muted-foreground"
          }`}
        />
      )}
      {label}
    </button>
  );
}

/* ============================================================
   AGED GALLERY — full-page year grid
   ============================================================ */

function AgedGallery({
  list,
  title,
  onBack,
  onOpen,
}: {
  list: AgedAccount[];
  title: string;
  onBack: () => void;
  onOpen: (a: AgedAccount) => void;
}) {
  const { t } = useI18n();
  const { addToCart } = useStore();
  const { show: toast } = useToast();
  const { go } = useNav();
  const { version: pricingVersion } = usePricing();
  const loadSupplierProducts = useServerFn(spListProducts);
  const [mode, setMode] = useState<"random" | "manual">("random");
  const [productId, setProductId] = useState<"fresh" | "aged">("aged");
  const [qty, setQty] = useState(1);
  const [showAbout, setShowAbout] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState<SpProductSummary[]>([]);

  useEffect(() => {
    let active = true;
    void loadSupplierProducts()
      .then((products) => {
        if (active) setSupplierProducts(products);
      })
      .catch((error) => console.error("[supplier-products]", error));
    return () => {
      active = false;
    };
  }, [loadSupplierProducts]);

  const sorted = useMemo(() => {
    const out = [...list];
    // Fresh blanks first (supplier order), then old dated by year ascending
    out.sort((a, b) => {
      const af = a.yearRange === "FRESH" ? 0 : 1;
      const bf = b.yearRange === "FRESH" ? 0 : 1;
      if (af !== bf) return af - bf;
      return (a.year ?? 0) - (b.year ?? 0);
    });
    return out;
  }, [list, pricingVersion]);

  const fresh = sorted.find((a) => a.yearRange === "FRESH");
  const dated = sorted.filter((a) => a.yearRange !== "FRESH");
  const liveFresh = supplierProducts.find((product) => product.slug === "fresh-twitter-accounts");
  const liveDated = supplierProducts.find(
    (product) => product.slug === "old-dated-twitter-accounts",
  );
  const freshStock = liveFresh?.stock ?? fresh?.stock ?? 0;
  const datedStock = liveDated?.stock ?? dated.reduce((s, a) => s + a.stock, 0);
  const datedFrom = dated.length
    ? Math.min(...dated.filter((a) => a.stock > 0).map((a) => a.pricePerAccount))
    : 0;
  const totalStock = freshStock + datedStock;

  const activeIsFresh = productId === "fresh";
  const activeStock = activeIsFresh ? freshStock : datedStock;
  const activePrice = activeIsFresh
    ? liveFresh
      ? retailPrice(liveFresh.price, "fresh")
      : (fresh?.pricePerAccount ?? 0)
    : liveDated
      ? retailPrice(liveDated.price, "dated")
      : datedFrom;
  const activeName = activeIsFresh ? "Fresh Twitter Accounts" : "Old Dated Twitter Accounts";

  const DISCOUNTS = [
    { qty: 1000, label: "1K", off: 2 },
    { qty: 5000, label: "5K", off: 4 },
    { qty: 10000, label: "10K", off: 6 },
    { qty: 25000, label: "25K", off: 8 },
    { qty: 50000, label: "50K", off: 10 },
  ];
  const discount = DISCOUNTS.reduce((acc, d) => (qty >= d.qty ? d.off : acc), 0);
  const subtotal = activePrice * qty;
  const total = subtotal * (1 - discount / 100);

  const clampQty = (n: number) => Math.max(1, Math.min(activeStock || 1, Math.round(n) || 1));

  const buyNow = () => {
    const ref = activeIsFresh ? fresh : dated.find((a) => a.stock > 0);
    if (!ref) return;
    addToCart({
      key: `aged_${productId}_${Date.now()}`,
      kind: "account",
      refId: ref.id,
      title: activeName,
      subtitle: activeIsFresh ? "Twitter · пустышки" : "Twitter · aged 2007–2026",
      qty,
      unitPrice: activePrice,
      total,
      meta: discount ? { discount: `-${discount}%` } : undefined,
    });
    toast("Добавлено в корзину");
    go("cart");
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <ScreenHeader
        title={title}
        subtitle={`${sorted.length} ${t("items_count")} · ${totalStock} ${t("in_stock")}`}
        onBack={onBack}
      />

      <div className="space-y-4 px-4 pt-4 pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <span>Главная</span>
          <ChevronRight className="size-3" />
          <span>Магазин</span>
          <ChevronRight className="size-3" />
          <span className="text-neutral-300">Twitter Accounts</span>
        </div>

        {/* Hero copy */}
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-tight text-neutral-50">
            Twitter / X аккаунты — проверенные, старые и с моментальной выдачей
          </h1>
          <p className="mt-2.5 text-[12px] leading-relaxed text-neutral-400">
            Каждый аккаунт проверяется на стабильность входа, возраст и состояние профиля до
            публикации. Данные выдаём сразу после оплаты — без ожидания и посредников. На все
            покупки действует 48-часовая гарантия замены.
          </p>
        </div>

        {/* Product hero card */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/70">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black">
                <XLogo className="size-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-bold text-neutral-50">{activeName}</p>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 tabular-nums">
                  <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  {activeStock.toLocaleString("ru-RU")} в наличии
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[22px] font-extrabold leading-none tabular-nums text-neutral-50">
                  {money(activePrice)}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-wide text-neutral-500">
                  за аккаунт
                </p>
              </div>
            </div>

            {/* Feature chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {[
                { icon: ShieldCheck, label: "2FA" },
                { icon: Package, label: "Почта" },
                { icon: Check, label: "Cookies" },
                { icon: Tag, label: "Email + пароль" },
              ].map(({ icon: Ico, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-lg border border-info/25 bg-info/10 px-2 py-1 text-[10px] font-semibold text-info"
                >
                  <Ico className="size-3" />
                  {label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
                <TrendingUp className="size-3" /> −10%
              </span>
            </div>
          </div>

          {/* Product tabs */}
          <div className="flex gap-2 border-t border-white/[0.06] p-3">
            {[
              {
                id: "fresh" as const,
                name: "Fresh Twitter",
                price: fresh?.pricePerAccount ?? 0,
                stock: freshStock,
              },
              { id: "aged" as const, name: "Old Dated", price: datedFrom, stock: datedStock },
            ].map((p) => {
              const on = productId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setProductId(p.id);
                    setQty(1);
                  }}
                  className={`flex flex-1 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                    on
                      ? "border-info/60 bg-info/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  {on && <Check className="size-3.5 shrink-0 text-info" />}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[11px] font-semibold ${on ? "text-info" : "text-neutral-300"}`}
                    >
                      {p.name}
                    </span>
                    <span className="block text-[10px] tabular-nums text-neutral-500">
                      {money(p.price)} · {p.stock.toLocaleString("ru-RU")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mode toggle + discount ladder */}
          <div className="space-y-3 border-t border-white/[0.06] p-3">
            <div className="flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
              {[
                { id: "random" as const, label: "Random Buy", icon: Sparkles },
                { id: "manual" as const, label: "Manual Selection", icon: SlidersHorizontal },
              ].map(({ id, label, icon: Ico }) => {
                const on = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition-colors ${
                      on ? "bg-white/10 text-neutral-50" : "text-neutral-500"
                    }`}
                  >
                    <Ico className="size-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                Больше берёшь — дешевле
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DISCOUNTS.map((d) => {
                  const on = qty >= d.qty;
                  return (
                    <span
                      key={d.label}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-semibold tabular-nums transition-colors ${
                        on
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-white/10 bg-white/[0.03] text-neutral-400"
                      }`}
                    >
                      {d.label} <span className="text-emerald-400">−{d.off}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {mode === "random" ? (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              Сколько аккаунтов?
            </p>
            <div className="mt-3 inline-flex items-center rounded-xl border border-white/10 bg-black/40">
              <button
                onClick={() => setQty((q) => clampQty(q - 1))}
                className="flex size-11 items-center justify-center text-neutral-400 active:text-neutral-100"
              >
                <span className="text-lg leading-none">−</span>
              </button>
              <input
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(clampQty(Number(e.target.value.replace(/\D/g, ""))))}
                className="w-16 bg-transparent text-center text-[15px] font-bold tabular-nums text-neutral-50 outline-none"
              />
              <button
                onClick={() => setQty((q) => clampQty(q + 1))}
                className="flex size-11 items-center justify-center text-neutral-400 active:text-neutral-100"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-400" /> Гарантия 48ч
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="size-3 text-amber-400" /> Выдача сразу после оплаты
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Package className="size-3 text-info" /> {activeStock.toLocaleString("ru-RU")}{" "}
                доступно
              </span>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between text-[12px] text-neutral-400 tabular-nums">
                <span>
                  {qty}x {money(activePrice)}
                </span>
                <span>{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-[12px] font-semibold text-emerald-400 tabular-nums">
                  <span>Скидка</span>
                  <span>−{discount}%</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <span className="text-[13px] font-semibold text-neutral-300">Итого</span>
                <span className="text-[20px] font-extrabold tabular-nums text-neutral-50">
                  {money(total)}
                </span>
              </div>
              <button
                onClick={buyNow}
                disabled={activeStock <= 0}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-info py-3 text-[13px] font-bold text-neutral-950 transition-opacity active:opacity-80 disabled:opacity-40"
              >
                <ShoppingBag className="size-4" />
                Купить сейчас
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeIsFresh ? (
              <div className="rounded-xl border border-info/35 bg-card p-4 text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-info/35 bg-info/10 text-info">
                  <Package className="size-5" />
                </div>
                <p className="mt-3 text-[13px] font-bold text-foreground">Fresh Twitter Accounts</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {freshStock.toLocaleString("en-US")} аккаунтов в live API. Поставщик выдаёт Fresh
                  только случайным пакетом — выбор конкретного аккаунта недоступен.
                </p>
                <button
                  onClick={() => setMode("random")}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-info px-5 text-[11px] font-bold text-neutral-950"
                >
                  Перейти к покупке
                </button>
              </div>
            ) : (
              <SupplierItemsList
                product="old-dated-twitter-accounts"
                refId={dated.find((a) => a.stock > 0)?.id ?? dated[0]?.id ?? "aged"}
                title="Old Dated Twitter Accounts"
              />
            )}
          </div>
        )}

        <AgedReviews />

        <AgedSpecBlock showAbout={showAbout} onToggleAbout={() => setShowAbout((v) => !v)} />

        <AgedInfoCards />

        <AgedServicesCta onServices={() => go("services")} />

        <AgedFaq />
      </div>
    </div>
  );
}

/* ============================================================
   AGED — content blocks (reviews, spec, info, FAQ)
   ============================================================ */

const REVIEWS_LINK = "https://t.me/aurex_reviews";
const SUPPORT_LINK = "https://t.me/aurex_support";

function Stars({ n = 5, className = "size-3" }: { n?: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${className} ${i < n ? "fill-amber-400 text-amber-400" : "text-neutral-700"}`}
        />
      ))}
    </span>
  );
}

const REVIEWS = [
  {
    name: "Verified Customer",
    date: "12 июля 2026",
    stars: 5,
    title: "Хорошие aged-аккаунты, стабильное качество",
    body: "Брал 25 старых аккаунтов — даты регистрации совпали с заявленными, вход прошёл без проблем. Один попросил подтверждение по телефону, поддержка заменила его за 10 минут в рамках гарантии. Сервисом доволен, вернусь ещё.",
  },
  {
    name: "Проверенная покупка",
    date: "4 июля 2026",
    stars: 5,
    title: "Выдача реально моментальная",
    body: "Оплатил в USDT — данные пришли в чат меньше чем через минуту. Формат выдачи удобный, cookies и почта на месте.",
  },
];

function AgedReviews() {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
      <div className="flex items-center gap-2">
        <p className="text-[13px] font-bold text-neutral-50">Отзывы покупателей</p>
        <span className="text-[11px] tabular-nums text-neutral-500">(1 248)</span>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
        <span className="text-[26px] font-extrabold leading-none tabular-nums text-neutral-50">
          4.9
        </span>
        <span>
          <Stars n={5} className="size-3.5" />
          <span className="mt-1 block text-[10px] text-neutral-500">
            На основе 1 248 подтверждённых покупок
          </span>
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {REVIEWS.map((r) => (
          <div key={r.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-100">{r.name}</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">
                  <Check className="size-2.5" /> Подтверждённая покупка
                </span>
              </span>
              <span className="shrink-0 text-[9px] text-neutral-500">{r.date}</span>
            </div>
            <Stars n={r.stars} className="mt-1.5 size-3" />
            <p className="mt-1.5 text-[12px] font-semibold text-neutral-100">{r.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{r.body}</p>
          </div>
        ))}
      </div>

      <a
        href={REVIEWS_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-info/40 bg-info/10 py-2.5 text-[11px] font-bold text-info active:opacity-80"
      >
        Показать ещё 1 200+ отзывов
        <ArrowRight className="size-3.5" />
      </a>
    </div>
  );
}

const DELIVERY_FIELDS = [
  "username",
  "password",
  "hotmail_email",
  "hotmail_pass",
  "phone",
  "ct0",
  "auth_token",
  "twofa",
  "date",
  "followers",
  "follows",
  "posts",
  "blue",
  "creation_country|hotmail_email",
  "hotmail_pass",
  "refresh_token",
  "client_id",
];

const SPEC_CHIPS = [
  { label: "Гарантия 48ч", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  { label: "Моментальная выдача", cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  { label: "Доступ к почте", cls: "border-info/30 bg-info/10 text-info" },
  { label: "2FA", cls: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
];

const TOOL_LINKS = [
  { label: "TwoFAUrl", href: "https://t.me/aurex_2fa_bot" },
  { label: "MailAccessUrl", href: "https://t.me/aurex_mail_bot" },
];

function AgedSpecBlock({
  showAbout,
  onToggleAbout,
}: {
  showAbout: boolean;
  onToggleAbout: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/70">
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Twitter старые аккаунты
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-neutral-300">
          Проверенные старые аккаунты Twitter (X) 2007–2020 годов. Устойчивы к shadowban, защита 2FA.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SPEC_CHIPS.map((c) => (
            <span
              key={c.label}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${c.cls}`}
            >
              {c.label}
            </span>
          ))}
        </div>

        {/* Delivery format */}
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-50">
            <FileText className="size-3.5 text-info" />
            Формат выдачи
          </p>
          <p className="mt-1 text-[10px] text-neutral-500">
            Каждый аккаунт приходит в этом порядке полей:
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {DELIVERY_FIELDS.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1 font-mono text-[9px] text-neutral-300"
              >
                <span className="text-[7px] text-neutral-600">{i + 1}</span>
                {f}
              </span>
            ))}
          </div>
          <p className="mt-2 break-all rounded-lg border border-white/10 bg-black/60 p-2.5 font-mono text-[9px] leading-relaxed text-info">
            {DELIVERY_FIELDS.join(":")}
          </p>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
          {TOOL_LINKS.map((l, i) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-2 bg-white/[0.03] px-3 py-2.5 ${i ? "border-t border-white/[0.06]" : ""}`}
            >
              <span className="text-[11px] text-neutral-400">{l.label}</span>
              <span className="truncate text-[10px] font-bold text-info">{l.href}</span>
            </a>
          ))}
        </div>
      </div>

      <button
        onClick={onToggleAbout}
        className="flex w-full items-center justify-between border-t border-white/[0.06] p-4 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
          О продукте
        </span>
        <ChevronUp
          className={`size-4 text-neutral-500 transition-transform ${showAbout ? "" : "rotate-180"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {showAbout && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 text-[11px] leading-relaxed text-neutral-400">
              <p>
                Старые аккаунты Twitter (X) 2007–2020: устойчивы к шэдоубану, с 2FA и доступом к
                оригинальной почте. Свежие — чистые пустышки с почтой и cookie ct0.
              </p>
              <p>
                Меняй пароль в первые 5 минут после выдачи, привязывай свою почту и заново подключай
                2FA. Первые сутки заходи через прокси страны регистрации аккаунта.
              </p>
              <p>Если аккаунт не заходит в течение 48 часов после покупки — меняем бесплатно.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const INFO_CARDS = [
  {
    title: "Почему аккаунты Twitter / X берут у AureX",
    body: "Наш маркетплейс работает на трёх принципах: проверенный источник, моментальная выдача и 48-часовая гарантия. Каждый аккаунт проходит автопроверку до публикации — доступность юзернейма, стабильность входа, возраст и, где применимо, количество подписчиков. Оплата проходит в криптовалюте, поэтому вы не передаёте карточные или банковские данные. Если аккаунт не заходит в течение 48 часов после покупки — меняем бесплатно.",
  },
  {
    title: "Что входит в каждый аккаунт",
    body: "Полные доступы: логин, пароль и, где доступно, привязанная почта восстановления. Листинги с телефоном включают исходный номер, коды 2FA и cookies (ct0 / auth_token), чтобы пропустить проверку при первом входе. Дата создания, страна, число подписчиков и заполненность профиля видны прямо в таблице наличия — фильтры помогут отобрать точную спецификацию.",
  },
  {
    title: "Как безопасно пользоваться аккаунтом после выдачи",
    body: "Смените пароль в первые пять минут и привяжите свою почту восстановления. Если поддерживается 2FA — переподключите её на своё устройство. Первые 24 часа заходите с резидентного или мобильного прокси страны регистрации, чтобы не поднять флаг смены гео. Избегайте массовых действий (фолловинг, рассылки в ЛС) первую неделю. Для нескольких аккаунтов используйте антидетект-браузер.",
  },
  {
    title: "Кто у нас покупает",
    body: "Агентства, ведущие соцсети клиентов, e-commerce команды с мультибрендовыми кампаниями, авторы, тестирующие A/B в разных нишах, разработчики социнтеграций и исследователи площадок. От объёма 10+ включаются скидки автоматически — лестница указана выше. Под крупные объёмы и спецификации пишите в поддержку.",
  },
  {
    title: "Ценность аккаунтов X изменилась после 2023 года",
    body: "После ребрендинга в X и смены API-политики рынок расслоился. Аккаунты с синей галочкой получают буст охвата в «Для вас» — примерно в 3–5 раз больше показов на одинаковом контенте. Aged-аккаунты (до 2020) сохраняют ценность, потому что их не задела волна снятия верификации 2023–2024, и у них есть исторические сигналы доверия. Новые (после 2023) быстрее упираются в лимиты. Фильтруйте по году создания, чтобы выбрать нужный тир.",
  },
  {
    title: "Чего избегать, чтобы не поймать антиспам",
    body: "Антиспам X работает на трёх уровнях: отпечаток аккаунта (энтропия юзернейма, заполненность профиля, ранние посты), поведение (соотношение ответов к постам, фолловеров к подпискам, частота твитов) и контент (повторы фраз, доля ссылок, плотность хэштегов). Первый уровень закрывает покупка у нас — история и профиль уже в порядке. Второй и третий на вас: не более 50 подписок в первые сутки, ответы к постам не чаще 1:3 в первую неделю, не постите строго по часам.",
  },
];

function AgedInfoCards() {
  return (
    <div className="space-y-2.5">
      {INFO_CARDS.map((c) => (
        <div key={c.title} className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
          <p className="text-[13px] font-bold leading-snug text-neutral-50">{c.title}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">{c.body}</p>
        </div>
      ))}
    </div>
  );
}

function AgedServicesCta({ onServices }: { onServices: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-neutral-50">Хотите раскрутить свой Twitter / X?</p>
        <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
          Наши услуги — подписчики, лайки, просмотры и не только.
        </p>
      </div>
      <button
        onClick={onServices}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-info px-3 py-2.5 text-[11px] font-bold text-neutral-950 active:opacity-80"
      >
        Услуги
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "Аккаунты Twitter / X подтверждены по телефону?",
    a: "Часть листингов — да. В таблице наличия есть бейдж Phone: если он стоит, аккаунт проходил телефонную верификацию и вы получаете исходный номер. Такие аккаунты стабильнее при входе с нового IP. Аккаунты без бейджа Phone дешевле, но могут попросить подтверждение — используйте прокси страны регистрации.",
  },
  {
    q: "Можно ли использовать aged-аккаунты для рекламных кампаний?",
    a: "Да, aged-аккаунты подходят для рекламного кабинета лучше свежих, но прогрев обязателен: 7–14 дней обычной активности, заполненный профиль, привязка своей почты и 2FA. Оплату в кабинет добавляйте не раньше, чем через неделю после покупки.",
  },
  {
    q: "Есть ли почта восстановления?",
    a: "У большинства позиций — да, бейдж Mail в таблице. Вы получаете адрес и пароль от почты (обычно Hotmail/Outlook), доступ читается через наш mail-инструмент. Обязательно смените пароль почты сразу после выдачи.",
  },
  {
    q: "Что сделать сразу после получения аккаунта?",
    a: "1) Сменить пароль X. 2) Сменить пароль почты. 3) Привязать свою резервную почту. 4) Переподключить 2FA на своё устройство. 5) Зайти через прокси страны регистрации. Первые сутки — никаких массовых действий.",
  },
  {
    q: "Как купить аккаунт?",
    a: "Выберите товар, режим Random Buy (случайные) или Manual Selection (выбор конкретных из наличия), укажите количество и добавьте в корзину. После оплаты данные приходят автоматически в раздел «История» и в чат — обычно за несколько секунд.",
  },
  {
    q: "Безопасно ли покупать у вас?",
    a: "Каждый аккаунт проходит автопроверку входа перед выдачей, покупки закрыты 48-часовой гарантией замены, а оплата идёт напрямую в крипте — вы не оставляете платёжных данных. Все спорные ситуации решает поддержка 24/7.",
  },
  {
    q: "Какие способы оплаты принимаете?",
    a: "Криптовалюта: USDT (TRC-20/ERC-20), BTC, XRP, DOGE, POL, USDC и Monero. Баланс пополняется в разделе «Пополнить», средства зачисляются автоматически после подтверждений сети.",
  },
  {
    q: "Что делать, если с аккаунтом проблема?",
    a: "Напишите в поддержку в течение 48 часов после покупки и приложите ID заказа. Если аккаунт не заходит или заблокирован на момент выдачи — меняем бесплатно, при отсутствии замены возвращаем сумму на баланс.",
  },
];

function AgedFaq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2.5">
      <p className="text-[16px] font-extrabold tracking-tight text-neutral-50">
        Частые вопросы о покупке аккаунтов
      </p>
      {FAQ_ITEMS.map((item, i) => {
        const on = open === i;
        return (
          <div
            key={item.q}
            className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900/70"
          >
            <button
              onClick={() => setOpen(on ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
            >
              <span className="text-[12px] font-semibold leading-snug text-neutral-100">
                {item.q}
              </span>
              <ChevronUp
                className={`size-4 shrink-0 text-neutral-500 transition-transform ${on ? "" : "rotate-180"}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-3.5 pb-3.5 text-[11px] leading-relaxed text-neutral-400">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <a
        href={SUPPORT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[11px] font-bold text-neutral-300 active:opacity-80"
      >
        Не нашли ответ? Поддержка 24/7
        <ArrowRight className="size-3.5" />
      </a>
    </div>
  );
}

/* ============================================================
   AGED CARD — supplier-style product row
   ============================================================ */

function AgedCard({
  account,
  index,
  onOpen,
}: {
  account: AgedAccount;
  index: number;
  onOpen: () => void;
}) {
  const isFresh = account.yearRange === "FRESH";
  const soldOut = account.stock <= 0;
  const low = !soldOut && account.stock <= 25;
  const dotCls = soldOut
    ? "bg-neutral-600"
    : low
      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]";
  const stockCls = soldOut ? "text-neutral-500" : low ? "text-amber-400" : "text-emerald-400";

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.025, 0.35),
        type: "spring",
        stiffness: 320,
        damping: 22,
      }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      disabled={soldOut}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/70 p-3.5 text-left outline-none transition-colors hover:border-info/50 disabled:opacity-50"
    >
      <div className="pointer-events-none absolute inset-0 bg-info/[0.04] opacity-0 transition-opacity group-hover:opacity-100" />

      {/* X mark tile — like the supplier product avatar */}
      <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black">
        <XLogo className="size-5 text-white" />
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-bold text-neutral-100">
            {isFresh ? "Fresh Twitter Accounts" : `Old Dated · ${account.year}`}
          </span>
          <span className={`size-1.5 shrink-0 rounded-full ${dotCls}`} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-[11px] font-semibold tabular-nums ${stockCls}`}>
            {soldOut ? "Нет в наличии" : `${account.stock.toLocaleString("ru-RU")} в наличии`}
          </span>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
            {isFresh ? "Пустышки" : "Aged"}
          </span>
        </div>
      </div>

      <div className="relative shrink-0 text-right">
        <p className="text-[15px] font-bold tabular-nums text-neutral-100">
          {money(account.pricePerAccount)}
        </p>
        <p className="text-[9px] text-neutral-500">за аккаунт</p>
      </div>
      <ChevronRight className="relative size-4 shrink-0 text-neutral-600 transition-colors group-hover:text-info" />
    </motion.button>
  );
}

/* ============================================================
   DETAIL — Cyberpunk high-tech luxury
   ============================================================ */

function AccountDetail({ account, onBack }: { account: AgedAccount; onBack: () => void }) {
  const { t, lang } = useI18n();
  const { isAdmin } = useAuth();
  useNav();
  const [formatOpen, setFormatOpen] = useState(false);
  const [nextStepOpen, setNextStepOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [descOverride, setDescOverride] = useState<string | null>(null);

  const descriptionText = (
    descOverride ??
    (account.description?.[lang as "ru" | "en"] ||
      account.description?.ru ||
      account.description?.en ||
      "")
  ).trim();

  const canEditDescription =
    isAdmin && (account.category === "followers_acc" || account.category === "smart_acc");
  const hasDescription =
    (!!account.descriptionEnabled && descriptionText.length > 0) || canEditDescription;

  const saveDescription = async (next: string) => {
    const value = next.trim();
    await updateFollowerAccount(account.id, {
      description_ru: value,
      description_en: value,
      description_enabled: value.length > 0,
    });
    setDescOverride(value);
  };

  const fallbackHandle = slugifyHandle(
    account.name[lang as "ru" | "en"] ?? account.name.en ?? "account",
  );
  const accountLink = normalizeXAccountUrl(account.accountUrl, fallbackHandle);
  const credHandle = accountLink.handle;
  const detailYear = account.year ?? parseAccountYear(account);
  const detailTopicId = getAccountTopics(account)[0];
  const detailTopic = detailTopicId ? TOPICS[detailTopicId] : null;
  const detailTitle =
    account.category === "followers_acc" || account.category === "smart_acc"
      ? `${detailTopic?.label[lang as "ru" | "en"] ?? account.name[lang]} · ${fmtM(accountReach(account))}`
      : account.name[lang];
  const headerMeta =
    account.category === "aged"
      ? `${detailYear ?? account.yearRange} · Aged аккаунт`
      : `${detailYear ?? "2020"} · В наличии`;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/85 px-5 py-4 backdrop-blur-md">
        <button
          onClick={onBack}
          className="-ml-2 flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary/60 active:bg-secondary"
          aria-label="Назад"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <h1 className="text-[13px] font-semibold uppercase tracking-widest text-foreground">
            {detailTitle}
          </h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {headerMeta}
          </p>
        </div>
        <div className="w-9" />
      </header>

      <main className="flex-1 px-6 pt-8 pb-28">
        <AccountLiveBanner account={account} lang={lang} />

        {/* Profile link — Ultra-Luxury Glass Obsidian X button */}
        {(() => {
          return (
            <a
              href={accountLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative mb-4 block w-full"
            >
              {/* animated gold border glow */}
              <span
                aria-hidden
                className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/50 via-primary/25 to-primary/50 blur-sm opacity-50 transition-opacity duration-1000 group-hover:opacity-100"
              />

              {/* main button body */}
              <span className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-black/60 p-4 backdrop-blur-2xl shadow-2xl sheen-hover active:scale-[0.99] transition-transform">
                {/* glass logo container */}
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent">
                  <span className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <XLogo className="relative size-5 text-foreground transition-colors duration-300 group-hover:text-primary" />
                </span>

                {/* text info */}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                    Ссылка на аккаунт
                  </span>
                  <span className="mt-0.5 truncate font-mono text-[15px] font-semibold tracking-tight text-foreground">
                    {accountLink.label}
                  </span>
                </span>

                {/* external arrow */}
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground/80 opacity-70 transition-all group-hover:bg-primary/20 group-hover:text-primary group-hover:opacity-100">
                  <ExternalLink
                    className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </span>
              </span>
            </a>
          );
        })()}

        {/* Delivery format — premium credential card */}
        <div className="group relative">
          {/* animated gold border glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/40 via-primary/15 to-primary/40 blur-sm opacity-40 transition-opacity duration-1000 group-hover:opacity-90"
          />

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black/60 backdrop-blur-2xl shadow-2xl">
            <button
              type="button"
              onClick={() => setFormatOpen((v) => !v)}
              aria-expanded={formatOpen}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${formatOpen ? "border-b border-white/5" : ""}`}
            >
              <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-white/10 to-transparent">
                <FileText className="size-4 text-primary" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                  Формат выдачи
                </span>
                <span className="mt-0.5 text-[13px] font-medium text-foreground">
                  Что вы получите после оплаты
                </span>
              </div>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${formatOpen ? "rotate-180" : ""}`}
              />
            </button>

            {formatOpen && (
              <>
                {/* Credential rows */}
                <ul className="divide-y divide-white/5">
                  {[
                    { icon: XLogo, label: "Логин от X", value: credHandle, mono: true },
                    { icon: KeyRound, label: "Пароль от X", value: "••••••••••", mono: true },
                    {
                      icon: Mail,
                      label: "Почта (входит в комплект)",
                      value: "mail@gmail.com",
                      mono: true,
                      badge: "пример",
                    },
                    { icon: KeyRound, label: "Пароль от почты", value: "••••••••••", mono: true },
                    { icon: Cookie, label: "", value: "AUTH_TOKEN (COOKIE)", mono: true },
                  ].map((row, i) => {
                    const Icon = row.icon as React.ComponentType<{ className?: string }>;
                    return (
                      <li key={i} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent">
                          <Icon className="size-4 text-foreground/90" />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {row.label}
                          </span>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span
                              className={`min-w-0 truncate text-[13px] font-medium text-foreground/95 ${row.mono ? "font-mono tracking-tight" : ""}`}
                            >
                              {row.value}
                            </span>
                            {row.badge && (
                              <span className="shrink-0 rounded border border-orange-500/40 bg-orange-500/10 px-1 py-[2px] text-[8px] font-semibold uppercase tracking-wider text-orange-400 leading-none">
                                {row.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer notes */}
                <div className="space-y-3 border-t border-white/5 bg-white/[0.02] px-4 py-3.5">
                  {/* Disabled protections */}
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                      <ShieldOff className="size-3 text-destructive" />
                    </span>
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      Все дополнительные способы защиты{" "}
                      <span className="font-semibold text-foreground/90">отключены</span> (2FA,
                      номер телефона, почта для восстановления, Passkey..)
                    </p>
                  </div>

                  {/* Email binding */}
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                      <BadgeCheck className="size-3 text-green-500" />
                    </span>
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      Мы можем{" "}
                      <span className="font-semibold text-primary">привязать вашу почту</span> к
                      данному аккаунту.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Optional admin-written description — pill trigger */}
        {hasDescription && (
          <motion.button
            type="button"
            onClick={() => setDescOpen(true)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/25 py-2 text-[11px] font-medium text-muted-foreground/80 transition-colors hover:bg-secondary/40 active:bg-secondary/50"
          >
            <Info className="size-3.5" />
            <span>
              {descriptionText.length === 0
                ? lang === "ru"
                  ? "Добавить описание"
                  : "Add description"
                : lang === "ru"
                  ? "Описание"
                  : "Description"}
            </span>
          </motion.button>
        )}
      </main>

      <AccountDescriptionSheet
        open={descOpen}
        onClose={() => setDescOpen(false)}
        title={account.name[lang] || account.name.ru}
        handle={credHandle}
        text={descriptionText}
        lang={lang}
        canEdit={canEditDescription}
        onSave={canEditDescription ? saveDescription : undefined}
      />

      <NextStepSheet
        open={nextStepOpen}
        onClose={() => setNextStepOpen(false)}
        handle={credHandle}
        copied={copied}
        onCopy={() => {
          navigator.clipboard?.writeText("@aurex_agency").catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      />

      {/* Sticky Footer */}
      <footer className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-30 mx-auto w-[min(480px,100%)] px-5 py-4">
        <motion.button
          type="button"
          onClick={() => setNextStepOpen(true)}
          whileTap={{ scale: 0.97 }}
          className="group relative block w-full"
        >
          {/* Button body */}
          <span className="relative flex h-[68px] items-center justify-between overflow-hidden rounded-[25px] bg-[linear-gradient(180deg,#141210_0%,#0a0908_100%)] pl-5 pr-3">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,231,154,0.10)_0%,transparent_100%)]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[25px] shadow-[inset_0_0_0_1px_rgba(255,231,154,0.08)]"
            />

            {/* Left: text */}
            <span className="relative flex flex-col items-start text-left">
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/70">
                Инструкция
              </span>
              <span className="mt-1 font-display text-[17px] font-semibold tracking-tight text-foreground">
                Как оформить покупку
              </span>
            </span>

            {/* Right: gold pill */}
            <span className="relative flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(140deg,#F7E7A6_0%,#D6A93A_55%,#8B6416_100%)] pl-4 pr-3.5 text-[#1a1408] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.35),0_6px_18px_-6px_rgba(212,175,55,0.7)] transition-transform group-hover:scale-[1.03] group-active:scale-[0.98]">
              <span className="font-display text-[13px] font-bold tracking-tight">Открыть</span>
              <span className="flex size-6 items-center justify-center rounded-full bg-[#1a1408]/90 text-primary transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-1.5">
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={3}
                />
              </span>
            </span>

            {/* Shimmer sweep */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
              animate={{ x: ["0%", "450%"] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
            />
          </span>
        </motion.button>
      </footer>
    </div>
  );
}

function DisclosureRow({
  icon: Icon,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            open
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/60 bg-secondary/50 text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-16 pr-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────── Next-step sheet ───────────────────────────

import laughAvatar from "@/assets/guarantors/laugh.jpg";
import coldAvatar from "@/assets/guarantors/cold.jpg";
import beamAvatar from "@/assets/guarantors/beam.jpg";
import fameAvatar from "@/assets/guarantors/fame.jpg";
import faiqAvatar from "@/assets/guarantors/faiq.jpg";

const GUARANTORS: { handle: string; color: string; avatar: string }[] = [
  { handle: "laugh", color: "from-amber-500/40 to-orange-500/20", avatar: laughAvatar },
  { handle: "cold", color: "from-sky-500/40 to-blue-500/20", avatar: coldAvatar },
  { handle: "beam", color: "from-fuchsia-500/40 to-purple-500/20", avatar: beamAvatar },
  { handle: "fame", color: "from-emerald-500/40 to-teal-500/20", avatar: fameAvatar },
  { handle: "faiq", color: "from-rose-500/40 to-pink-500/20", avatar: faiqAvatar },
];

function NextStepSheet({
  open,
  onClose,
  handle,
  copied,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  handle: string;
  copied: boolean;
  onCopy: () => void;
}) {
  useScrollLock(open);
  const SELLER = "aurex_agency";
  const tgUrl = `https://t.me/${SELLER}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="relative w-full max-w-[480px] max-h-[92vh] overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#0b0b0e] via-[#0a0a0d] to-black shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.9)]"
          >
            {/* Ambient glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
              style={{
                background:
                  "radial-gradient(80% 100% at 50% 0%, hsl(var(--primary) / 0.25), transparent 60%)",
              }}
            />

            {/* Grabber + close */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-b from-[#0b0b0e] via-[#0b0b0e]/95 to-transparent px-5 pb-3 pt-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-white/15" />
              <button
                onClick={onClose}
                aria-label="Закрыть"
                className="absolute right-4 top-3 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative px-5 pb-10 pt-2">
              {/* Hero */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 text-center"
              >
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
                  <span className="size-1.5 rounded-full bg-primary animate-live" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    Инструкция
                  </span>
                </div>
                <h2 className="font-display text-[26px] font-black leading-tight tracking-tight text-foreground">
                  Как купить этот
                  <br />
                  <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    аккаунт
                  </span>
                </h2>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Покупка проходит напрямую у продавца
                </p>
              </motion.div>

              {/* Step 1 — Contact seller */}
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.4 }}
                className="mb-5"
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
                    1
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Свяжитесь с продавцом
                  </span>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-xl">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/20 blur-3xl"
                  />
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Чтобы купить аккаунт{" "}
                    <span className="font-mono font-semibold text-primary">@{handle}</span>,
                    обратитесь напрямую к продавцу в Telegram:
                  </p>

                  {/* Telegram button */}
                  <a
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative mt-4 flex items-center gap-3 overflow-hidden rounded-xl border border-[#229ED9]/40 bg-gradient-to-br from-[#229ED9]/25 via-[#229ED9]/10 to-transparent p-3.5 transition-transform active:scale-[0.98]"
                  >
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["0%", "400%"] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 1.5,
                      }}
                    />
                    <motion.span
                      className="relative flex size-11 shrink-0 items-center justify-center rounded-full shadow-[0_10px_24px_-6px_#229ED9]"
                      whileHover={{ rotate: [0, -6, 6, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg
                        viewBox="0 0 240 240"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-full"
                      >
                        <defs>
                          <linearGradient
                            id="tg-grad-btn"
                            x1="120"
                            y1="240"
                            x2="120"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset="0" stopColor="#1d93d2" />
                            <stop offset="1" stopColor="#38b0e3" />
                          </linearGradient>
                        </defs>
                        <circle cx="120" cy="120" r="120" fill="url(#tg-grad-btn)" />
                        <path
                          d="M81.229,128.772l14.237,39.406s1.78,3.687,3.686,3.687,30.255-29.492,30.255-29.492l31.525-60.89L81.737,118.6Z"
                          fill="#c8daea"
                        />
                        <path
                          d="M100.106,138.878l-2.733,29.046s-1.144,8.9,7.754,0,17.415-15.763,17.415-15.763"
                          fill="#a9c6d8"
                        />
                        <path
                          d="M81.486,130.178,52.2,120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229,2.1-2.2,6.489-4.523,120.106-45.36,120.106-45.36s3.208-1.081,5.1-.362a2.766,2.766,0,0,1,1.885,2.055,9.357,9.357,0,0,1,.254,2.585c-.009.752-.1,1.449-.169,2.542-.692,11.165-21.4,94.493-21.4,94.493s-1.239,4.876-5.678,5.043A8.13,8.13,0,0,1,146.1,172.5c-8.711-7.493-38.819-27.727-45.472-32.177a1.27,1.27,0,0,1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6,53.821-51.492c.108-.379-.3-.566-.848-.4-3.482,1.281-63.844,39.4-70.506,43.607A3.21,3.21,0,0,1,81.486,130.178Z"
                          fill="#fff"
                        />
                      </svg>
                    </motion.span>
                    <div className="relative flex min-w-0 flex-1 flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4fb3e6]">
                        Telegram
                      </span>
                      <span className="mt-0.5 truncate font-mono text-[15px] font-bold text-foreground">
                        @{SELLER}
                      </span>
                    </div>
                    <span className="relative flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCopy();
                        }}
                        className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                        aria-label="Скопировать"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {copied ? (
                            <motion.span
                              key="ok"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                            >
                              <BadgeCheck className="size-4 text-green-500" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                            >
                              <Copy className="size-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </span>
                  </a>
                </div>
              </motion.section>

              {/* Step 2 — Guarantors */}
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.4 }}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
                    2
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Работа с гарантами
                  </span>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-black/60 p-5 backdrop-blur-xl">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-emerald-500/15 blur-3xl"
                  />

                  <div className="mb-4 flex items-center gap-3">
                    <motion.span
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      animate={{ rotate: [0, -8, 8, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Handshake className="size-6" strokeWidth={2} />
                    </motion.span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                        Да, работаем
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
                        Сделка через любого проверенного гаранта из списка ниже
                      </p>
                    </div>
                  </div>

                  {/* Guarantors grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {GUARANTORS.map((g, i) => (
                      <motion.a
                        key={g.handle}
                        href={`https://t.me/${g.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.05, duration: 0.35 }}
                        whileTap={{ scale: 0.94 }}
                        className="group flex flex-col items-center gap-1.5"
                      >
                        <span
                          className={`relative flex size-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br ${g.color} shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`}
                        >
                          <img
                            src={g.avatar}
                            alt={`@${g.handle}`}
                            loading="lazy"
                            className="absolute inset-0 size-full object-cover"
                          />
                          <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 transition-colors group-hover:ring-primary/50" />
                        </span>
                        <span className="truncate max-w-full font-mono text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">
                          @{g.handle}
                        </span>
                      </motion.a>
                    ))}
                  </div>

                  {/* Footnote */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <p className="text-[11.5px] leading-snug text-muted-foreground">
                      Гарант удерживает средства до подтверждения передачи аккаунта. Комиссию
                      гаранта уточняйте у него лично.
                    </p>
                  </div>
                </div>
              </motion.section>

              {/* CTA */}
              <motion.a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-[13px] font-black uppercase tracking-[0.18em] text-primary-foreground shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.7)]"
              >
                Написать продавцу
                <ArrowRight className="size-4" strokeWidth={2.6} />
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SmartFollowersBlock({
  list,
  count,
}: {
  list: { label: string; avatar_url?: string | null }[];
  count: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPlaceholderLabel = (label: string) => /^Smart follower \d+$/i.test(label.trim());
  const items = list.filter(
    (item) => (item.label.trim() && !isPlaceholderLabel(item.label)) || item.avatar_url,
  );
  const total = count || items.length;
  if (total === 0) return null;
  const visible = expanded ? items : items.slice(0, 7);

  return (
    <section className="border-t border-white/10 bg-black px-4 py-3" aria-label="Smart Followers">
      <div className="flex w-full items-center gap-2 whitespace-nowrap">
        <span className="text-[13px] leading-4 text-[#71767b]">
          <span className="font-bold text-white tabular-nums">{total}</span> Smart Followers
        </span>
        {items.length > 0 && (
          <ChevronDown
            className="size-[14px] shrink-0 text-[#71767b]"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        {items.length > 7 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 rounded-full border border-[#536471] px-2.5 py-0.5 text-[12px] leading-4 text-white transition-opacity active:opacity-70"
          >
            {expanded ? "Less" : "More"}
          </button>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[13px] leading-4 text-[#71767b]">
          Powered by <span className="font-bold text-white">@frontrunpro</span>
          <img src={frontrunproLogo} alt="frontrunpro" className="size-[14px] object-contain" />
        </span>
      </div>

      {items.length > 0 && (
        <>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-2">
            {visible.map((sf, i) => (
              <span key={`${sf.label}-${i}`} className="smart-follower-pill">
                <span className="smart-follower-avatar">
                  {sf.avatar_url ? (
                    <img
                      src={sf.avatar_url}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    (sf.label || "?").slice(0, 1).toUpperCase()
                  )}
                </span>
                {sf.label.trim() && !isPlaceholderLabel(sf.label) && (
                  <span className="smart-follower-label">{sf.label}</span>
                )}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
