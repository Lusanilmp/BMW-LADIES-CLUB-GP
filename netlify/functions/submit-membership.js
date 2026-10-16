/* POST /.netlify/functions/submit-membership
   The ONLY path by which membership applications are created. Public visitors have no
   database access to this table. Validates, honeypot-checks, rate-limits, then inserts
   with the service-role key (server-side). No email is sent by this function. */
const { json, sb, configured, clientIp, hashIp, originOk, recentCount, parseBody, str, EMAIL_RE } = require("./lib/shared");

const PROVINCES = ["Gauteng", "Limpopo", "Mpumalanga", "North West", "Free State", "KwaZulu-Natal", "Eastern Cape", "Western Cape", "Northern Cape"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  if (!originOk(event)) return json(403, { error: "Request not allowed." });
  if (!configured()) return json(503, { error: "The submission service isn't configured yet." });

  const b = parseBody(event);
  if (b === "TOO_BIG") return json(413, { error: "Request too large." });
  if (!b || typeof b !== "object") return json(400, { error: "Invalid request." });

  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (str(b.website, 200)) return json(200, { ok: true });

  const d = {
    full_name: str(b.full_name, 120), email: str(b.email, 160).toLowerCase(), phone: str(b.phone, 24),
    province: str(b.province, 40), city: str(b.city, 80), bmw_model: str(b.bmw_model, 80) || null,
    reason: str(b.reason, 1200), heard_about: str(b.heard_about, 60) || null,
  };
  const yr = str(String(b.vehicle_year || ""), 4);
  const errors = [];
  if (d.full_name.length < 2) errors.push("full name");
  if (!EMAIL_RE.test(d.email)) errors.push("email");
  if (!/^[+\d][\d\s()-]{8,22}$/.test(d.phone)) errors.push("contact number");
  if (!PROVINCES.includes(d.province)) errors.push("province");
  if (d.city.length < 2) errors.push("city or town");
  if (d.reason.length < 20) errors.push("reason (at least 20 characters)");
  if (yr && !(/^\d{4}$/.test(yr) && +yr >= 1975 && +yr <= new Date().getFullYear() + 1)) errors.push("vehicle year");
  if (b.consent !== true) errors.push("privacy consent");
  if (errors.length) return json(400, { error: "Please check: " + errors.join(", ") + "." });

  try {
    // Is membership currently open? (public setting; defaults to open)
    const s = await sb("site_settings?select=value&key=eq.membership_open&limit=1");
    if (s.ok) { const rows = await s.json(); if (rows[0] && rows[0].value && rows[0].value.v === false) return json(403, { error: "Membership applications are currently closed." }); }

    const ipHash = hashIp(clientIp(event));
    if ((await recentCount("membership_applications", ipHash, 60)) >= 5) return json(429, { error: "Too many submissions from your connection. Please try again later." });

    // De-duplicate quietly (don't reveal whether an email already applied).
    const dup = await sb(`membership_applications?select=id&email=eq.${encodeURIComponent(d.email)}&status=in.(pending,approved)&limit=1`);
    if (dup.ok && (await dup.json()).length) return json(200, { ok: true });

    const res = await sb("membership_applications", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: { ...d, vehicle_year: yr ? +yr : null, consent: true, status: "pending", ip_hash: ipHash },
    });
    if (!res.ok) { console.error("insert failed", res.status, await res.text()); return json(502, { error: "We couldn't save your application." }); }
    return json(200, { ok: true });
  } catch (e) {
    console.error(e); return json(500, { error: "Something went wrong." });
  }
};
