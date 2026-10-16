-- ============================================================
-- BMW Ladies Club GP — Row Level Security, grants & Storage   (run SECOND)
-- Principle: least privilege. Everything is private unless a policy
-- below says otherwise. The service-role key (Netlify Functions only)
-- bypasses RLS and is the ONLY way applications/enquiries get inserted.
-- ============================================================

-- ---------- RLS on every table ----------
alter table public.profiles                enable row level security;
alter table public.admin_roles             enable row level security;
alter table public.membership_applications enable row level security;
alter table public.blog_categories         enable row level security;
alter table public.blog_posts              enable row level security;
alter table public.events                  enable row level security;
alter table public.event_registrations     enable row level security;
alter table public.gallery_media           enable row level security;
alter table public.social_posts            enable row level security;
alter table public.charity_campaigns       enable row level security;
alter table public.contact_enquiries       enable row level security;
alter table public.site_settings           enable row level security;
alter table public.integration_sync_logs   enable row level security;

-- ---------- table privileges (RLS still applies on top) ----------
revoke all on all tables in schema public from anon, authenticated;

-- public (anon + signed-in) may READ published content only (rows filtered by policies)
grant select on public.blog_categories, public.blog_posts, public.events, public.gallery_media,
               public.social_posts, public.charity_campaigns, public.site_settings
  to anon, authenticated;
-- anyone may RSVP (insert only — no read-back)
grant insert on public.event_registrations to anon, authenticated;

-- signed-in users: privileges are narrowed to admins by the policies below
grant select, insert, update, delete on public.blog_categories, public.blog_posts, public.events,
     public.event_registrations, public.gallery_media, public.social_posts, public.charity_campaigns,
     public.contact_enquiries, public.site_settings, public.membership_applications to authenticated;
grant select on public.integration_sync_logs, public.admin_roles, public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

-- ---------- public read policies ----------
drop policy if exists "public read categories" on public.blog_categories;
create policy "public read categories" on public.blog_categories for select to anon, authenticated using (true);

drop policy if exists "public read published posts" on public.blog_posts;
create policy "public read published posts" on public.blog_posts for select to anon, authenticated
  using (status = 'published' and (published_at is null or published_at <= now()));

drop policy if exists "public read published events" on public.events;
create policy "public read published events" on public.events for select to anon, authenticated
  using (is_published = true);

drop policy if exists "public read published media" on public.gallery_media;
create policy "public read published media" on public.gallery_media for select to anon, authenticated
  using (is_published = true);

drop policy if exists "public read approved social" on public.social_posts;
create policy "public read approved social" on public.social_posts for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "public read published campaigns" on public.charity_campaigns;
create policy "public read published campaigns" on public.charity_campaigns for select to anon, authenticated
  using (is_published = true);

drop policy if exists "public read public settings" on public.site_settings;
create policy "public read public settings" on public.site_settings for select to anon, authenticated
  using (is_public = true);

-- ---------- RSVP: insert-only, and only for open upcoming events ----------
drop policy if exists "public rsvp insert" on public.event_registrations;
create policy "public rsvp insert" on public.event_registrations for insert to anon, authenticated
  with check (exists (select 1 from public.events e
                      where e.id = event_id and e.is_published and e.allow_rsvp and e.status = 'upcoming'));

-- ---------- admin policies (is_admin() = row exists in admin_roles for auth.uid()) ----------
do $$
declare t text;
begin
  foreach t in array array['blog_categories','blog_posts','events','event_registrations','gallery_media',
                           'social_posts','charity_campaigns','contact_enquiries','site_settings','membership_applications']
  loop
    execute format('drop policy if exists "admin all %1$s" on public.%1$I', t);
    execute format('create policy "admin all %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- NOTE: membership_applications and contact_enquiries have NO anon policies at all.
-- Anonymous visitors can neither read nor write them. Submissions go through the
-- Netlify Functions (service role), which validate, rate-limit and honeypot-check.

-- logs: admins read; inserts only via service role
drop policy if exists "admin read sync logs" on public.integration_sync_logs;
create policy "admin read sync logs" on public.integration_sync_logs for select to authenticated using (public.is_admin());

-- admin_roles: a user may see only their own row; nobody can insert/update/delete via the API
drop policy if exists "read own admin role" on public.admin_roles;
create policy "read own admin role" on public.admin_roles for select to authenticated using (user_id = auth.uid());

-- profiles: users manage their own; admins can read all
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Storage: bucket "media" ----------
-- Public bucket: files are served by URL (no listing for anonymous users).
-- Uploads limited to admins, with MIME + size validation at the bucket level.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'];

drop policy if exists "admin read media objects" on storage.objects;
create policy "admin read media objects" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
