/* GET /sitemap.xml — dynamic sitemap: static pages + published blog posts + published events. */
const DOMAIN = process.env.SITE_URL || "https://bmwladiesclubgp.co.za";
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "";
const PAGES = ["", "about", "events", "blog", "gallery", "community", "join", "contact", "privacy"];

async function rows(q) {
  if (!SB_URL || !ANON) return [];
  try { const r = await fetch(`${SB_URL}/rest/v1/${q}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }); return r.ok ? await r.json() : []; } catch (_) { return []; }
}
exports.handler = async () => {
  const posts = await rows("blog_posts?select=slug,updated_at&status=eq.published&limit=1000");
  const events = await rows("events?select=slug,updated_at&is_published=eq.true&limit=1000");
  const u = (loc, last, pr) => `<url><loc>${loc}</loc>${last ? `<lastmod>${String(last).slice(0, 10)}</lastmod>` : ""}<priority>${pr}</priority></url>`;
  const body = [
    ...PAGES.map((p) => u(`${DOMAIN}/${p}`, null, p === "" ? "1.0" : "0.8")),
    ...posts.map((p) => u(`${DOMAIN}/blog/${p.slug}`, p.updated_at, "0.6")),
    ...events.map((e) => u(`${DOMAIN}/event.html?slug=${e.slug}`.replace("&", "&amp;"), e.updated_at, "0.6")),
  ].join("\n");
  return { statusCode: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }, body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n` };
};
