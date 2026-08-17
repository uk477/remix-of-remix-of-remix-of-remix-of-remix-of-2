"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Cookie,
  ExternalLink,
  Filter,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  
  Search,
  ShoppingBag,
  SlidersHorizontal,
  SquarePen,
  UserRound,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { spProductItems, spProductCounts } from "@/lib/socialplatforms.functions";
import { countryCode, flagEmoji } from "@/lib/countries";
import { retailPrice } from "@/lib/supplier-twitter";
import { usePricing } from "@/lib/pricing";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/toast";
import { useNav } from "@/lib/nav";
import { XLogo } from "@/components/x-logo";
import { VerifiedBadge } from "@/components/icons/verified-badge";
import { Button } from "@/components/ui/button";

const API_PAGE = 100;
const INITIAL_PAGES = 1;
const BATCH_PAGES = 24;
const COMPLETION_RETRIES = 2;
const ROW_HEIGHT = 62;
const ROW_HEIGHT_COMPACT = 138;
const CACHE_TTL = 30 * 60 * 1000;

type CacheEntry = { items: Item[]; total: number; complete: boolean; at: number };
const stockCache = new Map<string, CacheEntry>();

function readCache(product: string): CacheEntry | undefined {
  const hit = stockCache.get(product);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return { ...hit, complete: hit.complete && hit.items.length >= hit.total };
  }
  try {
    const raw = sessionStorage.getItem(`sp_stock_${product}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.items?.length || Date.now() - parsed.at > CACHE_TTL) return undefined;
    const safe = {
      ...parsed,
      complete: parsed.complete && parsed.items.length >= parsed.total,
    };
    stockCache.set(product, safe);
    return safe;
  } catch {
    return undefined;
  }
}

function writeCache(product: string, entry: CacheEntry) {
  stockCache.set(product, entry);
  try {
    const raw = JSON.stringify(entry);
    if (raw.length < 3_500_000) sessionStorage.setItem(`sp_stock_${product}`, raw);
  } catch {
    /* quota exceeded — memory cache still works */
  }
}
const VIEWPORT_HEIGHT = 540;
const OVERSCAN = 8;

type Attr = Record<string, string | number | boolean | null>;
type Item = { id: string; price: number; attributes: Attr };
type Feature = "twofa" | "phone" | "mail" | "cookies" | "blue";
type Metric = "followers" | "follows" | "posts";
type Filters = {
  query: string;
  features: Feature[];
  years: string[];
  followerBand: string;
  country: string;
};

const EMPTY_FILTERS: Filters = {
  query: "",
  features: [],
  years: [],
  followerBand: "",
  country: "",
};

const FEATURES = [
  { id: "twofa" as const, label: "2FA", icon: KeyRound },
  { id: "phone" as const, label: "Phone", icon: Phone },
  { id: "mail" as const, label: "Mail", icon: Mail },
  { id: "cookies" as const, label: "Cookies", icon: Cookie },
  { id: "blue" as const, label: "Blue", icon: BadgeCheck },
];

const YEARS: string[] = Array.from({ length: 20 }, (_, index) => String(2026 - index));
const RECENT_YEARS = YEARS.slice(0, 8);
const OLDER_YEARS = YEARS.slice(8);

/** Canonical filter keys used by the supplier shop itself. */
const FEATURE_KEYS: Record<Feature, string[]> = {
  twofa: ["has_twofa"],
  phone: ["has_phone"],
  mail: ["has_email"],
  cookies: ["has_cookie"],
  blue: ["blue"],
};

function buildRangeFilters(filters: Filters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (filters.years.length > 0) {
    const years = filters.years.map(Number).filter(Number.isFinite);
    if (years.length > 0) {
      out["year_min"] = Math.min(...years);
      out["year_max"] = Math.max(...years);
    }
  }
  if (filters.country) out["creation_country"] = filters.country;
  const band = BANDS.find(({ id }) => id === filters.followerBand);
  if (band) {
    out["followers_min"] = band.min;
    out["followers_max"] = Math.max(band.min, band.max - 1);
  }
  return out;
}

/** One or more supplier queries whose union is the user's selection. */
function buildApiVariants(filters: Filters): Array<Record<string, unknown>> {
  const base = buildRangeFilters(filters);
  let variants: Array<Record<string, unknown>> = [base];
  filters.features.forEach((feature) => {
    const keys = FEATURE_KEYS[feature] ?? [];
    variants = variants.flatMap((variant) =>
      keys.map((key) => ({ ...variant, [key]: true })),
    );
  });
  return variants;
}
const BANDS = [
  { id: "0-30", label: "0 - 30", min: 0, max: 30, count: 14511, width: "w-[86%]" },
  { id: "30-100", label: "30 - 100", min: 30, max: 100, count: 12, width: "w-[16%]" },
  { id: "100-250", label: "100 - 250", min: 100, max: 250, count: 88, width: "w-[36%]" },
  { id: "250-1000", label: "250 - 1K", min: 250, max: 1000, count: 3, width: "w-[8%]" },
];

function attrStr(attributes: Attr, ...keys: string[]) {
  for (const key of keys) {
    const value = attributes[key];
    if (value != null && String(value).length > 0) return String(value);
  }
  return "";
}

function attrNum(attributes: Attr, ...keys: string[]) {
  const value = Number(attrStr(attributes, ...keys));
  return Number.isFinite(value) ? value : 0;
}

function attrBool(attributes: Attr, ...keys: string[]) {
  const value = attrStr(attributes, ...keys).toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

/**
 * The supplier ships two stock batches with different attribute shapes:
 *  - batch A exposes `has_ct0` / `has_hotmail_email` explicitly;
 *  - batch B omits mail/cookie keys entirely, yet the supplier's own
 *    `has_mail` and `has_cookie` filters both return exactly that batch.
 * So "no mail/cookie keys at all" means mail + cookies are included.
 */
function isImplicitMailCookieBatch(attributes: Attr) {
  const explicit = [
    'has_ct0',
    'has_auth_token',
    'has_cookie',
    'has_cookies',
    'cookies',
    'ct0',
    'has_hotmail_email',
    'has_email',
    'has_mail',
    'email',
    'hotmail_email',
  ]
  return explicit.every((key) => attributes[key] == null)
}

function hasFeature(attributes: Attr, feature: Feature) {
  if (feature === "twofa")
    return attrBool(attributes, "has_twofa", "has_2fa", "has_totp", "twofa");
  if (feature === "phone")
    return attrBool(attributes, "has_phone", "phone_verified", "phone");
  if (feature === "mail")
    return (
      attrBool(
        attributes,
        "has_email",
        "has_mail",
        "email_verified",
        "has_hotmail_email",
        "mail",
        "email_included",
      ) ||
      Boolean(attrStr(attributes, "email", "hotmail_email")) ||
      isImplicitMailCookieBatch(attributes)
    );
  if (feature === "cookies")
    return (
      attrBool(attributes, "has_cookie", "has_ct0", "has_auth_token", "has_cookies", "cookies") ||
      Boolean(attrStr(attributes, "ct0", "auth_token")) ||
      isImplicitMailCookieBatch(attributes)
    );
  return attrBool(attributes, "blue", "is_blue_verified");
}

/** Real flag image (matches the reference table), emoji fallback. */
function Flag({ country, className = "" }: { country: string; className?: string }) {
  const code = countryCode(country);
  const [failed, setFailed] = useState(false);
  if (!code)
    return (
      <span
        className={`flex h-3.5 w-[22px] shrink-0 items-center justify-center rounded-[3px] border border-border bg-secondary text-[8px] font-bold uppercase tracking-tight text-muted-foreground ${className}`}
        aria-label={country}
      >
        {country.slice(0, 2).toUpperCase() || "??"}
      </span>
    );
  if (failed)
    return (
      <span
        className={`flex h-3.5 w-[22px] shrink-0 items-center justify-center rounded-[3px] bg-secondary text-[11px] leading-none ${className}`}
        aria-label={country}
        title={country}
      >
        {flagEmoji(code)}
      </span>
    );
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt={country}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-3.5 w-[22px] shrink-0 rounded-[3px] object-cover ring-1 ring-white/10 ${className}`}
    />
  );
}

