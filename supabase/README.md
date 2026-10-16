# Supabase setup

## Files (run in this order, in Supabase → SQL Editor)
1. `schema.sql` — tables, constraints, indexes, `is_admin()` helper, `updated_at` triggers. Safe to re-run.
2. `policies.sql` — Row Level Security on every table, public read of *published* content only, admin policies, and the `media` Storage bucket + policies. Safe to re-run.
3. `seed.sql` — confirmed public content only: blog categories, settings (`membership_open`, `tiktok_url`), the October 2026 anniversary event (date TBC + Howler link), the BMW Pad Drive campaign (ends 2026-10-31), two announcement posts, and gallery records for the supplied media (relative `assets/…` paths).

## Tables
`membership_applications`, `profiles`, `admin_roles`, `events`, `event_registrations`, `blog_posts`, `blog_categories`, `gallery_media`, `social_posts`, `charity_campaigns`, `contact_enquiries`, `site_settings`, `integration_sync_logs`.

## Access model
| Who | Can |
|---|---|
| Anonymous visitor | Read published events/posts/gallery/approved social posts/published campaigns/public settings. Insert an event RSVP (insert-only, constrained). **Nothing else** — no reads or writes on applications, enquiries, admin roles, logs. |
| Signed-in non-admin | Same as anonymous. |
| Admin (row in `admin_roles`) | Full management of content; read + update status of applications and enquiries; upload/delete in Storage `media`. |
| Netlify Functions (service role, server-side only) | Insert applications and enquiries (after validation + rate limiting); write sync logs / imported social posts. |

Applications and enquiries intentionally have **no anonymous insert policy** — they go through `netlify/functions/submit-*.js`.

## Provision an administrator
1. Authentication → Users → **Add user** (email + password, auto-confirm).
2. SQL Editor:
   ```sql
   insert into public.admin_roles (user_id)
   select id from auth.users where email = 'ADMIN-EMAIL-HERE';
   ```
   Use `role = 'editor'` for a non-owner if you add that distinction later (column exists; default `admin`).
3. Disable public sign-ups: Authentication → Providers → Email → turn off *Allow new users to sign up*.

## Storage
`policies.sql` creates bucket **`media`** (public read, images + MP4/WebM, size limit set in the file). Only admins can upload/update/delete. Adjust the limit in the `insert into storage.buckets` statement if the club needs larger videos (free-plan projects have a global upload cap).

## Frontend connection
Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in Netlify (or edit `js/config.js`). The anon key is public by design; **never** expose the service-role key in the browser.

## Verified locally
These three files were executed in order against PostgreSQL 16 with stubbed Supabase roles/`auth` schema, and RLS was probed: anonymous and ordinary signed-in users read 0 rows of applications/enquiries; anonymous inserts/updates/deletes and self-granting admin are blocked; an admin can read and approve. The Supabase-hosted behaviour of Auth/Storage itself still needs a live check after you create the project.
