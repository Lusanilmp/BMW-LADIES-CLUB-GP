/* GET /blog/:slug  → server-rendered metadata for crawlers & link previews.
   Looks up the PUBLISHED post (public anon key, RLS-protected), injects title / description /
   Open Graph / Twitter / canonical / JSON-LD into article.html, and serves it. The page's own
   JavaScript then renders the full article. Falls back to the plain template if lookup fails. */
const fs = require("fs");
const path = require("path");

const DOMAIN = process.env.SITE_URL || "https://bmwladiesclubgp.co.za";
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "";
const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const abs = (u) => (!u ? DOMAIN + "/assets/images/banners/og-default.jpg" : /^https:\/\//i.test(u) ? u : DOMAIN + "/" + u.replace(/^\//, ""));

function template() {
  for (const p of [path.join(process.cwd(), "article.html"), path.join(__dirname, "../../article.html"), path.join(__dirname, "article.html")]) {
    try { return fs.readFileSync(p, "utf8"); } catch (_) {}
  }
  return null;
}

exports.handler = async (event) => {
  let html = template();
  if (!html) return { statusCode: 302, headers: { Location: "/blog.html" }, body: "" };
  const slug = decodeURIComponent((event.queryStringParameters && event.queryStringParameters.slug) || (event.path || "").split("/").filter(Boolean).pop() || "");
  html = html.replace("<head>", '<head>\n<base href="/">');
  let status = 200;
  try {
    if (!SB_URL || !ANON || !/^[a-z0-9-]+$/.test(slug)) throw new Error("not configured / bad slug");
    const r = await fetch(`${SB_URL}/rest/v1/blog_posts?select=title,summary,featured_image_url,published_at,author_name,category&slug=eq.${slug}&status=eq.published&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    const rows = r.ok ? await r.json() : [];
    if (!rows.length) { status = 404; throw new Error("not found"); }
    const p = rows[0], title = `${p.title} | BMW Ladies Club GP`, desc = p.summary || p.title, img = abs(p.featured_image_url), url = `${DOMAIN}/blog/${slug}`;
    const swap = (re, to) => { html = html.replace(re, to); };
    swap(/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`);
    swap(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
    swap(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
    swap(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
    swap(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`);
    swap(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(img)}$2`);
    swap(/(<meta property="og:type" content=")[^"]*(")/, `$1article$2`);
    swap(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
    swap(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
    swap(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(img)}$2`);
    swap(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`);
    const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: desc, image: img, datePublished: p.published_at, author: { "@type": "Organization", name: p.author_name || "BMW Ladies Club GP" }, publisher: { "@type": "Organization", name: "BMW Ladies Club GP" }, mainEntityOfPage: url };
    swap("</head>", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n</head>`);
  } catch (_) { /* serve plain template */ }
  return { statusCode: status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }, body: html };
};