function FilterSection({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Filter;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-info/30 bg-background/80 p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-3.5 text-foreground" />
        <div>
          <h3 className="text-[12px] font-bold leading-none text-foreground">{title}</h3>
          <p className="mt-1 text-[9px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AccessBadges({ attributes, tight = false }: { attributes: Attr; tight?: boolean }) {
  const entries = [
    ["twofa", "2FA", "border-destructive/60 bg-destructive/20 text-destructive"],
    ["mail", "Mail", "border-smart-violet/60 bg-smart-violet/20 text-smart-violet"],
    ["phone", "Phone", "border-info/60 bg-info/20 text-info"],
    ["cookies", "Cookies", "border-warning/60 bg-warning/20 text-warning"],
  ] as const;
  const active = entries.filter(([feature]) => hasFeature(attributes, feature));
  if (active.length === 0)
    return <span className="text-[9px] font-semibold text-muted-foreground">—</span>;
  return (
    <div className={`flex flex-wrap gap-1 ${tight ? "justify-end" : ""}`}>
      {active.map(([feature, label, color]) => (
          <span
            key={feature}
            className={`rounded-md border font-bold leading-none ${tight ? "px-1.5 py-1 text-[9px]" : "px-2 py-1 text-[10px]"} ${color}`}
          >
            {label}
          </span>
        ))}
    </div>
  );
}

function FiltersPanel({
  draft,
  setDraft,
  apply,
  clear,
  close,
  countries,
  featureCounts,
  yearCounts,
  countsLoading,
}: {
  draft: Filters;
  setDraft: React.Dispatch<React.SetStateAction<Filters>>;
  apply: () => void;
  clear: () => void;
  close?: () => void;
  countries: Array<[string, number]>;
  featureCounts: Record<string, number | undefined>;
  yearCounts: Record<string, number | undefined>;
  countsLoading: boolean;
}) {
  const [olderOpen, setOlderOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState<Metric | null>("followers");
  const toggleFeature = (feature: Feature) =>
    setDraft((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  const toggleYear = (year: string) =>
    setDraft((current) => ({
      ...current,
      years: current.years.includes(year)
        ? current.years.filter((item) => item !== year)
        : [...current.years, year],
    }));

  return (
    <div className="supplier-scrollbar flex h-full flex-col overflow-y-auto bg-card">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-info/25 bg-card/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-info/60 bg-info/10 text-info shadow-[0_0_24px_-10px_color-mix(in_oklab,var(--info)_90%,transparent)]">
            <SlidersHorizontal className="size-5" />
          </span>
          <div>
            <p className="text-[14px] font-extrabold text-foreground">FILTERS</p>
            <p className="text-[10px] text-muted-foreground">Find matching accounts</p>
          </div>
        </div>
        {close && (
          <Button variant="ghost" size="icon" aria-label="Close filters" onClick={close}>
            <X />
          </Button>
        )}
      </div>

      <div className="space-y-3 p-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-info/30 bg-background px-3 text-muted-foreground focus-within:border-info">
          <Search className="size-4" />
          <input
            value={draft.query}
            onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
            placeholder="Search or paste usernames"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <FilterSection icon={Filter} title="Quick Filters" subtitle="Account features">
          <div className="grid grid-cols-3 gap-1.5">
            {FEATURES.map(({ id, label, icon: Icon }) => {
              const active = draft.features.includes(id);
              const count = featureCounts[id];
              return (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  onClick={() => toggleFeature(id)}
                  className={`h-12 flex-col gap-0.5 px-1 text-[9px] ${active ? "border-info bg-info/15 text-info" : "bg-secondary"}`}
                >
                  <Icon className="size-3.5" />
                  {label}
                  <span className="text-[8px] font-normal text-muted-foreground">
                    {count == null ? (countsLoading ? "…" : "") : count.toLocaleString()}
                  </span>
                </Button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection icon={CalendarDays} title="Date" subtitle="Account created year">
          <div className="grid grid-cols-4 gap-1.5">
            {RECENT_YEARS.map((year) => {
              const stock = yearCounts[year];
              const active = draft.years.includes(year);
              return (
                <Button
                  key={year}
                  type="button"
                  variant="outline"
                  disabled={stock === 0 && !active}
                  onClick={() => toggleYear(year)}
                  className={`h-11 flex-col gap-0 px-1 text-[9px] ${active ? "border-info bg-info/15 text-info" : "bg-secondary"} ${stock === 0 && !active ? "opacity-40" : ""}`}
                >
                  <strong>{year}</strong>
                  <span className="text-[8px] font-normal text-muted-foreground">
                    {stock == null ? (countsLoading ? "…" : "") : stock.toLocaleString()}
                  </span>
                </Button>
              );
            })}
          </div>
          {olderOpen && (
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {OLDER_YEARS.map((year) => {
                const stock = yearCounts[year];
                const active = draft.years.includes(year);
                return (
                  <Button
                    key={year}
                    type="button"
                    variant="outline"
                    disabled={stock === 0 && !active}
                    onClick={() => toggleYear(year)}
                    className={`h-11 flex-col gap-0 px-1 text-[9px] ${active ? "border-info bg-info/15 text-info" : "bg-secondary"} ${stock === 0 && !active ? "opacity-40" : ""}`}
                  >
                    <strong>{year}</strong>
                    <span className="text-[8px] font-normal text-muted-foreground">
                      {stock == null ? (countsLoading ? "…" : "") : stock.toLocaleString()}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOlderOpen((value) => !value)}
            className="mt-1 w-full text-[9px] text-info"
          >
            {olderOpen ? "Hide older years" : "Show older years"}{" "}
            <ChevronDown className={`transition-transform ${olderOpen ? "rotate-180" : ""}`} />
          </Button>
        </FilterSection>

        <FilterSection icon={BarChart3} title="Metrics" subtitle="Account statistics">
          <div className="space-y-1.5">
            {(["followers", "follows", "posts"] as Metric[]).map((metric) => (
              <div
                key={metric}
                className={`overflow-hidden rounded-lg border ${metricOpen === metric ? "border-info" : "border-border"}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMetricOpen((value) => (value === metric ? null : metric))}
                  className={`h-9 w-full justify-between rounded-none px-3 text-[10px] capitalize ${metricOpen === metric ? "bg-info/10 text-foreground" : "bg-secondary"}`}
                >
                  <span className="flex items-center gap-2">
                    {metric === "followers" && <UserRound className="text-info" />}
                    {metric}
                  </span>
                  <ChevronDown
                    className={`transition-transform ${metricOpen === metric ? "rotate-180 text-info" : ""}`}
                  />
                </Button>
                {metric === "followers" && metricOpen === metric && (
                  <div className="space-y-1 bg-info/10 p-2">
                    {BANDS.map((band) => (
                      <Button
                        key={band.id}
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            followerBand: current.followerBand === band.id ? "" : band.id,
                          }))
                        }
                        className={`h-8 w-full justify-start gap-2 px-2 text-[9px] ${draft.followerBand === band.id ? "bg-info/20 text-info" : "bg-info/5 text-foreground"}`}
                      >
                        <span className="w-14 text-left">{band.label}</span>
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-background">
                          <span
                            className={`block h-full rounded-full bg-gradient-to-r from-info to-smart-pink ${band.width}`}
                          />
                        </span>
                        <span className="w-9 text-right text-muted-foreground">
                          {band.count.toLocaleString()}
                        </span>
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-[9px] text-info"
                    >
                      Show all
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </FilterSection>

        <FilterSection icon={MapPin} title="Country" subtitle="Account based in">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary px-2.5">
            <Search className="size-3 text-muted-foreground" />
            <select
              value={draft.country}
              onChange={(event) =>
                setDraft((current) => ({ ...current, country: event.target.value }))
              }
              className="min-w-0 flex-1 bg-transparent text-[9px] text-foreground outline-none"
            >
              <option value="">Search country...</option>
              {countries.map(([country, count]) => (
                <option key={country} value={country}>
                  {country} · {count}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {countries.slice(0, 8).map(([country, count]) => (
              <Button
                key={country}
                type="button"
                variant="ghost"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    country: current.country === country ? "" : country,
                  }))
                }
                className={`h-9 justify-start gap-2 px-2 text-[8px] ${draft.country === country ? "bg-info/15 text-info" : "bg-secondary"}`}
              >
                <Flag country={country} />
                <span className="min-w-0 truncate text-left">
                  <strong className="block">{count.toLocaleString()}</strong>
                  {country}
                </span>
              </Button>
            ))}
          </div>
        </FilterSection>
      </div>

      <div className="sticky bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-info/25 bg-card/95 p-3 backdrop-blur">
        <Button variant="secondary" onClick={clear}>
          Clear all
        </Button>
        <Button
          onClick={() => {
            apply();
            close?.();
          }}
          className="bg-gradient-to-r from-info to-smart-pink text-primary-foreground"
        >
          <SlidersHorizontal />
          Apply filters
        </Button>
      </div>
    </div>
  );
}

export function SupplierItemsList({
  product,
  refId,
  title,
}: {
  product: string;
  refId: string;
  title: string;
}) {
  const load = useServerFn(spProductItems);
  const countsFn = useServerFn(spProductCounts);
  const { addToCart } = useStore();
  const { version: pricingVersion } = usePricing();
  void pricingVersion;
  const priceKind = product.includes("fresh") ? ("fresh" as const) : ("dated" as const);
  const { show: toast } = useToast();
  const { go } = useNav();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const runRef = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  /** Live stock freshness: manual refresh + auto refresh while the tab is open. */
  const [refreshTick, setRefreshTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  
  const bypassRef = useRef(false);
  const refresh = useCallback(() => {
    bypassRef.current = true;
    setRefreshTick((tick) => tick + 1);
  }, []);

  const apiVariants = useMemo(() => buildApiVariants(filters), [filters]);
  const filterKey = JSON.stringify(apiVariants);
  const [countries, setCountries] = useState<Array<[string, number]>>([]);
  const [featureCounts, setFeatureCounts] = useState<Record<string, number | undefined>>({});
  const [yearCounts, setYearCounts] = useState<Record<string, number | undefined>>({});
  const [countsLoading, setCountsLoading] = useState(false);

  /** Live availability per filter option, straight from the supplier (honest counts). */
  const draftKey = JSON.stringify({
    features: [...draft.features].sort(),
    years: [...draft.years].sort(),
    country: draft.country,
    band: draft.followerBand,
  });
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const base = JSON.parse(draftKey) as {
        features: Feature[];
        years: string[];
        country: string;
        band: string;
      };
      const withDraft = (patch: Partial<Filters>): Filters => ({
        ...EMPTY_FILTERS,
        features: base.features,
        years: base.years,
        country: base.country,
        followerBand: base.band,
        ...patch,
      });
      setCountsLoading(true);
      void (async () => {
        const ask = async (
          queries: Array<{ id: string; variants: Array<Record<string, unknown>> }>,
        ) => {
          try {
            const res = await countsFn({ data: { product, queries } });
            return res.counts;
          } catch {
            return {} as Record<string, number | null>;
          }
        };
        const featureQueries = FEATURES.map(({ id }) => ({
          id,
          variants: buildApiVariants(
            withDraft({
              features: base.features.includes(id)
                ? base.features
                : ([...base.features, id] as Feature[]),
            }),
          ),
        }));
        const yearQueries = YEARS.map((year) => ({
          id: year,
          variants: buildApiVariants(withDraft({ years: [year] })),
        }));
        const [featureCountsRes, yearsA, yearsB] = await Promise.all([
          ask(featureQueries),
          ask(yearQueries.slice(0, 10)),
          ask(yearQueries.slice(10)),
        ]);
        if (cancelled) return;
        const clean = (raw: Record<string, number | null>) =>
          Object.fromEntries(
            Object.entries(raw).map(([key, value]) => [key, value ?? undefined]),
          ) as Record<string, number | undefined>;
        setFeatureCounts(clean(featureCountsRes));
        setYearCounts({ ...clean(yearsA), ...clean(yearsB) });
        setCountsLoading(false);
      })();
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [countsFn, draftKey, product]);

  useEffect(() => {
    const token = ++runRef.current;
    const seen = new Set<string>();
    let collected: Item[] = [];
    const isRefresh = bypassRef.current;
    const previousItems = isRefresh ? itemsRef.current : [];
    bypassRef.current = false;
    if (!isRefresh) {
      setItems([]);
      setPicked([]);
      setTotal(0);
    }
    setError(null);

    const activeVariants = JSON.parse(filterKey) as Array<Record<string, unknown>>;
    const filtered =
      activeVariants.length > 1 || Object.keys(activeVariants[0] ?? {}).length > 0;
    const cacheKey = filtered ? `${product}::${filterKey}` : product;
    const cached = isRefresh ? undefined : readCache(cacheKey);
    if (cached) {
      setItems(cached.items);
      setTotal(cached.total);
      setLoading(false);
      setSyncing(false);
      setUpdatedAt(cached.at);
      if (cached.complete) return;
      cached.items.forEach(({ id }) => seen.add(id));
      collected = cached.items;
    }

    setLoading(!isRefresh);
    setSyncing(true);

    const fetchPages = async (pages: number[]) => {
      const results = await Promise.all(
        pages.map((page) =>
          load({
            data: {
              product,
              page,
              limit: API_PAGE,
              fresh: true,
              ...(filtered ? { variants: activeVariants } : {}),
            },
          }),
        ),
      );
      const fresh = results
        .flatMap((result) => result.items)
        .filter((item) => !seen.has(item.id) && (seen.add(item.id), true));
      collected = [...collected, ...fresh];
      return results;
    };

    void (async () => {
      try {
        const first = await fetchPages(
          Array.from({ length: INITIAL_PAGES }, (_, index) => index + 1),
        );
        if (runRef.current !== token) return;
        const totalCount = first[0]?.totalCount ?? collected.length;
        const totalPages = Math.max(
          first[0]?.pagination?.totalPages ?? 0,
          Math.ceil(totalCount / API_PAGE),
        );
        setTotal(totalCount);
        if (!isRefresh) setItems(collected);
        setLoading(false);
        setUpdatedAt(Date.now());
        if (!isRefresh) {
          writeCache(cacheKey, {
            items: collected,
            total: totalCount,
            complete: collected.length >= totalCount,
            at: Date.now(),
          });
        }

        for (let page = INITIAL_PAGES + 1; page <= totalPages; page += BATCH_PAGES) {
          if (runRef.current !== token) return;
          const batch = Array.from(
            { length: Math.min(BATCH_PAGES, totalPages - page + 1) },
            (_, index) => page + index,
          );
          await fetchPages(batch);
          if (runRef.current !== token) return;
          if (!isRefresh) setItems(collected);
        }
        // The supplier list can move while pages are being read. A sale near
        // the beginning shifts later pages and creates duplicate IDs, leaving
        // holes after de-duplication. Re-read the snapshot until those holes
        // are filled instead of caching a partial list as complete.
        for (
          let retry = 0;
          retry < COMPLETION_RETRIES && collected.length < totalCount;
          retry += 1
        ) {
          for (let page = 1; page <= totalPages; page += BATCH_PAGES) {
            if (runRef.current !== token) return;
            if (collected.length >= totalCount) break;
            const batch = Array.from(
              { length: Math.min(BATCH_PAGES, totalPages - page + 1) },
              (_, index) => page + index,
            );
            await fetchPages(batch);
            if (runRef.current !== token) return;
            if (!isRefresh) setItems(collected);
          }
        }
        if (runRef.current === token) {
          const complete = collected.length >= totalCount;
          if (complete) {
            setItems(collected.slice(0, totalCount));
            setPicked((current) => current.filter((id) => seen.has(id)));
            writeCache(cacheKey, {
              items: collected.slice(0, totalCount),
              total: totalCount,
              complete: true,
              at: Date.now(),
            });
          } else {
            if (isRefresh && previousItems.length > collected.length) {
              setItems(previousItems);
              setTotal(previousItems.length);
            }
            setError(
              `Не удалось получить цельный снимок склада: проверено ${collected.length.toLocaleString("en-US")} из ${totalCount.toLocaleString("en-US")}. Полный ранее загруженный список сохранён.`,
            );
          }
        }
      } catch (cause) {
        console.error("[supplier-items]", cause);
        if (runRef.current === token) setError("Не удалось загрузить склад поставщика");
      } finally {
        if (runRef.current === token) {
          setLoading(false);
          setSyncing(false);
          setUpdatedAt(Date.now());
        }
      }
    })();

    return () => {
      runRef.current++;
    };
  }, [filterKey, load, product, refreshTick]);

  /** Auto-refresh: supplier stock moves (sold / restocked) while the page is open. */
  useEffect(() => {
    const AUTO_MS = 3 * 60 * 1000;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (updatedAt && Date.now() - updatedAt < AUTO_MS) return;
      refresh();
    };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, updatedAt]);


  const loadedCountries = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(({ attributes }) => {
      const country = attrStr(attributes, "creation_country", "country");
      if (country) counts.set(country, (counts.get(country) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  /** Keep the country list from unfiltered stock so options never disappear. */
  useEffect(() => {
    if (filterKey === "[{}]" && loadedCountries.length > 0) setCountries(loadedCountries);
  }, [filterKey, loadedCountries]);

  const filteredItems = useMemo(
    () =>
      items.filter(({ attributes }) => {
        const username = attrStr(attributes, "username", "login").toLowerCase();
        const year = attrStr(attributes, "date", "created_at").slice(0, 4);
        if (filters.query && !username.includes(filters.query.toLowerCase().replace(/^@/, "")))
          return false;
        // Years come back as a min..max range from the API — keep only the picked ones.
        if (filters.years.length > 0 && !filters.years.includes(year)) return false;
        return true;
      }),
    [filters, items],
  );

  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const pickedItems = useMemo(() => items.filter(({ id }) => pickedSet.has(id)), [items, pickedSet]);
  const sum = pickedItems.reduce((amount, item) => amount + retailPrice(item.price, priceKind), 0);
  const togglePicked = useCallback(
    (id: string) =>
      setPicked((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      ),
    [],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 699px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef(0);
  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setScrollTop(viewportRef.current?.scrollTop ?? 0);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [filters, product]);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(
    filteredItems.length,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / rowHeight) + OVERSCAN,
  );
  const visibleItems = filteredItems.slice(start, end);
  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const buy = () => {
    if (pickedItems.length === 0) return;
    addToCart({
      key: `sp_${product}_${Date.now()}`,
      kind: "account",
      refId,
      title,
      subtitle: `Manual Selection · ${pickedItems.length} pcs`,
      qty: pickedItems.length,
      unitPrice: Math.round((sum / pickedItems.length) * 100) / 100,
      total: sum,
      meta: {
        items: pickedItems
          .map(({ attributes }) => attrStr(attributes, "username", "login"))
          .join(", ")
          .slice(0, 400),
      },
    });
    toast("Добавлено в корзину");
    go("cart");
  };

  return (
    <div className="space-y-3">
      <div className="hidden items-start gap-3 min-[700px]:flex">
        <aside className="sticky top-3 h-[calc(100dvh-1.5rem)] w-[280px] shrink-0 overflow-hidden rounded-xl border border-info/45 shadow-[0_0_36px_-24px_color-mix(in_oklab,var(--smart-pink)_80%,transparent)]">
          <FiltersPanel
            draft={draft}
            setDraft={setDraft}
            apply={() => setFilters(draft)}
            clear={clearFilters}
            countries={countries}
            featureCounts={featureCounts}
            yearCounts={yearCounts}
            countsLoading={countsLoading}
          />
        </aside>
      </div>

      <Button
        variant="outline"
        onClick={() => setFiltersOpen(true)}
        className="rounded-full border-info/40 bg-card px-5 text-foreground shadow-[0_0_28px_-18px_color-mix(in_oklab,var(--info)_80%,transparent)] min-[700px]:hidden"
      >
        <Filter />
        FILTERS
        {Object.values(filters).some((value) =>
          Array.isArray(value) ? value.length > 0 : Boolean(value),
        ) && <span className="size-2 rounded-full bg-smart-pink" />}
      </Button>

      {filtersOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm min-[700px]:hidden"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="absolute inset-y-0 right-0 w-[min(92vw,360px)] border-l border-info/45 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <FiltersPanel
              draft={draft}
              setDraft={setDraft}
              apply={() => setFilters(draft)}
              clear={clearFilters}
              close={() => setFiltersOpen(false)}
              countries={countries}
              featureCounts={featureCounts}
              yearCounts={yearCounts}
              countsLoading={countsLoading}
            />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-info/40 bg-background shadow-[0_0_36px_-28px_color-mix(in_oklab,var(--info)_80%,transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-info/25 bg-info/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
            <span className="font-semibold">
              {filters.years.length > 0 ? "Matching" : "All stock"}{" "}
              <strong className="text-success">
                {(filters.years.length > 0 ? filteredItems.length : total).toLocaleString("en-US")}
              </strong>{" "}
              Accounts
            </span>
          </div>
          <span className="rounded-md border border-border bg-secondary px-2 py-1.5 text-[9px] text-muted-foreground">
            Loaded <strong className="text-foreground">{items.length}</strong> /{" "}
            {total.toLocaleString("en-US")}
          </span>
        </div>

        {error && (
          <div className="m-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[10px] text-destructive">
            {error}
          </div>
        )}
        <div
          ref={viewportRef}
          onScroll={onScroll}
          className="supplier-scrollbar overflow-auto overscroll-contain"
          style={{ height: VIEWPORT_HEIGHT, contain: "strict" }}
        >
          <div className={compact ? "w-full" : "min-w-[860px]"}>
            {!compact && (
            <div className="sticky top-0 z-10 grid grid-cols-[26px_minmax(0,1.5fr)_78px_138px_minmax(0,1.2fr)_40px_112px_54px] items-center gap-2 border-b border-info/20 bg-card px-2 py-2 text-[8px] font-bold uppercase text-muted-foreground">
              <span />
              <span>Account</span>
              <span>Date / year</span>
              <span>Stats</span>
              <span>Country</span>
              <span>Blue</span>
              <span>Access</span>
              <span className="text-right">Price</span>
            </div>
            )}
            <div style={{ height: filteredItems.length * rowHeight }} className="relative">
              <div
                className="absolute inset-x-0 top-0 divide-y divide-border/70"
                style={{ transform: `translateY(${start * rowHeight}px)` }}
              >
                {visibleItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    selected={pickedSet.has(item.id)}
                    priceKind={priceKind}
                    compact={compact}
                    onToggle={togglePicked}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-5 text-[10px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-info" />
            Loading live stock… {items.length > 0 && `${items.length} loaded`}
          </div>
        )}
        {!loading && syncing && items.length < total && (
          <div className="flex items-center justify-center gap-2 border-t border-border py-3 text-[10px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-info" />
            Синхронизация склада… {items.length.toLocaleString("en-US")} /{" "}
            {total.toLocaleString("en-US")}
          </div>
        )}
        {!loading && filteredItems.length === 0 && !error && (
          <div className="px-4 py-10 text-center text-[11px] text-muted-foreground">
            По выбранным фильтрам на складе поставщика нет аккаунтов.
          </div>
        )}
      </div>

      {picked.length > 0 && (
        <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-xl border border-info/45 bg-card/95 p-3 shadow-2xl backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-muted-foreground">Selected {picked.length}</p>
            <p className="text-[17px] font-extrabold tabular-nums">{money(sum)}</p>
          </div>
          <Button onClick={buy}>
            <ShoppingBag />
            Add to cart
          </Button>
        </div>
      )}
    </div>
  );
}

function ProfileNameLink({
  username,
  className = "text-[12px]",
  iconClassName = "size-3",
  children,
}: {
  username: string;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={`https://x.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={`Открыть @${username} в X`}
      className={`group/profile flex min-w-0 items-center gap-1 font-bold tracking-tight text-foreground transition-colors hover:text-sky-400 ${className}`}
    >
      <span className="truncate group-hover/profile:text-sky-400">{username}</span>
      {children}
      <ExternalLink
        className={`${iconClassName} shrink-0 text-muted-foreground transition-colors group-hover/profile:text-sky-400`}
      />
    </a>
  );
}

const ItemRow = memo(function ItemRow({
  item,
  selected,
  priceKind,
  compact,
  onToggle,
}: {
  item: Item;
  selected: boolean;
  priceKind: "fresh" | "dated";
  compact: boolean;
  onToggle: (id: string) => void;
}) {
  const a = item.attributes;
  const date = attrStr(a, "date", "created_at");
  const year = date.slice(0, 4) || "—";
  const username = attrStr(a, "username", "login") || item.id.slice(0, 12);
  const country = attrStr(a, "creation_country", "country") || "Unknown";
  const blue = hasFeature(a, "blue");
  const stats = [
    [attrNum(a, "followers"), "Followers", "Подписчики", "text-smart-pink", Users] as const,
    [attrNum(a, "follows", "following"), "Following", "Подписки", "text-info", UserPlus] as const,
    [attrNum(a, "posts", "tweets"), "Posts", "Посты", "text-warning", SquarePen] as const,
  ] as const;

  const rowProps = {
    role: "button" as const,
    tabIndex: 0,
    onClick: () => onToggle(item.id),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle(item.id);
      }
    },
  };

  if (compact) {
    return (
      <div
        {...rowProps}
        className={`flex h-[138px] w-full cursor-pointer flex-col justify-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-info/5 ${selected ? "bg-info/10" : ""}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${selected ? "border-info bg-info text-primary-foreground" : "border-border-strong bg-secondary"}`}
          >
            {selected && <Check className="size-3" />}
          </span>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground/10">
            <XLogo className="size-3 text-foreground" />
          </span>
          <ProfileNameLink username={username} className="min-w-0 flex-1 text-[13px]" iconClassName="size-3">
            {blue && <VerifiedBadge className="size-3.5 shrink-0 text-info" />}
          </ProfileNameLink>
          <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-success">
            {money(retailPrice(item.price, priceKind))}
          </span>
        </div>

        <div className="flex items-center gap-2 pl-[30px] text-[10px] text-muted-foreground">
          <strong className="rounded bg-smart-violet/15 px-1.5 py-0.5 text-[10px] font-bold text-smart-violet">
            {year}
          </strong>
          <span className="truncate">{date}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <Flag country={country} />
            <span className="max-w-[96px] truncate text-[10px] font-medium text-foreground">
              {country}
            </span>
          </span>
        </div>

        <div className="flex items-end justify-between gap-2 pl-[30px]">
          <div className="flex items-end gap-3">
            {stats.map(([value, label, ru, color, Icon]) => (
              <span key={label} className="flex min-w-[52px] flex-col items-start gap-0.5">
                <span className="flex items-center gap-1">
                  <Icon className={`size-3 ${color}`} />
                  <strong className="text-[11px] font-bold tabular-nums text-foreground">
                    {value.toLocaleString("en-US")}
                  </strong>
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {ru}
                </span>
              </span>
            ))}
          </div>
          <div className="ml-auto flex max-w-[130px] flex-wrap justify-end gap-1">
            <AccessBadges attributes={a} tight />
            {blue && (
              <span className="rounded-md border border-info/60 bg-info/20 px-1.5 py-1 text-[9px] font-bold leading-none text-info">
                Blue
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...rowProps}
      className={`grid h-[62px] w-full cursor-pointer grid-cols-[26px_minmax(0,1.5fr)_78px_150px_minmax(0,1.2fr)_44px_120px_66px] items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-info/5 ${selected ? "bg-info/10" : ""}`}
    >
      <span
        className={`flex size-4 items-center justify-center rounded-[5px] border ${selected ? "border-info bg-info text-primary-foreground" : "border-border-strong bg-secondary"}`}
      >
        {selected && <Check className="size-3" />}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/10">
          <XLogo className="size-3.5 text-foreground" />
        </span>
        <span className="min-w-0">
          <ProfileNameLink username={username} className="text-[12px]">
            {blue && <VerifiedBadge className="size-3 shrink-0 text-info" />}
          </ProfileNameLink>
          <span className="block truncate text-[9px] font-normal text-muted-foreground">
            Old Dated Twitter Accounts
          </span>
        </span>
      </span>
      <span>
        <strong className="block text-[12px] font-bold text-smart-violet">{year}</strong>
        <span className="block text-[9px] font-normal text-muted-foreground">{date}</span>
      </span>
      <span className="grid grid-cols-3 gap-1">
        {stats.map(([value, label, , color, Icon]) => (
          <span key={label}>
            <strong className="flex items-center gap-1 text-[12px] font-bold tabular-nums text-foreground">
              <Icon className={`size-3 ${color}`} />
              {value.toLocaleString("en-US")}
            </strong>
            <span className="block text-[9px] font-normal text-muted-foreground">{label}</span>
          </span>
        ))}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
        <Flag country={country} />
        <span className="truncate">{country}</span>
      </span>
      <span className="text-[10px] font-semibold text-muted-foreground">
        {blue ? (
          <VerifiedBadge className="size-4 text-info" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
      <AccessBadges attributes={a} />
      <span className="text-right text-[13px] font-extrabold tabular-nums text-success">
        {money(retailPrice(item.price, priceKind))}
      </span>
    </div>
  );
});
