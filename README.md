# BMW Ladies Club GP — Official Website

Built by **Apex Technical Solutions**. Static HTML5 / CSS3 / vanilla JavaScript frontend, **Supabase** (database, auth, storage) and **Netlify** (hosting + serverless functions).

> Independent community website. It does not imply ownership, certification, sponsorship or endorsement by BMW AG.

---

## 1. What is in the box

| Area | Files |
|---|---|
| Pages | `index.html`, `about.html`, `events.html`, `event.html` (event detail), `blog.html`, `article.html` (article detail), `gallery.html`, `community.html`, `join.html`, `contact.html`, `privacy.html`, `admin.html`, `404.html` |
| Styles / core script | `style.css`, `JavaScript.js` (exact file-name casing), `css/admin.css` |
| Page modules | `js/config.js`, `js/supabase-client.js`, `js/fallback-data.js`, `js/membership.js`, `js/events.js`, `js/blog.js`, `js/gallery.js`, `js/community.js`, `js/social-feed.js`, `js/contact.js`, `js/admin.js` |
| Database | `supabase/schema.sql`, `supabase/policies.sql`, `supabase/seed.sql`, `supabase/README.md` |
| Serverless | `netlify/functions/submit-membership.js`, `submit-contact.js`, `sync-social-posts.js` (scheduled), `article.js` (SEO metadata for `/blog/<slug>`), `sitemap.js`, `lib/shared.js` |
| Build / deploy | `netlify.toml`, `scripts/build.js`, `package.json`, `.env.example`, `robots.txt`, `sitemap.xml` |
| Media | `assets/` — see `ASSET_MANIFEST.md` |

### Starter-content mode
Until Supabase is configured the site still works: it shows the club's real uploaded photos/videos and the confirmed content in `js/fallback-data.js`. Forms show a friendly "not configured yet" message instead of pretending to submit.

---

## 2. Deploy in 12 steps

