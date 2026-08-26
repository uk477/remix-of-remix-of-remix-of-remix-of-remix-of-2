-- Baseline schema snapshot (public schema) — generated for repository completeness.

-- Reference only: the live database already has this schema applied.


-- ===== ENUMS =====

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.order_status AS ENUM ('pending', 'in_progress', 'waiting', 'completed', 'declined', 'refunded', 'failed', 'refilling');
CREATE TYPE public.supplier_status AS ENUM ('new', 'reviewing', 'approved', 'declined');
CREATE TYPE public.topup_status AS ENUM ('pending', 'success', 'declined', 'expired');


-- ===== TABLES =====

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta numeric NOT NULL,
  balance_after numeric NOT NULL,
  kind text NOT NULL,
  reason text,
  ref_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT balance_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT balance_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT balance_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT balance_transactions_kind_check CHECK ((kind = ANY (ARRAY['topup'::text, 'purchase'::text, 'admin_credit'::text, 'admin_debit'::text, 'admin_set'::text, 'refund'::text, 'bonus'::text, 'promo'::text, 'referral'::text])))
);
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.boost_notify_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subcategory_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  region text NOT NULL DEFAULT '_all'::text,
  CONSTRAINT boost_notify_subscriptions_user_subcat_region_key UNIQUE (user_id, subcategory_id, region),
  CONSTRAINT boost_notify_subscriptions_pkey PRIMARY KEY (id)
);
ALTER TABLE public.boost_notify_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.boost_service_status (
  subcategory_id text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  api_ping_url text,
  ping_method text NOT NULL DEFAULT 'GET'::text,
  ping_expect_status integer NOT NULL DEFAULT 200,
  manual_override text,
  last_checked_at timestamp with time zone,
  last_error text,
  down_since timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  region text NOT NULL DEFAULT '_all'::text,
  CONSTRAINT boost_service_status_pkey PRIMARY KEY (subcategory_id, region),
  CONSTRAINT boost_service_status_manual_override_check CHECK ((manual_override = ANY (ARRAY['force_up'::text, 'force_down'::text])))
);
ALTER TABLE public.boost_service_status ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.boost_status_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subcategory_id text NOT NULL,
  region text NOT NULL DEFAULT '_all'::text,
  event text NOT NULL,
  source text NOT NULL DEFAULT 'auto'::text,
  error text,
  notified_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boost_status_events_pkey PRIMARY KEY (id),
  CONSTRAINT boost_status_events_event_check CHECK ((event = ANY (ARRAY['up'::text, 'down'::text])))
);
ALTER TABLE public.boost_status_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  buttons jsonb,
  audience jsonb NOT NULL DEFAULT '{"kind": "all"}'::jsonb,
  status text NOT NULL DEFAULT 'draft'::text,
  stats jsonb NOT NULL DEFAULT '{"total": 0, "failed": 0, "delivered": 0}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'inapp'::text,
  CONSTRAINT broadcast_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT broadcast_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT broadcast_campaigns_channel_check CHECK ((channel = ANY (ARRAY['inapp'::text, 'telegram'::text]))),
  CONSTRAINT broadcast_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.broadcast_reads (
  broadcast_id uuid NOT NULL,
  user_id uuid NOT NULL,
  seen_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_reads_pkey PRIMARY KEY (broadcast_id, user_id),
  CONSTRAINT broadcast_reads_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT broadcast_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.broadcast_reads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  title_zh text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_key UNIQUE (slug),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.follower_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text,
  name_ru text NOT NULL,
  name_en text NOT NULL,
  description_ru text NOT NULL DEFAULT ''::text,
  description_en text NOT NULL DEFAULT ''::text,
  year_range text NOT NULL DEFAULT '2020'::text,
  price_per_account numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  followers integer NOT NULL DEFAULT 0,
  verification text NOT NULL DEFAULT 'none'::text,
  badge_ru text,
  badge_en text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  topic_id text,
  topic_ids text[] NOT NULL DEFAULT '{}'::text[],
  account_url text,
  category text NOT NULL DEFAULT 'followers_acc'::text,
  smart_followers integer,
  smart_followers_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  x_synced_at timestamp with time zone,
  x_sync_error text,
  description_enabled boolean NOT NULL DEFAULT false,
  CONSTRAINT follower_accounts_slug_key UNIQUE (slug),
  CONSTRAINT follower_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT follower_accounts_verification_check CHECK ((verification = ANY (ARRAY['none'::text, 'blue'::text, 'gold'::text, 'gray'::text])))
);
ALTER TABLE public.follower_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.maintenance_notify_subscriptions (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_notify_subscriptions_pkey PRIMARY KEY (user_id),
  CONSTRAINT maintenance_notify_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.maintenance_notify_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.maintenance_state (
  singleton boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  message_ru text NOT NULL DEFAULT 'Ведутся технические работы. Скоро вернёмся.'::text,
  message_en text NOT NULL DEFAULT 'Maintenance in progress. We''ll be back soon.'::text,
  eta timestamp with time zone,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_state_pkey PRIMARY KEY (singleton),
  CONSTRAINT maintenance_state_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT maintenance_state_singleton_chk CHECK ((singleton = true))
);
ALTER TABLE public.maintenance_state ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.maintenance_targets (
  user_id uuid NOT NULL,
  note text,
  added_by uuid,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_targets_pkey PRIMARY KEY (user_id),
  CONSTRAINT maintenance_targets_added_by_fkey FOREIGN KEY (added_by) REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.maintenance_targets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.maintenance_whitelist (
  user_id uuid NOT NULL,
  note text,
  added_by uuid,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_whitelist_pkey PRIMARY KEY (user_id),
  CONSTRAINT maintenance_whitelist_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.maintenance_whitelist ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_refills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_key text NOT NULL,
  client_token text NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  order_id uuid,
  provider_order_id text,
  status text NOT NULL DEFAULT 'requested'::text,
  completed_at timestamp with time zone,
  source text NOT NULL DEFAULT 'customer'::text,
  admin_id uuid,
  prev_status text,
  refill_number integer,
  CONSTRAINT order_refills_user_id_order_key_client_token_key UNIQUE (user_id, order_key, client_token),
  CONSTRAINT order_refills_pkey PRIMARY KEY (id),
  CONSTRAINT order_refills_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_refills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.order_refills ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'completed'::text,
  reason text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_refunds_order_id_key UNIQUE (order_id),
  CONSTRAINT order_refunds_pkey PRIMARY KEY (id),
  CONSTRAINT order_refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT order_refunds_source_check CHECK ((source = ANY (ARRAY['admin'::text, 'automatic_error'::text]))),
  CONSTRAINT order_refunds_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])))
);
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid,
  title text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  amount_usd numeric(12,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending'::order_status,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pricing_settings (
  singleton boolean NOT NULL DEFAULT true,
  fresh_markup numeric NOT NULL DEFAULT 2.5,
  dated_markup numeric NOT NULL DEFAULT 2.0,
  min_price numeric NOT NULL DEFAULT 0.15,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT pricing_settings_pkey PRIMARY KEY (singleton),
  CONSTRAINT pricing_settings_dated_markup_check CHECK ((dated_markup > (0)::numeric)),
  CONSTRAINT pricing_settings_fresh_markup_check CHECK ((fresh_markup > (0)::numeric)),
  CONSTRAINT pricing_settings_min_price_check CHECK ((min_price >= (0)::numeric)),
  CONSTRAINT pricing_settings_singleton_check CHECK (singleton)
);
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  slug text,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  title_zh text NOT NULL,
  description_ru text,
  description_en text,
  description_zh text,
  price_usd numeric(12,2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_slug_key UNIQUE (slug),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  telegram_id text,
  username text,
  display_name text,
  language text NOT NULL DEFAULT 'ru'::text,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  telegram_username text,
  avatar_url text,
  blocked boolean NOT NULL DEFAULT false,
  last_seen_at timestamp with time zone,
  CONSTRAINT profiles_telegram_id_key UNIQUE (telegram_id),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.promo_codes (
  code text NOT NULL,
  bonus_usd numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_pkey PRIMARY KEY (code),
  CONSTRAINT promo_codes_bonus_usd_check CHECK ((bonus_usd > (0)::numeric))
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  bonus_usd numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT promo_redemptions_user_id_code_key UNIQUE (user_id, code),
  CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT promo_redemptions_code_fkey FOREIGN KEY (code) REFERENCES promo_codes(code) ON DELETE CASCADE
);
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.supplier_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  service_name text NOT NULL,
  description text NOT NULL,
  price text,
  negotiable boolean NOT NULL DEFAULT false,
  telegram text NOT NULL,
  agreed_guarantor boolean NOT NULL DEFAULT false,
  status supplier_status NOT NULL DEFAULT 'new'::supplier_status,
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  CONSTRAINT supplier_applications_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  sender uuid NOT NULL,
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  attachments jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES support_threads(id) ON DELETE CASCADE
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'open'::text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  unread_admin integer NOT NULL DEFAULT 0,
  unread_user integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_threads_pkey PRIMARY KEY (id),
  CONSTRAINT support_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT support_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'closed'::text])))
);
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.topups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coin text NOT NULL,
  network text,
  amount_usd numeric(14,2) NOT NULL,
  amount_coin numeric(24,8),
  rate numeric(20,8),
  address text NOT NULL,
  tx_hash text,
  status topup_status NOT NULL DEFAULT 'pending'::topup_status,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_confirmed_at timestamp with time zone,
  detected_tx_hash text,
  detected_amount numeric,
  detected_at timestamp with time zone,
  confirmations integer NOT NULL DEFAULT 0,
  required_confirmations integer NOT NULL DEFAULT 1,
  verifier_state text NOT NULL DEFAULT 'awaiting_user'::text,
  last_checked_at timestamp with time zone,
  check_error text,
  CONSTRAINT topups_pkey PRIMARY KEY (id),
  CONSTRAINT topups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.x_profiles (
  username_key text NOT NULL,
  user_name text NOT NULL,
  name text,
  avatar_url text,
  banner_url text,
  description text,
  followers integer NOT NULL DEFAULT 0,
  following integer NOT NULL DEFAULT 0,
  is_blue_verified boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  verified_type text,
  joined_at timestamp with time zone,
  not_found boolean NOT NULL DEFAULT false,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT x_profiles_pkey PRIMARY KEY (username_key)
);
ALTER TABLE public.x_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.x_sync_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manual'::text,
  scope text NOT NULL DEFAULT 'all'::text,
  requested integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  not_found integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT x_sync_runs_pkey PRIMARY KEY (id)
);
ALTER TABLE public.x_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.x_tweets (
  tweet_id text NOT NULL,
  author_username text,
  author_name text,
  author_avatar_url text,
  is_blue_verified boolean NOT NULL DEFAULT false,
  verified_type text,
  text text,
  like_count bigint NOT NULL DEFAULT 0,
  retweet_count bigint NOT NULL DEFAULT 0,
  reply_count bigint NOT NULL DEFAULT 0,
  quote_count bigint NOT NULL DEFAULT 0,
  view_count bigint NOT NULL DEFAULT 0,
  bookmark_count bigint NOT NULL DEFAULT 0,
  posted_at timestamp with time zone,
  not_found boolean NOT NULL DEFAULT false,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT x_tweets_pkey PRIMARY KEY (tweet_id)
);
ALTER TABLE public.x_tweets ENABLE ROW LEVEL SECURITY;


