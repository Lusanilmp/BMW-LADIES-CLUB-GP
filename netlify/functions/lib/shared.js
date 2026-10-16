/* Shared helpers for Netlify Functions. Uses the Supabase REST API directly (no dependencies).
   SECRETS come from Netlify environment variables — never from client code:
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IP_HASH_SALT, (optional) ALLOWED_ORIGINS */
const crypto = require("crypto");

const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const CORS_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (statusCode, body) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) });

const configured = () => !!(SB_URL && SB_KEY);

async function sb(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

function clientIp(event) {
  const h = event.headers || {};
  return h["x-nf-client-connection-ip"] || (h["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
}
const hashIp = (ip) => crypto.createHash("sha256").update((process.env.IP_HASH_SALT || "change-me") + "|" + ip).digest("hex");

// Same-site check: Origin (if present) must be the site itself or in ALLOWED_ORIGINS.
function originOk(event) {
  const h = event.headers || {};
  const origin = h.origin || "";
  if (!origin) return true; // non-browser / same-origin navigations; still validated + rate limited
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length) return allowed.includes(origin);
  try { return new URL(origin).host === (h.host || h["x-forwarded-host"]); } catch { return false; }
}

// Count rows from this IP hash in the last `minutes` (rate limiting).
async function recentCount(table, ipHash, minutes) {
  const since = new Date(Date.now() - minutes * 60000).toISOString();
  const res = await sb(`${table}?select=id&ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}`, {
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  const range = res.headers.get("content-range") || "*/0";
  return parseInt(range.split("/")[1] || "0", 10) || 0;
}

function parseBody(event, maxBytes = 20000) {
  if (!event.body) return null;
  if (Buffer.byteLength(event.body, "utf8") > maxBytes) return "TOO_BIG";
  try { return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body); } catch { return null; }
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

module.exports = { json, sb, configured, clientIp, hashIp, originOk, recentCount, parseBody, str, EMAIL_RE, SB_URL, SB_KEY };
