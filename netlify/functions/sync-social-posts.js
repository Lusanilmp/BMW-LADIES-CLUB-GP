/* Scheduled function (see netlify.toml): imports NEW posts from OFFICIALLY AUTHORISED APIs
   into social_posts with status = 'pending' so an administrator approves them before they appear.
   - No scraping. Platforms without configured credentials are logged as "skipped".
   - Duplicates are ignored (unique post_url / platform+external_id).
   - Rate limits / API errors are logged, never thrown.
   Env: INSTAGRAM_ACCESS_TOKEN (Instagram API with Instagram Login, long-lived token)
        FACEBOOK_PAGE_ID + FACEBOOK_PAGE_TOKEN (Facebook Page access token)
   TikTok: the Display API requires TikTok app review + user authorisation; until you have that,
   add TikTok posts manually in Admin → Social posts (official embeds work without any API). */
const { sb, configured } = require("./lib/shared");

async function log(platform, status, message, n = 0) {
  try { await sb("integration_sync_logs", { method: "POST", headers: { Prefer: "return=minimal" }, body: { platform, status, message: String(message).slice(0, 300), items_imported: n } }); } catch (_) {}
}
async function save(rows) {
  if (!rows.length) return 0;
  const res = await sb("social_posts?on_conflict=post_url", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: rows });
  if (!res.ok) throw new Error("save failed " + res.status);
  return (await res.json()).length;
}
async function getJson(url) {
  const r = await fetch(url);
  if (r.status === 429) throw new Error("rate limited (429)");
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

async function instagram() {
  const t = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!t) return log("instagram", "skipped", "INSTAGRAM_ACCESS_TOKEN not set");
  try {
    const j = await getJson(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=10&access_token=${encodeURIComponent(t)}`);
    const rows = (j.data || []).filter((m) => m.permalink).map((m) => ({
      platform: "instagram", post_url: m.permalink, external_id: m.id, caption: m.caption || null,
      thumbnail_url: m.media_type === "VIDEO" ? m.thumbnail_url || null : m.media_url || null,
      posted_at: m.timestamp, status: "pending", source: "imported",
    }));
    await log("instagram", "ok", "checked " + rows.length + " recent posts", await save(rows));
  } catch (e) { await log("instagram", "error", e.message); }
}
async function facebook() {
  const id = process.env.FACEBOOK_PAGE_ID, t = process.env.FACEBOOK_PAGE_TOKEN;
  if (!id || !t) return log("facebook", "skipped", "FACEBOOK_PAGE_ID / FACEBOOK_PAGE_TOKEN not set");
  try {
    const j = await getJson(`https://graph.facebook.com/v19.0/${encodeURIComponent(id)}/posts?fields=id,message,permalink_url,full_picture,created_time&limit=10&access_token=${encodeURIComponent(t)}`);
    const rows = (j.data || []).filter((p) => p.permalink_url).map((p) => ({
      platform: "facebook", post_url: p.permalink_url, external_id: p.id, caption: p.message || null,
      thumbnail_url: p.full_picture || null, posted_at: p.created_time, status: "pending", source: "imported",
    }));
    await log("facebook", "ok", "checked " + rows.length + " recent posts", await save(rows));
  } catch (e) { await log("facebook", "error", e.message); }
}

exports.handler = async () => {
  if (!configured()) { console.log("Supabase not configured — sync skipped."); return { statusCode: 200, body: "skipped" }; }
  await instagram(); await facebook();
  await log("tiktok", "skipped", "No approved TikTok API access configured — add posts manually in the dashboard");
  return { statusCode: 200, body: "done" };
};