-- ===== INDEXES =====

CREATE INDEX IF NOT EXISTS boost_status_events_created_at_idx ON public.boost_status_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS boost_status_events_subcat_region_idx ON public.boost_status_events USING btree (subcategory_id, region, created_at DESC);
CREATE INDEX IF NOT EXISTS boost_status_events_subcat_region_time_idx ON public.boost_status_events USING btree (subcategory_id, region, created_at DESC);
CREATE INDEX IF NOT EXISTS boost_status_events_time_idx ON public.boost_status_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS follower_accounts_category_idx ON public.follower_accounts USING btree (category);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_tx_user ON public.balance_transactions USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boost_notify_subcat ON public.boost_notify_subscriptions USING btree (subcategory_id);
CREATE INDEX IF NOT EXISTS idx_boost_notify_user ON public.boost_notify_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_msg_thread ON public.support_messages USING btree (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products USING btree (active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON public.profiles USING btree (telegram_id);
CREATE INDEX IF NOT EXISTS idx_topups_user ON public.topups USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_notify_subscriptions_created_at_idx ON public.maintenance_notify_subscriptions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS order_refills_order_key_idx ON public.order_refills USING btree (order_key);
CREATE INDEX IF NOT EXISTS order_refills_user_order_idx ON public.order_refills USING btree (user_id, order_key, requested_at DESC);
CREATE INDEX IF NOT EXISTS x_sync_runs_started_at_idx ON public.x_sync_runs USING btree (started_at DESC);


-- ===== GRANTS =====

GRANT DELETE ON public.admin_audit_log TO anon;
GRANT INSERT ON public.admin_audit_log TO anon;
GRANT REFERENCES ON public.admin_audit_log TO anon;
GRANT SELECT ON public.admin_audit_log TO anon;
GRANT TRIGGER ON public.admin_audit_log TO anon;
GRANT TRUNCATE ON public.admin_audit_log TO anon;
GRANT UPDATE ON public.admin_audit_log TO anon;
GRANT DELETE ON public.admin_audit_log TO authenticated;
GRANT INSERT ON public.admin_audit_log TO authenticated;
GRANT REFERENCES ON public.admin_audit_log TO authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT TRIGGER ON public.admin_audit_log TO authenticated;
GRANT TRUNCATE ON public.admin_audit_log TO authenticated;
GRANT UPDATE ON public.admin_audit_log TO authenticated;
GRANT DELETE ON public.admin_audit_log TO service_role;
GRANT INSERT ON public.admin_audit_log TO service_role;
GRANT REFERENCES ON public.admin_audit_log TO service_role;
GRANT SELECT ON public.admin_audit_log TO service_role;
GRANT TRIGGER ON public.admin_audit_log TO service_role;
GRANT TRUNCATE ON public.admin_audit_log TO service_role;
GRANT UPDATE ON public.admin_audit_log TO service_role;
GRANT DELETE ON public.balance_transactions TO anon;
GRANT INSERT ON public.balance_transactions TO anon;
GRANT REFERENCES ON public.balance_transactions TO anon;
GRANT SELECT ON public.balance_transactions TO anon;
GRANT TRIGGER ON public.balance_transactions TO anon;
GRANT TRUNCATE ON public.balance_transactions TO anon;
GRANT UPDATE ON public.balance_transactions TO anon;
GRANT DELETE ON public.balance_transactions TO authenticated;
GRANT INSERT ON public.balance_transactions TO authenticated;
GRANT REFERENCES ON public.balance_transactions TO authenticated;
GRANT SELECT ON public.balance_transactions TO authenticated;
GRANT TRIGGER ON public.balance_transactions TO authenticated;
GRANT TRUNCATE ON public.balance_transactions TO authenticated;
GRANT UPDATE ON public.balance_transactions TO authenticated;
GRANT DELETE ON public.balance_transactions TO service_role;
GRANT INSERT ON public.balance_transactions TO service_role;
GRANT REFERENCES ON public.balance_transactions TO service_role;
GRANT SELECT ON public.balance_transactions TO service_role;
GRANT TRIGGER ON public.balance_transactions TO service_role;
GRANT TRUNCATE ON public.balance_transactions TO service_role;
GRANT UPDATE ON public.balance_transactions TO service_role;
GRANT DELETE ON public.boost_notify_subscriptions TO anon;
GRANT INSERT ON public.boost_notify_subscriptions TO anon;
GRANT REFERENCES ON public.boost_notify_subscriptions TO anon;
GRANT SELECT ON public.boost_notify_subscriptions TO anon;
GRANT TRIGGER ON public.boost_notify_subscriptions TO anon;
GRANT TRUNCATE ON public.boost_notify_subscriptions TO anon;
GRANT UPDATE ON public.boost_notify_subscriptions TO anon;
GRANT DELETE ON public.boost_notify_subscriptions TO authenticated;
GRANT INSERT ON public.boost_notify_subscriptions TO authenticated;
GRANT REFERENCES ON public.boost_notify_subscriptions TO authenticated;
GRANT SELECT ON public.boost_notify_subscriptions TO authenticated;
GRANT TRIGGER ON public.boost_notify_subscriptions TO authenticated;
GRANT TRUNCATE ON public.boost_notify_subscriptions TO authenticated;
GRANT UPDATE ON public.boost_notify_subscriptions TO authenticated;
GRANT DELETE ON public.boost_notify_subscriptions TO service_role;
GRANT INSERT ON public.boost_notify_subscriptions TO service_role;
GRANT REFERENCES ON public.boost_notify_subscriptions TO service_role;
GRANT SELECT ON public.boost_notify_subscriptions TO service_role;
GRANT TRIGGER ON public.boost_notify_subscriptions TO service_role;
GRANT TRUNCATE ON public.boost_notify_subscriptions TO service_role;
GRANT UPDATE ON public.boost_notify_subscriptions TO service_role;
GRANT DELETE ON public.boost_service_status TO anon;
GRANT INSERT ON public.boost_service_status TO anon;
GRANT REFERENCES ON public.boost_service_status TO anon;
GRANT SELECT ON public.boost_service_status TO anon;
GRANT TRIGGER ON public.boost_service_status TO anon;
GRANT TRUNCATE ON public.boost_service_status TO anon;
GRANT UPDATE ON public.boost_service_status TO anon;
GRANT DELETE ON public.boost_service_status TO authenticated;
GRANT INSERT ON public.boost_service_status TO authenticated;
GRANT REFERENCES ON public.boost_service_status TO authenticated;
GRANT SELECT ON public.boost_service_status TO authenticated;
GRANT TRIGGER ON public.boost_service_status TO authenticated;
GRANT TRUNCATE ON public.boost_service_status TO authenticated;
GRANT UPDATE ON public.boost_service_status TO authenticated;
GRANT DELETE ON public.boost_service_status TO service_role;
GRANT INSERT ON public.boost_service_status TO service_role;
GRANT REFERENCES ON public.boost_service_status TO service_role;
GRANT SELECT ON public.boost_service_status TO service_role;
GRANT TRIGGER ON public.boost_service_status TO service_role;
GRANT TRUNCATE ON public.boost_service_status TO service_role;
GRANT UPDATE ON public.boost_service_status TO service_role;
GRANT DELETE ON public.boost_status_events TO anon;
GRANT INSERT ON public.boost_status_events TO anon;
GRANT REFERENCES ON public.boost_status_events TO anon;
GRANT SELECT ON public.boost_status_events TO anon;
GRANT TRIGGER ON public.boost_status_events TO anon;
GRANT TRUNCATE ON public.boost_status_events TO anon;
GRANT UPDATE ON public.boost_status_events TO anon;
GRANT DELETE ON public.boost_status_events TO authenticated;
GRANT INSERT ON public.boost_status_events TO authenticated;
GRANT REFERENCES ON public.boost_status_events TO authenticated;
GRANT SELECT ON public.boost_status_events TO authenticated;
GRANT TRIGGER ON public.boost_status_events TO authenticated;
GRANT TRUNCATE ON public.boost_status_events TO authenticated;
GRANT UPDATE ON public.boost_status_events TO authenticated;
GRANT DELETE ON public.boost_status_events TO service_role;
GRANT INSERT ON public.boost_status_events TO service_role;
GRANT REFERENCES ON public.boost_status_events TO service_role;
GRANT SELECT ON public.boost_status_events TO service_role;
GRANT TRIGGER ON public.boost_status_events TO service_role;
GRANT TRUNCATE ON public.boost_status_events TO service_role;
GRANT UPDATE ON public.boost_status_events TO service_role;
GRANT DELETE ON public.broadcast_campaigns TO anon;
GRANT INSERT ON public.broadcast_campaigns TO anon;
GRANT REFERENCES ON public.broadcast_campaigns TO anon;
GRANT SELECT ON public.broadcast_campaigns TO anon;
GRANT TRIGGER ON public.broadcast_campaigns TO anon;
GRANT TRUNCATE ON public.broadcast_campaigns TO anon;
GRANT UPDATE ON public.broadcast_campaigns TO anon;
GRANT DELETE ON public.broadcast_campaigns TO authenticated;
GRANT INSERT ON public.broadcast_campaigns TO authenticated;
GRANT REFERENCES ON public.broadcast_campaigns TO authenticated;
GRANT SELECT ON public.broadcast_campaigns TO authenticated;
GRANT TRIGGER ON public.broadcast_campaigns TO authenticated;
GRANT TRUNCATE ON public.broadcast_campaigns TO authenticated;
GRANT UPDATE ON public.broadcast_campaigns TO authenticated;
GRANT DELETE ON public.broadcast_campaigns TO service_role;
GRANT INSERT ON public.broadcast_campaigns TO service_role;
GRANT REFERENCES ON public.broadcast_campaigns TO service_role;
GRANT SELECT ON public.broadcast_campaigns TO service_role;
GRANT TRIGGER ON public.broadcast_campaigns TO service_role;
GRANT TRUNCATE ON public.broadcast_campaigns TO service_role;
GRANT UPDATE ON public.broadcast_campaigns TO service_role;
GRANT DELETE ON public.broadcast_reads TO anon;
GRANT INSERT ON public.broadcast_reads TO anon;
GRANT REFERENCES ON public.broadcast_reads TO anon;
GRANT SELECT ON public.broadcast_reads TO anon;
GRANT TRIGGER ON public.broadcast_reads TO anon;
GRANT TRUNCATE ON public.broadcast_reads TO anon;
GRANT UPDATE ON public.broadcast_reads TO anon;
GRANT DELETE ON public.broadcast_reads TO authenticated;
GRANT INSERT ON public.broadcast_reads TO authenticated;
GRANT REFERENCES ON public.broadcast_reads TO authenticated;
GRANT SELECT ON public.broadcast_reads TO authenticated;
GRANT TRIGGER ON public.broadcast_reads TO authenticated;
GRANT TRUNCATE ON public.broadcast_reads TO authenticated;
GRANT UPDATE ON public.broadcast_reads TO authenticated;
GRANT DELETE ON public.broadcast_reads TO service_role;
GRANT INSERT ON public.broadcast_reads TO service_role;
GRANT REFERENCES ON public.broadcast_reads TO service_role;
GRANT SELECT ON public.broadcast_reads TO service_role;
GRANT TRIGGER ON public.broadcast_reads TO service_role;
GRANT TRUNCATE ON public.broadcast_reads TO service_role;
GRANT UPDATE ON public.broadcast_reads TO service_role;
GRANT DELETE ON public.categories TO anon;
GRANT INSERT ON public.categories TO anon;
GRANT REFERENCES ON public.categories TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT TRIGGER ON public.categories TO anon;
GRANT TRUNCATE ON public.categories TO anon;
GRANT UPDATE ON public.categories TO anon;
GRANT DELETE ON public.categories TO authenticated;
GRANT INSERT ON public.categories TO authenticated;
GRANT REFERENCES ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT TRIGGER ON public.categories TO authenticated;
GRANT TRUNCATE ON public.categories TO authenticated;
GRANT UPDATE ON public.categories TO authenticated;
GRANT DELETE ON public.categories TO service_role;
GRANT INSERT ON public.categories TO service_role;
GRANT REFERENCES ON public.categories TO service_role;
GRANT SELECT ON public.categories TO service_role;
GRANT TRIGGER ON public.categories TO service_role;
GRANT TRUNCATE ON public.categories TO service_role;
GRANT UPDATE ON public.categories TO service_role;
GRANT DELETE ON public.follower_accounts TO anon;
GRANT INSERT ON public.follower_accounts TO anon;
GRANT REFERENCES ON public.follower_accounts TO anon;
GRANT SELECT ON public.follower_accounts TO anon;
GRANT TRIGGER ON public.follower_accounts TO anon;
GRANT TRUNCATE ON public.follower_accounts TO anon;
GRANT UPDATE ON public.follower_accounts TO anon;
GRANT DELETE ON public.follower_accounts TO authenticated;
GRANT INSERT ON public.follower_accounts TO authenticated;
GRANT REFERENCES ON public.follower_accounts TO authenticated;
GRANT SELECT ON public.follower_accounts TO authenticated;
GRANT TRIGGER ON public.follower_accounts TO authenticated;
GRANT TRUNCATE ON public.follower_accounts TO authenticated;
GRANT UPDATE ON public.follower_accounts TO authenticated;
GRANT DELETE ON public.follower_accounts TO service_role;
GRANT INSERT ON public.follower_accounts TO service_role;
GRANT REFERENCES ON public.follower_accounts TO service_role;
GRANT SELECT ON public.follower_accounts TO service_role;
GRANT TRIGGER ON public.follower_accounts TO service_role;
GRANT TRUNCATE ON public.follower_accounts TO service_role;
GRANT UPDATE ON public.follower_accounts TO service_role;
GRANT DELETE ON public.maintenance_notify_subscriptions TO anon;
GRANT INSERT ON public.maintenance_notify_subscriptions TO anon;
GRANT REFERENCES ON public.maintenance_notify_subscriptions TO anon;
GRANT SELECT ON public.maintenance_notify_subscriptions TO anon;
GRANT TRIGGER ON public.maintenance_notify_subscriptions TO anon;
GRANT TRUNCATE ON public.maintenance_notify_subscriptions TO anon;
GRANT UPDATE ON public.maintenance_notify_subscriptions TO anon;
GRANT DELETE ON public.maintenance_notify_subscriptions TO authenticated;
GRANT INSERT ON public.maintenance_notify_subscriptions TO authenticated;
GRANT REFERENCES ON public.maintenance_notify_subscriptions TO authenticated;
GRANT SELECT ON public.maintenance_notify_subscriptions TO authenticated;
GRANT TRIGGER ON public.maintenance_notify_subscriptions TO authenticated;
GRANT TRUNCATE ON public.maintenance_notify_subscriptions TO authenticated;
GRANT UPDATE ON public.maintenance_notify_subscriptions TO authenticated;
GRANT DELETE ON public.maintenance_notify_subscriptions TO service_role;
GRANT INSERT ON public.maintenance_notify_subscriptions TO service_role;
GRANT REFERENCES ON public.maintenance_notify_subscriptions TO service_role;
GRANT SELECT ON public.maintenance_notify_subscriptions TO service_role;
GRANT TRIGGER ON public.maintenance_notify_subscriptions TO service_role;
GRANT TRUNCATE ON public.maintenance_notify_subscriptions TO service_role;
GRANT UPDATE ON public.maintenance_notify_subscriptions TO service_role;
GRANT DELETE ON public.maintenance_state TO anon;
GRANT INSERT ON public.maintenance_state TO anon;
GRANT REFERENCES ON public.maintenance_state TO anon;
GRANT SELECT ON public.maintenance_state TO anon;
GRANT TRIGGER ON public.maintenance_state TO anon;
GRANT TRUNCATE ON public.maintenance_state TO anon;
GRANT UPDATE ON public.maintenance_state TO anon;
GRANT DELETE ON public.maintenance_state TO authenticated;
GRANT INSERT ON public.maintenance_state TO authenticated;
GRANT REFERENCES ON public.maintenance_state TO authenticated;
GRANT SELECT ON public.maintenance_state TO authenticated;
GRANT TRIGGER ON public.maintenance_state TO authenticated;
GRANT TRUNCATE ON public.maintenance_state TO authenticated;
GRANT UPDATE ON public.maintenance_state TO authenticated;
GRANT DELETE ON public.maintenance_state TO service_role;
GRANT INSERT ON public.maintenance_state TO service_role;
GRANT REFERENCES ON public.maintenance_state TO service_role;
GRANT SELECT ON public.maintenance_state TO service_role;
GRANT TRIGGER ON public.maintenance_state TO service_role;
GRANT TRUNCATE ON public.maintenance_state TO service_role;
GRANT UPDATE ON public.maintenance_state TO service_role;
GRANT DELETE ON public.maintenance_targets TO anon;
GRANT INSERT ON public.maintenance_targets TO anon;
GRANT REFERENCES ON public.maintenance_targets TO anon;
GRANT SELECT ON public.maintenance_targets TO anon;
GRANT TRIGGER ON public.maintenance_targets TO anon;
GRANT TRUNCATE ON public.maintenance_targets TO anon;
GRANT UPDATE ON public.maintenance_targets TO anon;
GRANT DELETE ON public.maintenance_targets TO authenticated;
GRANT INSERT ON public.maintenance_targets TO authenticated;
GRANT REFERENCES ON public.maintenance_targets TO authenticated;
GRANT SELECT ON public.maintenance_targets TO authenticated;
GRANT TRIGGER ON public.maintenance_targets TO authenticated;
GRANT TRUNCATE ON public.maintenance_targets TO authenticated;
GRANT UPDATE ON public.maintenance_targets TO authenticated;
GRANT DELETE ON public.maintenance_targets TO service_role;
GRANT INSERT ON public.maintenance_targets TO service_role;
GRANT REFERENCES ON public.maintenance_targets TO service_role;
GRANT SELECT ON public.maintenance_targets TO service_role;
GRANT TRIGGER ON public.maintenance_targets TO service_role;
GRANT TRUNCATE ON public.maintenance_targets TO service_role;
GRANT UPDATE ON public.maintenance_targets TO service_role;
GRANT DELETE ON public.maintenance_whitelist TO anon;
GRANT INSERT ON public.maintenance_whitelist TO anon;
GRANT REFERENCES ON public.maintenance_whitelist TO anon;
GRANT SELECT ON public.maintenance_whitelist TO anon;
GRANT TRIGGER ON public.maintenance_whitelist TO anon;
GRANT TRUNCATE ON public.maintenance_whitelist TO anon;
GRANT UPDATE ON public.maintenance_whitelist TO anon;
GRANT DELETE ON public.maintenance_whitelist TO authenticated;
GRANT INSERT ON public.maintenance_whitelist TO authenticated;
GRANT REFERENCES ON public.maintenance_whitelist TO authenticated;
GRANT SELECT ON public.maintenance_whitelist TO authenticated;
GRANT TRIGGER ON public.maintenance_whitelist TO authenticated;
GRANT TRUNCATE ON public.maintenance_whitelist TO authenticated;
GRANT UPDATE ON public.maintenance_whitelist TO authenticated;
GRANT DELETE ON public.maintenance_whitelist TO service_role;
GRANT INSERT ON public.maintenance_whitelist TO service_role;
GRANT REFERENCES ON public.maintenance_whitelist TO service_role;
GRANT SELECT ON public.maintenance_whitelist TO service_role;
GRANT TRIGGER ON public.maintenance_whitelist TO service_role;
GRANT TRUNCATE ON public.maintenance_whitelist TO service_role;
GRANT UPDATE ON public.maintenance_whitelist TO service_role;
GRANT DELETE ON public.order_refills TO anon;
GRANT INSERT ON public.order_refills TO anon;
GRANT REFERENCES ON public.order_refills TO anon;
GRANT SELECT ON public.order_refills TO anon;
GRANT TRIGGER ON public.order_refills TO anon;
GRANT TRUNCATE ON public.order_refills TO anon;
GRANT UPDATE ON public.order_refills TO anon;
GRANT DELETE ON public.order_refills TO authenticated;
GRANT INSERT ON public.order_refills TO authenticated;
GRANT REFERENCES ON public.order_refills TO authenticated;
GRANT SELECT ON public.order_refills TO authenticated;
GRANT TRIGGER ON public.order_refills TO authenticated;
GRANT TRUNCATE ON public.order_refills TO authenticated;
GRANT UPDATE ON public.order_refills TO authenticated;
GRANT DELETE ON public.order_refills TO service_role;
GRANT INSERT ON public.order_refills TO service_role;
GRANT REFERENCES ON public.order_refills TO service_role;
GRANT SELECT ON public.order_refills TO service_role;
GRANT TRIGGER ON public.order_refills TO service_role;
GRANT TRUNCATE ON public.order_refills TO service_role;
GRANT UPDATE ON public.order_refills TO service_role;
GRANT DELETE ON public.order_refunds TO anon;
GRANT INSERT ON public.order_refunds TO anon;
GRANT REFERENCES ON public.order_refunds TO anon;
GRANT SELECT ON public.order_refunds TO anon;
GRANT TRIGGER ON public.order_refunds TO anon;
GRANT TRUNCATE ON public.order_refunds TO anon;
GRANT UPDATE ON public.order_refunds TO anon;
GRANT DELETE ON public.order_refunds TO authenticated;
GRANT INSERT ON public.order_refunds TO authenticated;
GRANT REFERENCES ON public.order_refunds TO authenticated;
GRANT SELECT ON public.order_refunds TO authenticated;
GRANT TRIGGER ON public.order_refunds TO authenticated;
GRANT TRUNCATE ON public.order_refunds TO authenticated;
GRANT UPDATE ON public.order_refunds TO authenticated;
GRANT DELETE ON public.order_refunds TO service_role;
GRANT INSERT ON public.order_refunds TO service_role;
GRANT REFERENCES ON public.order_refunds TO service_role;
GRANT SELECT ON public.order_refunds TO service_role;
GRANT TRIGGER ON public.order_refunds TO service_role;
GRANT TRUNCATE ON public.order_refunds TO service_role;
GRANT UPDATE ON public.order_refunds TO service_role;
GRANT DELETE ON public.orders TO anon;
GRANT INSERT ON public.orders TO anon;
GRANT REFERENCES ON public.orders TO anon;
GRANT SELECT ON public.orders TO anon;
GRANT TRIGGER ON public.orders TO anon;
GRANT TRUNCATE ON public.orders TO anon;
GRANT UPDATE ON public.orders TO anon;
GRANT DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO authenticated;
GRANT REFERENCES ON public.orders TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT TRIGGER ON public.orders TO authenticated;
GRANT TRUNCATE ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT DELETE ON public.orders TO service_role;
GRANT INSERT ON public.orders TO service_role;
GRANT REFERENCES ON public.orders TO service_role;
GRANT SELECT ON public.orders TO service_role;
GRANT TRIGGER ON public.orders TO service_role;
GRANT TRUNCATE ON public.orders TO service_role;
GRANT UPDATE ON public.orders TO service_role;
GRANT DELETE ON public.pricing_settings TO anon;
GRANT INSERT ON public.pricing_settings TO anon;
GRANT REFERENCES ON public.pricing_settings TO anon;
GRANT SELECT ON public.pricing_settings TO anon;
GRANT TRIGGER ON public.pricing_settings TO anon;
GRANT TRUNCATE ON public.pricing_settings TO anon;
GRANT UPDATE ON public.pricing_settings TO anon;
GRANT DELETE ON public.pricing_settings TO authenticated;
GRANT INSERT ON public.pricing_settings TO authenticated;
GRANT REFERENCES ON public.pricing_settings TO authenticated;
GRANT SELECT ON public.pricing_settings TO authenticated;
GRANT TRIGGER ON public.pricing_settings TO authenticated;
GRANT TRUNCATE ON public.pricing_settings TO authenticated;
GRANT UPDATE ON public.pricing_settings TO authenticated;
GRANT DELETE ON public.pricing_settings TO service_role;
GRANT INSERT ON public.pricing_settings TO service_role;
GRANT REFERENCES ON public.pricing_settings TO service_role;
GRANT SELECT ON public.pricing_settings TO service_role;
GRANT TRIGGER ON public.pricing_settings TO service_role;
GRANT TRUNCATE ON public.pricing_settings TO service_role;
GRANT UPDATE ON public.pricing_settings TO service_role;
GRANT DELETE ON public.products TO anon;
GRANT INSERT ON public.products TO anon;
GRANT REFERENCES ON public.products TO anon;
GRANT SELECT ON public.products TO anon;
GRANT TRIGGER ON public.products TO anon;
GRANT TRUNCATE ON public.products TO anon;
GRANT UPDATE ON public.products TO anon;
GRANT DELETE ON public.products TO authenticated;
GRANT INSERT ON public.products TO authenticated;
GRANT REFERENCES ON public.products TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT TRIGGER ON public.products TO authenticated;
GRANT TRUNCATE ON public.products TO authenticated;
GRANT UPDATE ON public.products TO authenticated;
GRANT DELETE ON public.products TO service_role;
GRANT INSERT ON public.products TO service_role;
GRANT REFERENCES ON public.products TO service_role;
GRANT SELECT ON public.products TO service_role;
GRANT TRIGGER ON public.products TO service_role;
GRANT TRUNCATE ON public.products TO service_role;
GRANT UPDATE ON public.products TO service_role;
GRANT DELETE ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO anon;
GRANT REFERENCES ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT TRIGGER ON public.profiles TO anon;
GRANT TRUNCATE ON public.profiles TO anon;
GRANT UPDATE ON public.profiles TO anon;
GRANT DELETE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT REFERENCES ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT TRIGGER ON public.profiles TO authenticated;
GRANT TRUNCATE ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO service_role;
GRANT INSERT ON public.profiles TO service_role;
GRANT REFERENCES ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO service_role;
GRANT TRIGGER ON public.profiles TO service_role;
GRANT TRUNCATE ON public.profiles TO service_role;
GRANT UPDATE ON public.profiles TO service_role;
GRANT DELETE ON public.promo_codes TO anon;
GRANT INSERT ON public.promo_codes TO anon;
GRANT REFERENCES ON public.promo_codes TO anon;
GRANT SELECT ON public.promo_codes TO anon;
GRANT TRIGGER ON public.promo_codes TO anon;
GRANT TRUNCATE ON public.promo_codes TO anon;
GRANT UPDATE ON public.promo_codes TO anon;
GRANT DELETE ON public.promo_codes TO authenticated;
GRANT INSERT ON public.promo_codes TO authenticated;
GRANT REFERENCES ON public.promo_codes TO authenticated;
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT TRIGGER ON public.promo_codes TO authenticated;
GRANT TRUNCATE ON public.promo_codes TO authenticated;
GRANT UPDATE ON public.promo_codes TO authenticated;
GRANT DELETE ON public.promo_codes TO service_role;
GRANT INSERT ON public.promo_codes TO service_role;
GRANT REFERENCES ON public.promo_codes TO service_role;
GRANT SELECT ON public.promo_codes TO service_role;
GRANT TRIGGER ON public.promo_codes TO service_role;
GRANT TRUNCATE ON public.promo_codes TO service_role;
GRANT UPDATE ON public.promo_codes TO service_role;
GRANT DELETE ON public.promo_redemptions TO anon;
GRANT INSERT ON public.promo_redemptions TO anon;
GRANT REFERENCES ON public.promo_redemptions TO anon;
GRANT SELECT ON public.promo_redemptions TO anon;
GRANT TRIGGER ON public.promo_redemptions TO anon;
GRANT TRUNCATE ON public.promo_redemptions TO anon;
GRANT UPDATE ON public.promo_redemptions TO anon;
GRANT DELETE ON public.promo_redemptions TO authenticated;
GRANT INSERT ON public.promo_redemptions TO authenticated;
GRANT REFERENCES ON public.promo_redemptions TO authenticated;
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT TRIGGER ON public.promo_redemptions TO authenticated;
GRANT TRUNCATE ON public.promo_redemptions TO authenticated;
GRANT UPDATE ON public.promo_redemptions TO authenticated;
GRANT DELETE ON public.promo_redemptions TO service_role;
GRANT INSERT ON public.promo_redemptions TO service_role;
GRANT REFERENCES ON public.promo_redemptions TO service_role;
GRANT SELECT ON public.promo_redemptions TO service_role;
GRANT TRIGGER ON public.promo_redemptions TO service_role;
GRANT TRUNCATE ON public.promo_redemptions TO service_role;
GRANT UPDATE ON public.promo_redemptions TO service_role;
GRANT DELETE ON public.supplier_applications TO anon;
GRANT INSERT ON public.supplier_applications TO anon;
GRANT REFERENCES ON public.supplier_applications TO anon;
GRANT SELECT ON public.supplier_applications TO anon;
GRANT TRIGGER ON public.supplier_applications TO anon;
GRANT TRUNCATE ON public.supplier_applications TO anon;
GRANT UPDATE ON public.supplier_applications TO anon;
GRANT DELETE ON public.supplier_applications TO authenticated;
GRANT INSERT ON public.supplier_applications TO authenticated;
GRANT REFERENCES ON public.supplier_applications TO authenticated;
GRANT SELECT ON public.supplier_applications TO authenticated;
GRANT TRIGGER ON public.supplier_applications TO authenticated;
GRANT TRUNCATE ON public.supplier_applications TO authenticated;
GRANT UPDATE ON public.supplier_applications TO authenticated;
GRANT DELETE ON public.supplier_applications TO service_role;
GRANT INSERT ON public.supplier_applications TO service_role;
GRANT REFERENCES ON public.supplier_applications TO service_role;
GRANT SELECT ON public.supplier_applications TO service_role;
GRANT TRIGGER ON public.supplier_applications TO service_role;
GRANT TRUNCATE ON public.supplier_applications TO service_role;
GRANT UPDATE ON public.supplier_applications TO service_role;
GRANT DELETE ON public.support_messages TO anon;
GRANT INSERT ON public.support_messages TO anon;
GRANT REFERENCES ON public.support_messages TO anon;
GRANT SELECT ON public.support_messages TO anon;
GRANT TRIGGER ON public.support_messages TO anon;
GRANT TRUNCATE ON public.support_messages TO anon;
GRANT UPDATE ON public.support_messages TO anon;
GRANT DELETE ON public.support_messages TO authenticated;
GRANT INSERT ON public.support_messages TO authenticated;
GRANT REFERENCES ON public.support_messages TO authenticated;
GRANT SELECT ON public.support_messages TO authenticated;
GRANT TRIGGER ON public.support_messages TO authenticated;
GRANT TRUNCATE ON public.support_messages TO authenticated;
GRANT UPDATE ON public.support_messages TO authenticated;
GRANT DELETE ON public.support_messages TO service_role;
GRANT INSERT ON public.support_messages TO service_role;
GRANT REFERENCES ON public.support_messages TO service_role;
GRANT SELECT ON public.support_messages TO service_role;
GRANT TRIGGER ON public.support_messages TO service_role;
GRANT TRUNCATE ON public.support_messages TO service_role;
GRANT UPDATE ON public.support_messages TO service_role;
GRANT DELETE ON public.support_threads TO anon;
GRANT INSERT ON public.support_threads TO anon;
GRANT REFERENCES ON public.support_threads TO anon;
GRANT SELECT ON public.support_threads TO anon;
GRANT TRIGGER ON public.support_threads TO anon;
GRANT TRUNCATE ON public.support_threads TO anon;
GRANT UPDATE ON public.support_threads TO anon;
GRANT DELETE ON public.support_threads TO authenticated;
GRANT INSERT ON public.support_threads TO authenticated;
GRANT REFERENCES ON public.support_threads TO authenticated;
GRANT SELECT ON public.support_threads TO authenticated;
GRANT TRIGGER ON public.support_threads TO authenticated;
GRANT TRUNCATE ON public.support_threads TO authenticated;
GRANT UPDATE ON public.support_threads TO authenticated;
GRANT DELETE ON public.support_threads TO service_role;
GRANT INSERT ON public.support_threads TO service_role;
GRANT REFERENCES ON public.support_threads TO service_role;
GRANT SELECT ON public.support_threads TO service_role;
GRANT TRIGGER ON public.support_threads TO service_role;
GRANT TRUNCATE ON public.support_threads TO service_role;
GRANT UPDATE ON public.support_threads TO service_role;
GRANT DELETE ON public.topups TO anon;
GRANT INSERT ON public.topups TO anon;
GRANT REFERENCES ON public.topups TO anon;
GRANT SELECT ON public.topups TO anon;
GRANT TRIGGER ON public.topups TO anon;
GRANT TRUNCATE ON public.topups TO anon;
GRANT UPDATE ON public.topups TO anon;
GRANT DELETE ON public.topups TO authenticated;
GRANT INSERT ON public.topups TO authenticated;
GRANT REFERENCES ON public.topups TO authenticated;
GRANT SELECT ON public.topups TO authenticated;
GRANT TRIGGER ON public.topups TO authenticated;
GRANT TRUNCATE ON public.topups TO authenticated;
GRANT UPDATE ON public.topups TO authenticated;
GRANT DELETE ON public.topups TO service_role;
GRANT INSERT ON public.topups TO service_role;
GRANT REFERENCES ON public.topups TO service_role;
GRANT SELECT ON public.topups TO service_role;
GRANT TRIGGER ON public.topups TO service_role;
GRANT TRUNCATE ON public.topups TO service_role;
GRANT UPDATE ON public.topups TO service_role;
GRANT DELETE ON public.user_roles TO anon;
GRANT INSERT ON public.user_roles TO anon;
GRANT REFERENCES ON public.user_roles TO anon;
GRANT SELECT ON public.user_roles TO anon;
GRANT TRIGGER ON public.user_roles TO anon;
GRANT TRUNCATE ON public.user_roles TO anon;
GRANT UPDATE ON public.user_roles TO anon;
GRANT DELETE ON public.user_roles TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT REFERENCES ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT TRIGGER ON public.user_roles TO authenticated;
GRANT TRUNCATE ON public.user_roles TO authenticated;
GRANT UPDATE ON public.user_roles TO authenticated;
GRANT DELETE ON public.user_roles TO service_role;
GRANT INSERT ON public.user_roles TO service_role;
GRANT REFERENCES ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO service_role;
GRANT TRIGGER ON public.user_roles TO service_role;
GRANT TRUNCATE ON public.user_roles TO service_role;
GRANT UPDATE ON public.user_roles TO service_role;
GRANT DELETE ON public.x_profiles TO anon;
GRANT INSERT ON public.x_profiles TO anon;
GRANT REFERENCES ON public.x_profiles TO anon;
GRANT SELECT ON public.x_profiles TO anon;
GRANT TRIGGER ON public.x_profiles TO anon;
GRANT TRUNCATE ON public.x_profiles TO anon;
GRANT UPDATE ON public.x_profiles TO anon;
GRANT DELETE ON public.x_profiles TO authenticated;
GRANT INSERT ON public.x_profiles TO authenticated;
GRANT REFERENCES ON public.x_profiles TO authenticated;
GRANT SELECT ON public.x_profiles TO authenticated;
GRANT TRIGGER ON public.x_profiles TO authenticated;
GRANT TRUNCATE ON public.x_profiles TO authenticated;
GRANT UPDATE ON public.x_profiles TO authenticated;
GRANT DELETE ON public.x_profiles TO service_role;
GRANT INSERT ON public.x_profiles TO service_role;
GRANT REFERENCES ON public.x_profiles TO service_role;
GRANT SELECT ON public.x_profiles TO service_role;
GRANT TRIGGER ON public.x_profiles TO service_role;
GRANT TRUNCATE ON public.x_profiles TO service_role;
GRANT UPDATE ON public.x_profiles TO service_role;
GRANT DELETE ON public.x_sync_runs TO anon;
GRANT INSERT ON public.x_sync_runs TO anon;
GRANT REFERENCES ON public.x_sync_runs TO anon;
GRANT SELECT ON public.x_sync_runs TO anon;
GRANT TRIGGER ON public.x_sync_runs TO anon;
GRANT TRUNCATE ON public.x_sync_runs TO anon;
GRANT UPDATE ON public.x_sync_runs TO anon;
GRANT DELETE ON public.x_sync_runs TO authenticated;
GRANT INSERT ON public.x_sync_runs TO authenticated;
GRANT REFERENCES ON public.x_sync_runs TO authenticated;
GRANT SELECT ON public.x_sync_runs TO authenticated;
GRANT TRIGGER ON public.x_sync_runs TO authenticated;
GRANT TRUNCATE ON public.x_sync_runs TO authenticated;
GRANT UPDATE ON public.x_sync_runs TO authenticated;
GRANT DELETE ON public.x_sync_runs TO service_role;
GRANT INSERT ON public.x_sync_runs TO service_role;
GRANT REFERENCES ON public.x_sync_runs TO service_role;
GRANT SELECT ON public.x_sync_runs TO service_role;
GRANT TRIGGER ON public.x_sync_runs TO service_role;
GRANT TRUNCATE ON public.x_sync_runs TO service_role;
GRANT UPDATE ON public.x_sync_runs TO service_role;
GRANT DELETE ON public.x_tweets TO anon;
GRANT INSERT ON public.x_tweets TO anon;
GRANT REFERENCES ON public.x_tweets TO anon;
GRANT SELECT ON public.x_tweets TO anon;
GRANT TRIGGER ON public.x_tweets TO anon;
GRANT TRUNCATE ON public.x_tweets TO anon;
GRANT UPDATE ON public.x_tweets TO anon;
GRANT DELETE ON public.x_tweets TO authenticated;
GRANT INSERT ON public.x_tweets TO authenticated;
GRANT REFERENCES ON public.x_tweets TO authenticated;
GRANT SELECT ON public.x_tweets TO authenticated;
GRANT TRIGGER ON public.x_tweets TO authenticated;
GRANT TRUNCATE ON public.x_tweets TO authenticated;
GRANT UPDATE ON public.x_tweets TO authenticated;
GRANT DELETE ON public.x_tweets TO service_role;
GRANT INSERT ON public.x_tweets TO service_role;
GRANT REFERENCES ON public.x_tweets TO service_role;
GRANT SELECT ON public.x_tweets TO service_role;
GRANT TRIGGER ON public.x_tweets TO service_role;
GRANT TRUNCATE ON public.x_tweets TO service_role;
GRANT UPDATE ON public.x_tweets TO service_role;


-- ===== POLICIES =====

CREATE POLICY "Admins read audit" ON public.admin_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins see all tx" ON public.balance_transactions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own tx" ON public.balance_transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins delete any subs" ON public.boost_notify_subscriptions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all subs" ON public.boost_notify_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users delete own subs" ON public.boost_notify_subscriptions AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users insert own subs" ON public.boost_notify_subscriptions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users see own subs" ON public.boost_notify_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins manage boost status" ON public.boost_service_status AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone reads boost status" ON public.boost_service_status AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can view boost events" ON public.boost_status_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY boost_status_events_admin_select ON public.boost_status_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage broadcasts" ON public.broadcast_campaigns AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read sent inapp broadcasts" ON public.broadcast_campaigns AS PERMISSIVE FOR SELECT TO authenticated USING (((channel = 'inapp'::text) AND (status = ANY (ARRAY['sent'::text, 'sending'::text]))));
CREATE POLICY "Admins read all reads" ON public.broadcast_reads AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users manage own reads" ON public.broadcast_reads AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Admins manage categories" ON public.categories AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Categories readable" ON public.categories AS PERMISSIVE FOR SELECT TO public USING (((active = true) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can delete accounts" ON public.follower_accounts AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert accounts" ON public.follower_accounts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update accounts" ON public.follower_accounts AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active accounts" ON public.follower_accounts AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY mns_admin_delete ON public.maintenance_notify_subscriptions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY mns_admin_select ON public.maintenance_notify_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY mns_own_delete ON public.maintenance_notify_subscriptions AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY mns_own_insert ON public.maintenance_notify_subscriptions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY mns_own_select ON public.maintenance_notify_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can read maintenance state" ON public.maintenance_state AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage targets" ON public.maintenance_targets AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own target row" ON public.maintenance_targets AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins can read whitelist" ON public.maintenance_whitelist AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can see own whitelist row" ON public.maintenance_whitelist AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins read all refills" ON public.order_refills AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read own refills" ON public.order_refills AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users read own refunds" ON public.order_refunds AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins read all orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update orders" ON public.orders AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own orders" ON public.orders AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Users read own orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins can update pricing settings" ON public.pricing_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Pricing settings are public to read" ON public.pricing_settings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Active products readable" ON public.products AS PERMISSIVE FOR SELECT TO public USING (((active = true) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins manage products" ON public.products AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY promo_codes_admin_all ON public.promo_codes AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY promo_codes_read_active ON public.promo_codes AS PERMISSIVE FOR SELECT TO authenticated USING (active);
CREATE POLICY promo_redemptions_admin_read ON public.promo_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY promo_redemptions_read_own ON public.promo_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins read all apps" ON public.supplier_applications AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update apps" ON public.supplier_applications AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own apps" ON public.supplier_applications AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Users read own apps" ON public.supplier_applications AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins all msgs" ON public.support_messages AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own thread msgs" ON public.support_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (((EXISTS ( SELECT 1
   FROM support_threads t
  WHERE ((t.id = support_messages.thread_id) AND (t.user_id = auth.uid())))) AND (from_admin = false) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Users read own thread msgs" ON public.support_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM support_threads t
  WHERE ((t.id = support_messages.thread_id) AND (t.user_id = auth.uid())))));
CREATE POLICY "Admins all threads" ON public.support_threads AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users own threads" ON public.support_threads AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Admins read all topups" ON public.topups AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update topups" ON public.topups AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own topups" ON public.topups AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Users read own topups" ON public.topups AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users update own topups" ON public.topups AS PERMISSIVE FOR UPDATE TO public USING (((user_id = auth.uid()) AND is_bot_accessible(auth.uid()))) WITH CHECK (((user_id = auth.uid()) AND is_bot_accessible(auth.uid())));
CREATE POLICY "Admins manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY x_profiles_public_read ON public.x_profiles AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can read x sync runs" ON public.x_sync_runs AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "x_tweets are publicly readable" ON public.x_tweets AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);


-- ===== FUNCTIONS =====

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _mode text, _amount numeric, _reason text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  cur numeric;
  new_bal numeric;
  delta numeric;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount IS NULL OR _amount < 0 THEN
    RAISE EXCEPTION 'Amount must be >= 0';
  END IF;

  PERFORM set_config('app.allow_balance_write', 'on', true);

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  IF _mode = 'credit' THEN
    new_bal := cur + _amount; delta := _amount;
  ELSIF _mode = 'debit' THEN
    new_bal := GREATEST(cur - _amount, 0); delta := new_bal - cur;
  ELSIF _mode = 'set' THEN
    new_bal := _amount; delta := _amount - cur;
  ELSE
    RAISE EXCEPTION 'Unknown mode';
  END IF;

  UPDATE public.profiles SET balance = new_bal, updated_at = now() WHERE id = _user_id;

  INSERT INTO public.balance_transactions(user_id, delta, balance_after, kind, reason, created_by)
  VALUES (_user_id, delta, new_bal, 'admin_' || _mode, _reason, caller);

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'balance_' || _mode, 'user', _user_id::text,
          jsonb_build_object('amount', _amount, 'reason', _reason, 'new_balance', new_bal));

  RETURN new_bal;
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_force_refill(_order_id uuid, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  n int;
  rec public.order_refills;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT count(*) + 1 INTO n FROM public.order_refills WHERE order_id = _order_id;
  INSERT INTO public.order_refills(
    user_id, order_key, order_id, provider_order_id, client_token,
    status, source, admin_id, prev_status, refill_number
  ) VALUES (
    o.user_id, o.id::text, o.id, o.meta->>'order_ref', 'admin:' || gen_random_uuid()::text,
    'requested', 'admin', caller, o.status::text, n
  ) RETURNING * INTO rec;

  UPDATE public.orders
     SET status = 'refilling'::public.order_status,
         updated_at = now()
   WHERE id = o.id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'order_force_refill', 'order', _order_id::text,
          jsonb_build_object('refill_id', rec.id, 'refill_number', n, 'prev_status', o.status::text, 'note', _note));

  RETURN jsonb_build_object(
    'refillId', rec.id,
    'orderId', o.id,
    'refillNumber', n,
    'prevStatus', o.status::text,
    'status', 'refilling',
    'requestedAt', rec.requested_at,
    'serverNow', now()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_order_refills(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  hist jsonb;
  cust_used int;
  last_at timestamptz;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'requestedAt' DESC), '[]'::jsonb) INTO hist
  FROM (
    SELECT jsonb_build_object(
      'refillId', r.id, 'orderId', r.order_id, 'userId', r.user_id,
      'adminId', r.admin_id, 'source', r.source, 'status', r.status,
      'prevStatus', r.prev_status, 'refillNumber', r.refill_number,
      'providerOrderId', r.provider_order_id, 'requestedAt', r.requested_at,
      'completedAt', r.completed_at
    ) AS x
    FROM public.order_refills r
    WHERE r.order_id = _order_id
  ) s;

  SELECT count(*), max(requested_at) INTO cust_used, last_at
    FROM public.order_refills
   WHERE order_id = _order_id AND source = 'customer';

  RETURN jsonb_build_object(
    'history', hist,
    'customerUsed', cust_used,
    'customerMax', 4,
    'customerLastRefillAt', last_at,
    'customerNextRefillAt', CASE WHEN last_at IS NULL THEN NULL ELSE last_at + interval '12 hours' END,
    'serverNow', now()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_refund_order(_order_id uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  res jsonb;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  res := public.refund_order(_order_id, 'admin', caller, _reason);

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'order_refund', 'order', _order_id::text, res);

  RETURN res;
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_set_maintenance(_enabled boolean, _message_ru text, _message_en text, _eta timestamp with time zone)
 RETURNS maintenance_state
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller UUID := auth.uid();
  row public.maintenance_state;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.maintenance_state (singleton, enabled, message_ru, message_en, eta, updated_by, updated_at)
  VALUES (true, _enabled, COALESCE(_message_ru, ''), COALESCE(_message_en, ''), _eta, caller, now())
  ON CONFLICT (singleton) DO UPDATE
     SET enabled = EXCLUDED.enabled,
         message_ru = COALESCE(NULLIF(EXCLUDED.message_ru, ''), public.maintenance_state.message_ru),
         message_en = COALESCE(NULLIF(EXCLUDED.message_en, ''), public.maintenance_state.message_en),
         eta = EXCLUDED.eta,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()
  RETURNING * INTO row;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, CASE WHEN _enabled THEN 'maintenance_on' ELSE 'maintenance_off' END,
          'maintenance', 'state',
          jsonb_build_object('enabled', _enabled, 'message_ru', row.message_ru, 'message_en', row.message_en, 'eta', row.eta));

  RETURN row;
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(_order_id uuid, _status text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  prev text;
  new_meta jsonb;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _status IS NULL OR _status NOT IN ('pending','in_progress','waiting','completed','declined','refunded','failed','refilling') THEN
    RAISE EXCEPTION 'Unknown status';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  prev := o.status::text;
  new_meta := COALESCE(o.meta, '{}'::jsonb);

  IF _status = 'completed' AND NULLIF(new_meta->>'completed_at', '') IS NULL THEN
    new_meta := new_meta || jsonb_build_object('completed_at', (extract(epoch from clock_timestamp()) * 1000)::bigint);
  END IF;

  UPDATE public.orders
     SET status = _status::public.order_status,
         meta = new_meta,
         updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'order_status_override', 'order', _order_id::text,
          jsonb_build_object('from', prev, 'to', o.status::text, 'completed_at', o.meta->>'completed_at'));

  RETURN o;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_target_add(_user_id uuid, _note text)
 RETURNS maintenance_targets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller UUID := auth.uid();
  row public.maintenance_targets;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF _user_id = caller THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;
  IF public.has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'Cannot block an admin';
  END IF;

  -- Ensure mutual exclusivity with whitelist
  DELETE FROM public.maintenance_whitelist WHERE user_id = _user_id;

  INSERT INTO public.maintenance_targets(user_id, note, added_by)
  VALUES (_user_id, NULLIF(_note, ''), caller)
  ON CONFLICT (user_id) DO UPDATE
    SET note = EXCLUDED.note, added_by = EXCLUDED.added_by, added_at = now()
  RETURNING * INTO row;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'maintenance_target_add', 'user', _user_id::text, jsonb_build_object('note', _note));

  RETURN row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_target_remove(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.maintenance_targets WHERE user_id = _user_id;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'maintenance_target_remove', 'user', _user_id::text, '{}'::jsonb);
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_whitelist_add(_user_id uuid, _note text)
 RETURNS maintenance_whitelist
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller UUID := auth.uid();
  row public.maintenance_whitelist;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  -- Ensure mutual exclusivity with individual blocks
  DELETE FROM public.maintenance_targets WHERE user_id = _user_id;

  INSERT INTO public.maintenance_whitelist(user_id, note, added_by)
  VALUES (_user_id, NULLIF(_note, ''), caller)
  ON CONFLICT (user_id) DO UPDATE
    SET note = EXCLUDED.note,
        added_by = EXCLUDED.added_by,
        added_at = now()
  RETURNING * INTO row;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'maintenance_whitelist_add', 'user', _user_id::text,
          jsonb_build_object('note', _note));

  RETURN row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_whitelist_remove(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.maintenance_whitelist WHERE user_id = _user_id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'maintenance_whitelist_remove', 'user', _user_id::text, '{}'::jsonb);

  RETURN true;