1. **Extract** the ZIP.
2. **Create a Supabase project** (https://supabase.com). Note the *Project URL*, the *anon/publishable key* and the *service-role key* (Settings → API).
3. **Run the SQL in order** in Supabase → SQL Editor: `supabase/schema.sql`, then `supabase/policies.sql`, then `supabase/seed.sql`. (Details: `supabase/README.md`.)
4. **Storage** — `policies.sql` creates the public-read **`media`** bucket (images/video only, size-limited, admin-only upload). Nothing else to do; confirm it exists under Storage.
5. **Create the first administrator**: Authentication → Users → *Add user* (email + password, tick *auto-confirm*). Then run in the SQL Editor:
   ```sql
   insert into public.admin_roles (user_id)
   select id from auth.users where email = 'ADMIN-EMAIL-HERE';
   ```
   Public sign-up can never create admins; only SQL/service-role access can.
6. **Turn off public sign-ups** (Authentication → Providers → Email → disable "Allow new users to sign up") so only invited admins exist.
7. **Push the folder to a Git repo** (or drag-and-drop the folder into Netlify). Netlify reads `netlify.toml`: build command `node scripts/build.js`, publish directory `dist`, functions in `netlify/functions`.
8. **Set environment variables** in Netlify → Site configuration → Environment variables (see `.env.example`):
   - Private (functions only): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `IP_HASH_SALT` (long random string), `SITE_URL`
   - Public (injected into the browser config at build): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, and when the club confirms them `PUBLIC_WHATSAPP_NUMBER`, `PUBLIC_CLUB_EMAIL`, `PUBLIC_CLUB_PHONE`, `PUBLIC_INSTAGRAM_URL`, `PUBLIC_FACEBOOK_URL`
9. **Deploy.** `scripts/build.js` copies only public files into `dist/` (SQL, scripts, `.env.example` are never published) and writes `dist/js/config.js` from your env vars.
10. **Custom domain** — after the club confirms it owns/controls `bmwladiesclubgp.co.za` (or chooses another), add it in Netlify → Domain management and update DNS.
11. **HTTPS** — Netlify provisions a certificate automatically once DNS resolves; enable "Force HTTPS".
12. **Test** (checklist in §8): submit a test application and enquiry, sign in at `/admin`, approve the application, publish a post, upload a gallery image.

### Public configuration (why it is injected at build time)
Vanilla browser JavaScript cannot read Netlify environment variables at runtime. `scripts/build.js` therefore writes the **public** values into `dist/js/config.js` at deploy time. You can instead edit `js/config.js` by hand. **Never** put the service-role key there — the build script refuses to build if it detects one. The WhatsApp number, email, phone and social links can also be changed later in **Admin → Settings** without redeploying.

---

## 3. Running locally
```bash
node scripts/build.js          # creates ./dist
npx serve dist                 # or: python3 -m http.server -d dist 8080
```
Without Supabase keys you get starter-content mode. To test forms/functions locally use the Netlify CLI (`npx netlify dev`) with the env vars set.

---

## 4. Day-to-day: the Admin dashboard (`/admin`)
Sign in with the administrator account. Tabs:

- **Overview** — pending applications, upcoming events, published/draft posts, new enquiries.
- **Membership** — filter by status; **Approve / Reject / Pending**. Applicant data is visible only to signed-in admins.
- **Events** — create/edit, upload a poster, set status, publish/unpublish, add the booking link (e.g. Howler). Events move from *upcoming* to *past* automatically from their dates. **Add the exact date, time and venue of the anniversary here once confirmed.**
- **Event RSVPs** — registrations received through the site.
- **Blog** — drafts, publish/unpublish, featured image upload, categories, delete with confirmation.
- **Gallery** — upload images/videos (JPG/PNG/WebP, MP4/WebM), captions, categories, publish toggle.
- **Social posts** — paste TikTok / Instagram / Facebook post URLs (with optional embed URL, thumbnail, caption); approve imported posts before they go public.
- **Campaigns** — charity campaigns (BMW Pad Drive is pre-loaded, ends 31 Oct 2026 and flips to "Completed" automatically unless you change the end date).
- **Enquiries** — contact-form messages; mark new/read/closed.
- **Settings** — WhatsApp number, email, phone, social links, "membership open" switch.

### Writing blog posts
The body is plain text — raw HTML is never rendered (prevents XSS):
```
First paragraph.

Second paragraph (blank line between paragraphs).

![Alt text for the image](https://…/image.jpg)

@video(https://…/clip.mp4)
```
Images/videos must be `https://` URLs or files uploaded through the dashboard.

### Social media: what is automatic and what is not
- **Always works:** admin-managed social posts, official embeds, manual approval workflow.
- **Scheduled import (`sync-social-posts`, every 6 h):** implemented for the **Instagram API** (`INSTAGRAM_ACCESS_TOKEN`) and **Facebook Page** (`FACEBOOK_PAGE_ID` + `FACEBOOK_PAGE_TOKEN`). It only imports as *pending* for admin approval, ignores duplicates, logs to `integration_sync_logs`, and skips safely when credentials are missing. **It has not been run against live accounts** (no credentials available).
- **TikTok:** the official Display API needs TikTok app review and account authorisation. Until then, paste TikTok URLs in the dashboard. No scraping is used anywhere.

---

## 5. Security summary
- RLS enabled on every table; anonymous visitors can read only published content.
- Membership applications and contact enquiries can **only** be created through Netlify Functions (validation, honeypot, per-IP-hash rate limiting, same-site origin check) and can only be **read** by admins.
- Service-role key exists only in Netlify function environment variables.
- Admin roles cannot be self-granted; `admin.html` is `noindex` and checks the role server-side via RLS (the UI check is only cosmetic).
- User content is rendered with `textContent`/escaping; links are restricted to `https:`/site paths.
- Security headers + a Content-Security-Policy are set in `netlify.toml`.
- Storage bucket: images/video only, size-limited, admin-only upload.

---

## 6. Important content decisions
- **Banking details are NOT published.** The supplied Pad Drive poster contains a bank account; the site uses a cropped copy without it. Add donation details in Admin → Campaigns only after the club confirms they may be public.
- **No invented facts:** no founders, statistics, fees, sponsors or testimonials. Leadership, history, email, phone, WhatsApp and the anniversary date/venue are clearly marked placeholders.
- Follower/like counts from the TikTok screenshot are not shown as live stats.
- Membership does **not** require owning a BMW (not confirmed by the club); the form says so neutrally and FAQs defer to the club where policy is unconfirmed.
- No payment gateway or fees (none confirmed). Event ticketing uses the external Howler link.
- No email is sent on approval/rejection (no email provider configured). The applicant sees an on-screen confirmation only.

---

## 7. Uploaded files: used vs placeholders
See `ASSET_MANIFEST.md` for the full table and how to replace media.

## 8. Testing status
**Verified in this build (local):** all HTML links/asset references resolve; JavaScript syntax; pages render without horizontal overflow or broken images at 390 px and 1280 px (headless Chromium); mobile menu, back-to-top, WhatsApp show/hide, gallery filter, lightbox, contact validation; membership/contact functions against a mock Supabase (valid, invalid, honeypot, wrong origin, hashed IPs); article-metadata function escaping; SQL files executed on PostgreSQL 16 with Supabase role stubs and RLS probed (anonymous cannot read/modify applications, enquiries or admin roles; admin can; ordinary signed-in users cannot).

**Pending — needs your real credentials/accounts:** live Supabase connection from the browser, Storage uploads, admin sign-in, Netlify deploy and function routing in production, scheduled social import, custom domain/HTTPS, Lighthouse scores (not measured — no scores are claimed), real-device testing on iPhone/Android, email notifications (not built).
