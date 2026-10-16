-- ============================================================
-- BMW Ladies Club GP — database schema   (run FIRST)
-- Order: 1) schema.sql  2) policies.sql  3) seed.sql (optional)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles & admin roles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Admin roles are provisioned ONLY by someone with SQL/service-role access.
-- There is deliberately no public sign-up path that can insert here.
create table if not exists public.admin_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'admin' check (role in ('admin','editor')),
  granted_at  timestamptz not null default now()
);

-- SECURITY DEFINER so policies can check admin status without exposing admin_roles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles r where r.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- 1. membership_applications ----------
create table if not exists public.membership_applications (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and char_length(email) <= 160),
  phone         text not null check (char_length(phone) between 9 and 24),
  province      text not null check (char_length(province) <= 40),
  city          text not null check (char_length(city) between 2 and 80),
  bmw_model     text check (bmw_model is null or char_length(bmw_model) <= 80),
  vehicle_year  integer check (vehicle_year is null or vehicle_year between 1975 and 2100),
  reason        text not null check (char_length(reason) between 20 and 1200),
  heard_about   text check (heard_about is null or char_length(heard_about) <= 60),
  consent       boolean not null check (consent = true),
  consent_at    timestamptz not null default now(),
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  ip_hash       text,                       -- salted hash, for rate limiting only
  created_at    timestamptz not null default now()
);
create index if not exists idx_membership_status on public.membership_applications (status, created_at desc);
create index if not exists idx_membership_ip on public.membership_applications (ip_hash, created_at);
create index if not exists idx_membership_email on public.membership_applications (lower(email));

-- ---------- 2. blog_categories & 3. blog_posts ----------
create table if not exists public.blog_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  sort_order  integer not null default 0
);

create table if not exists public.blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title               text not null check (char_length(title) between 3 and 200),
  summary             text check (summary is null or char_length(summary) <= 500),
  body                text,
  category            text references public.blog_categories(name) on update cascade on delete set null,
  author_name         text default 'BMW Ladies Club GP',
  featured_image_url  text check (featured_image_url is null or featured_image_url ~* '^(https://|assets/)'),
  status              text not null default 'draft' check (status in ('draft','published')),
  published_at        timestamptz,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_posts_pub on public.blog_posts (status, published_at desc);
drop trigger if exists trg_posts_updated on public.blog_posts;
create trigger trg_posts_updated before update on public.blog_posts for each row execute function public.set_updated_at();

-- ---------- 4. events & 5. event_registrations ----------
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title               text not null check (char_length(title) between 3 and 200),
  category            text,
  description         text,
  start_at            timestamptz,
  end_at              timestamptz,
  date_label          text check (date_label is null or char_length(date_label) <= 120),
  venue               text,
  location_details    text,
  cover_image_url     text check (cover_image_url is null or cover_image_url ~* '^(https://|assets/)'),
  registration_url    text check (registration_url is null or registration_url ~* '^https://'),
  registration_label  text,
  status              text not null default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  is_published        boolean not null default false,
  allow_rsvp          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at >= start_at)
);
create index if not exists idx_events_pub on public.events (is_published, start_at);
drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events for each row execute function public.set_updated_at();

create table if not exists public.event_registrations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and char_length(email) <= 160),
  phone       text check (phone is null or char_length(phone) <= 30),
  created_at  timestamptz not null default now(),
  unique (event_id, email)
);

-- ---------- 6. gallery_media ----------
create table if not exists public.gallery_media (
  id            uuid primary key default gen_random_uuid(),
  media_type    text not null check (media_type in ('image','video')),
  category      text not null,
  file_url      text not null check (file_url ~* '^(https://|assets/)'),
  poster_url    text check (poster_url is null or poster_url ~* '^(https://|assets/)'),
  caption       text check (caption is null or char_length(caption) <= 200),
  description   text check (description is null or char_length(description) <= 600),
  sort_order    integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_gallery_pub on public.gallery_media (is_published, category, sort_order);

-- ---------- 7. social_posts ----------
create table if not exists public.social_posts (
  id             uuid primary key default gen_random_uuid(),
  platform       text not null check (platform in ('tiktok','instagram','facebook')),
  post_url       text not null check (post_url ~* '^https://'),
  external_id    text,                                  -- platform id for de-duplication (imports)
  caption        text,
  thumbnail_url  text check (thumbnail_url is null or thumbnail_url ~* '^(https://|assets/)'),
  embed_url      text check (embed_url is null or embed_url ~* '^https://'),
  posted_at      timestamptz,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  source         text not null default 'manual' check (source in ('manual','imported')),
  created_at     timestamptz not null default now(),
  unique (post_url)
);
create unique index if not exists uq_social_external on public.social_posts (platform, external_id) where external_id is not null;
create index if not exists idx_social_status on public.social_posts (status, posted_at desc);

-- ---------- 8. charity_campaigns ----------
create table if not exists public.charity_campaigns (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text not null,
  tagline       text,
  description   text,
  start_date    date,
  end_date      date,
  poster_url    text check (poster_url is null or poster_url ~* '^(https://|assets/)'),
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ---------- 9. contact_enquiries ----------
create table if not exists public.contact_enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and char_length(email) <= 160),
  subject     text not null check (char_length(subject) between 3 and 120),
  message     text not null check (char_length(message) between 10 and 3000),
  consent     boolean not null check (consent = true),
  status      text not null default 'new' check (status in ('new','read','closed')),
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_contact_status on public.contact_enquiries (status, created_at desc);
create index if not exists idx_contact_ip on public.contact_enquiries (ip_hash, created_at);

-- ---------- 10. site_settings ----------
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,   -- stored as {"v": <value>}
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_settings_updated on public.site_settings;
create trigger trg_settings_updated before update on public.site_settings for each row execute function public.set_updated_at();

-- ---------- 11. integration_sync_logs ----------
create table if not exists public.integration_sync_logs (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,
  status          text not null check (status in ('ok','skipped','error')),
  message         text,
  items_imported  integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_sync_logs_created on public.integration_sync_logs (created_at desc);