END; $function$
;

CREATE OR REPLACE FUNCTION public.bootstrap_admin_if_none()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_count int;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_refill(_order_key text, _refill_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  target uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  o := public.refill_resolve_order(uid, _order_key);
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO target
    FROM public.order_refills
   WHERE order_id = o.id
     AND (_refill_id IS NULL OR id = _refill_id)
     AND status NOT IN ('completed','success','done')
   ORDER BY requested_at DESC
   LIMIT 1;

  IF target IS NOT NULL THEN
    UPDATE public.order_refills
       SET status = 'completed', completed_at = now()
     WHERE id = target;
  ELSE
    -- рефиллов в работе нет — просто закрываем заказ
    UPDATE public.orders
       SET status = 'completed'::public.order_status, updated_at = now()
     WHERE id = o.id AND status = 'refilling'::public.order_status;
  END IF;

  RETURN public.refill_state(o.id::text);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.credit_topup(_topup_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tp public.topups;
  cur numeric;
  new_bal numeric;
BEGIN
  PERFORM set_config('app.allow_balance_write', 'on', true);

  SELECT * INTO tp FROM public.topups WHERE id = _topup_id FOR UPDATE;
  IF tp.id IS NULL THEN
    RAISE EXCEPTION 'topup not found';
  END IF;
  IF tp.status = 'success' THEN
    RETURN (SELECT balance FROM public.profiles WHERE id = tp.user_id);
  END IF;

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = tp.user_id FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  new_bal := cur + tp.amount_usd;

  UPDATE public.profiles SET balance = new_bal, updated_at = now() WHERE id = tp.user_id;

  UPDATE public.topups
     SET status = 'success',
         verifier_state = 'success',
         updated_at = now()
   WHERE id = tp.id;

  INSERT INTO public.balance_transactions(user_id, delta, balance_after, kind, reason, ref_id)
  VALUES (tp.user_id, tp.amount_usd, new_bal, 'topup', concat('topup ', tp.coin, ' ', COALESCE(tp.network,'')), tp.id);

  RETURN new_bal;
END; $function$
;

CREATE OR REPLACE FUNCTION public.ensure_profile()
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  row public.profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.profiles (id) VALUES (uid) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'user') ON CONFLICT DO NOTHING;
  SELECT * INTO row FROM public.profiles WHERE id = uid;
  RETURN row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.follower_accounts_normalize_topics()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure array is non-null
  IF NEW.topic_ids IS NULL THEN
    NEW.topic_ids := '{}';
  END IF;

  -- If array empty but scalar set, seed it
  IF (array_length(NEW.topic_ids, 1) IS NULL) AND NEW.topic_id IS NOT NULL THEN
    NEW.topic_ids := ARRAY[NEW.topic_id];
  END IF;

  -- Deduplicate preserving order
  IF array_length(NEW.topic_ids, 1) IS NOT NULL THEN
    SELECT array_agg(t ORDER BY ord)
      INTO NEW.topic_ids
      FROM (
        SELECT DISTINCT ON (t) t, ord
          FROM unnest(NEW.topic_ids) WITH ORDINALITY AS u(t, ord)
         ORDER BY t, ord
      ) s;
  END IF;

  -- Ensure primary is inside the array; if not, promote first element
  IF NEW.topic_id IS NULL OR NOT (NEW.topic_id = ANY(NEW.topic_ids)) THEN
    IF array_length(NEW.topic_ids, 1) IS NOT NULL THEN
      NEW.topic_id := NEW.topic_ids[1];
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance
     AND COALESCE(current_setting('app.allow_balance_write', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'balance can only be changed by server-side operations';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'ru')
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;

CREATE OR REPLACE FUNCTION public.is_bot_accessible(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Admins always have access
    public.has_role(_user_id, 'admin')
    OR (
      -- Not individually blocked
      NOT EXISTS (SELECT 1 FROM public.maintenance_targets WHERE user_id = _user_id)
      AND (
        -- Global maintenance disabled (default true if row somehow missing)
        COALESCE((SELECT NOT enabled FROM public.maintenance_state WHERE singleton = true), true)
        -- ...or user is in global whitelist
        OR EXISTS (SELECT 1 FROM public.maintenance_whitelist WHERE user_id = _user_id)
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.order_refund_state(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  r public.order_refunds;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> caller AND NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO r FROM public.order_refunds WHERE order_id = _order_id;

  RETURN jsonb_build_object(
    'orderId', o.id,
    'orderStatus', o.status::text,
    'refunded', r.id IS NOT NULL,
    'refundId', r.id,
    'refundSource', r.source,
    'refundStatus', r.status,
    'amount', r.amount_usd,
    'completedAt', r.completed_at,
    'serverNow', now()
  );
END; $function$
;

CREATE OR REPLACE FUNCTION public.orders_auto_refund_on_error()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'failed'::public.order_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND COALESCE(NEW.amount_usd, 0) > 0
     AND NOT EXISTS (SELECT 1 FROM public.order_refunds WHERE order_id = NEW.id) THEN
    PERFORM public.refund_order(NEW.id, 'automatic_error', NULL, 'order failed');
  END IF;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.place_order(_title text, _amount numeric, _qty integer DEFAULT 1, _meta jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  cur numeric;
  new_bal numeric;
  new_order public.orders;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _title IS NULL OR length(btrim(_title)) = 0 THEN RAISE EXCEPTION 'Title required'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  IF _qty IS NULL OR _qty <= 0 OR _qty > 100000 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF NOT public.is_bot_accessible(uid) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = uid FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF cur < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  new_bal := cur - _amount;

  PERFORM set_config('app.allow_balance_write', 'on', true);
  UPDATE public.profiles SET balance = new_bal, updated_at = now() WHERE id = uid;

  INSERT INTO public.orders(user_id, title, qty, amount_usd, status, meta)
  VALUES (uid, left(_title, 300), _qty, _amount, 'pending', COALESCE(_meta, '{}'::jsonb))
  RETURNING * INTO new_order;

  INSERT INTO public.balance_transactions(user_id, delta, balance_after, kind, reason, ref_id)
  VALUES (uid, -_amount, new_bal, 'purchase', left(_title, 300), new_order.id);

  RETURN jsonb_build_object('order_id', new_order.id, 'balance', new_bal, 'created_at', new_order.created_at);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_promo(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  pc public.promo_codes;
  key text := upper(btrim(COALESCE(_code, '')));
  cur numeric;
  new_bal numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF key = '' THEN RAISE EXCEPTION 'Code required'; END IF;

  SELECT * INTO pc FROM public.promo_codes WHERE code = key FOR UPDATE;
  IF pc.code IS NULL OR NOT pc.active THEN RAISE EXCEPTION 'Invalid code'; END IF;
  IF pc.max_redemptions IS NOT NULL AND pc.redeemed_count >= pc.max_redemptions THEN
    RAISE EXCEPTION 'Code exhausted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.promo_redemptions WHERE user_id = uid AND code = key) THEN
    RAISE EXCEPTION 'Already redeemed';
  END IF;

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = uid FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  new_bal := cur + pc.bonus_usd;

  PERFORM set_config('app.allow_balance_write', 'on', true);
  UPDATE public.profiles SET balance = new_bal, updated_at = now() WHERE id = uid;

  INSERT INTO public.promo_redemptions(user_id, code, bonus_usd) VALUES (uid, key, pc.bonus_usd);
  UPDATE public.promo_codes SET redeemed_count = redeemed_count + 1 WHERE code = key;

  INSERT INTO public.balance_transactions(user_id, delta, balance_after, kind, reason)
  VALUES (uid, pc.bonus_usd, new_bal, 'promo', key);

  RETURN jsonb_build_object('bonus', pc.bonus_usd, 'balance', new_bal, 'code', key);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refill_complete_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('completed','success','done')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;

    IF NEW.order_id IS NOT NULL THEN
      UPDATE public.orders o
         SET status = 'completed'::public.order_status,
             -- исходное время завершения не перезаписываем
             meta = CASE
               WHEN COALESCE(o.meta->>'completed_at','') = ''
                 THEN COALESCE(o.meta,'{}'::jsonb)
                      || jsonb_build_object('completed_at', (extract(epoch from now()) * 1000)::bigint)
               ELSE o.meta
             END,
             updated_at = now()
       WHERE o.id = NEW.order_id
         AND o.status IN ('refilling'::public.order_status, 'in_progress'::public.order_status);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refill_resolve_order(_user_id uuid, _order_key text)
 RETURNS orders
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o
  FROM public.orders
  WHERE (id::text = _order_key OR meta->>'local_id' = _order_key)
    AND (
      user_id = _user_id
      OR public.has_role(_user_id, 'admin'::public.app_role)
    )
  LIMIT 1;

  RETURN o;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refill_state(_order_key text, _fallback_completed_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  max_refills int := 4;
  o public.orders;
  ms bigint;
  started timestamptz;
  ends timestamptz;
  used int := 0;
  last_at timestamptz;
  next_at timestamptz;
  eligible boolean := false;
  caller_allowed boolean := false;
  can_request boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);

  IF o.id IS NOT NULL THEN
    caller_allowed := o.user_id = uid OR public.has_role(uid, 'admin'::public.app_role);
    eligible := COALESCE((o.meta->>'refillable')::boolean, false)
            AND COALESCE((o.meta->>'paid')::boolean, false);

    BEGIN
      ms := NULLIF(o.meta->>'completed_at', '')::bigint;
    EXCEPTION WHEN OTHERS THEN
      ms := NULL;
    END;
    IF ms IS NOT NULL THEN
      started := to_timestamp(ms / 1000.0);
      ends := started + interval '48 hours';
    END IF;

    SELECT count(*), max(requested_at) INTO used, last_at
      FROM public.order_refills
     WHERE order_id = o.id
       AND source = 'customer';
  END IF;

  IF last_at IS NOT NULL THEN next_at := last_at + interval '12 hours'; END IF;

  can_request := o.id IS NOT NULL
     AND caller_allowed
     AND o.status IN ('completed'::public.order_status, 'refilling'::public.order_status)
     AND eligible
     AND started IS NOT NULL
     AND now() < ends
     AND used < max_refills
     AND (next_at IS NULL OR now() >= next_at);

  RETURN jsonb_build_object(
    'orderId', COALESCE(o.id::text, _order_key),
    'dbOrderId', o.id,
    'orderStatus', CASE WHEN o.id IS NULL THEN NULL ELSE o.status::text END,
    'paid', CASE WHEN o.id IS NULL THEN false ELSE COALESCE((o.meta->>'paid')::boolean, false) END,
    'refillable', CASE WHEN o.id IS NULL THEN false ELSE COALESCE((o.meta->>'refillable')::boolean, false) END,
    'eligible', eligible,
    'guaranteeStartedAt', started,
    'guaranteeEndsAt', ends,
    'usedRefills', used,
    'maxRefills', max_refills,
    'lastRefillAt', last_at,
    'nextRefillAt', next_at,
    'canRequest', can_request,
    'canRequestRefill', can_request,
    'serverNow', now()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refund_order(_order_id uuid, _source text, _actor uuid DEFAULT NULL::uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders;
  existing public.order_refunds;
  cur numeric;
  new_bal numeric;
  amt numeric;
  rec public.order_refunds;
BEGIN
  IF _source IS NULL OR _source NOT IN ('admin','automatic_error') THEN
    RAISE EXCEPTION 'Unknown refund source';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT * INTO existing FROM public.order_refunds WHERE order_id = _order_id;
  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'refundId', existing.id,
      'orderId', _order_id,
      'userId', existing.user_id,
      'amount', existing.amount_usd,
      'refundSource', existing.source,
      'status', existing.status,
      'alreadyRefunded', true,
      'orderStatus', o.status::text,
      'serverNow', now()
    );
  END IF;

  amt := COALESCE(o.amount_usd, 0);
  IF amt <= 0 THEN
    RAISE EXCEPTION 'Order is not paid';
  END IF;
  IF o.user_id IS NULL THEN
    RAISE EXCEPTION 'Order has no owner';
  END IF;

  PERFORM set_config('app.allow_balance_write', 'on', true);

  -- Профиль может отсутствовать (старые/тестовые пользователи) — создаём его,
  -- иначе автоматический возврат срывал бы смену статуса заказа.
  INSERT INTO public.profiles(id, balance)
  VALUES (o.user_id, 0)
  ON CONFLICT (id) DO NOTHING;

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = o.user_id FOR UPDATE;
  cur := COALESCE(cur, 0);
  new_bal := cur + amt;

  UPDATE public.profiles SET balance = new_bal, updated_at = now() WHERE id = o.user_id;

  INSERT INTO public.balance_transactions(user_id, delta, balance_after, kind, reason, ref_id, created_by)
  VALUES (o.user_id, amt, new_bal, 'refund', COALESCE(_reason, 'refund: ' || _source), o.id, _actor);

  INSERT INTO public.order_refunds(order_id, user_id, amount_usd, source, status, reason, created_by, completed_at)
  VALUES (o.id, o.user_id, amt, _source, 'completed', _reason, _actor, now())
  RETURNING * INTO rec;

  UPDATE public.orders
     SET status = 'refunded'::public.order_status,
         meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('refund_source', _source),
         updated_at = now()
   WHERE id = o.id;

  RETURN jsonb_build_object(
    'refundId', rec.id,
    'orderId', o.id,
    'userId', o.user_id,
    'amount', amt,
    'refundSource', _source,
    'status', rec.status,
    'alreadyRefunded', false,
    'orderStatus', 'refunded',
    'serverNow', now()
  );
END; $function$
;

CREATE OR REPLACE FUNCTION public.request_refill(_order_key text, _client_token text, _fallback_completed_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  ms bigint;
  started timestamptz;
  used int := 0;
  last_at timestamptz;
  existing uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;
  IF _client_token IS NULL OR length(btrim(_client_token)) = 0 THEN RAISE EXCEPTION 'client_token required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT id INTO existing FROM public.order_refills
   WHERE user_id = o.user_id AND order_id = o.id AND client_token = _client_token;
  IF existing IS NOT NULL THEN RETURN public.refill_state(o.id::text); END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(o.user_id::text || ':' || o.id::text, 0));
  SELECT * INTO o FROM public.orders WHERE id = o.id FOR UPDATE;

  IF NOT COALESCE((o.meta->>'paid')::boolean, false) THEN RAISE EXCEPTION 'Order is not paid'; END IF;
  IF NOT COALESCE((o.meta->>'refillable')::boolean, false) THEN RAISE EXCEPTION 'Refill is not included'; END IF;
  IF o.status NOT IN ('completed'::public.order_status, 'refilling'::public.order_status) THEN RAISE EXCEPTION 'Order is not completed yet'; END IF;

  BEGIN
    ms := NULLIF(o.meta->>'completed_at', '')::bigint;
  EXCEPTION WHEN OTHERS THEN
    ms := NULL;
  END;
  IF ms IS NULL THEN RAISE EXCEPTION 'Order completion time is missing'; END IF;
  started := to_timestamp(ms / 1000.0);
  IF now() >= started + interval '48 hours' THEN RAISE EXCEPTION 'Guarantee expired'; END IF;

  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills
   WHERE order_id = o.id AND source = 'customer';
  IF used >= 4 THEN RAISE EXCEPTION 'Refill limit reached'; END IF;
  IF last_at IS NOT NULL AND now() < last_at + interval '12 hours' THEN
    RAISE EXCEPTION 'Refill cooldown active';
  END IF;

  INSERT INTO public.order_refills(user_id, order_key, order_id, provider_order_id, client_token, status, source, prev_status, refill_number)
  VALUES (o.user_id, o.id::text, o.id, o.meta->>'order_ref', _client_token, 'requested', 'customer', o.status::text, used + 1)
  ON CONFLICT (user_id, order_key, client_token) DO NOTHING;

  UPDATE public.orders
     SET status = 'refilling'::public.order_status,
         updated_at = now()
   WHERE id = o.id;

  RETURN public.refill_state(o.id::text);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;


-- ===== TRIGGERS =====

CREATE TRIGGER broadcast_campaigns_uat BEFORE UPDATE ON public.broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER order_refills_complete_order BEFORE INSERT OR UPDATE OF status ON public.order_refills FOR EACH ROW EXECUTE FUNCTION refill_complete_order();
CREATE TRIGGER order_refunds_set_updated_at BEFORE UPDATE ON public.order_refunds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_auto_refund_on_error AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION orders_auto_refund_on_error();
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_guard_balance BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_balance();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER promo_codes_set_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER supplier_apps_updated BEFORE UPDATE ON public.supplier_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER support_threads_uat BEFORE UPDATE ON public.support_threads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER topups_updated BEFORE UPDATE ON public.topups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_boost_status_updated_at BEFORE UPDATE ON public.boost_service_status FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_follower_accounts_normalize_topics BEFORE INSERT OR UPDATE ON public.follower_accounts FOR EACH ROW EXECUTE FUNCTION follower_accounts_normalize_topics();
CREATE TRIGGER trg_follower_accounts_updated BEFORE UPDATE ON public.follower_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
