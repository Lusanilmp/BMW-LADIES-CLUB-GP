/* POST /.netlify/functions/submit-contact — stores contact-form enquiries (server-side only). */
const { json, sb, configured, clientIp, hashIp, originOk, recentCount, parseBody, str, EMAIL_RE } = require("./lib/shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  if (!originOk(event)) return json(403, { error: "Request not allowed." });
  if (!configured()) return json(503, { error: "The message service isn't configured yet." });

  const b = parseBody(event);
  if (b === "TOO_BIG") return json(413, { error: "Request too large." });
  if (!b || typeof b !== "object") return json(400, { error: "Invalid request." });
  if (str(b.website, 200)) return json(200, { ok: true }); // honeypot

  const d = { name: str(b.name, 120), email: str(b.email, 160).toLowerCase(), subject: str(b.subject, 120), message: str(b.message, 3000) };
  const errors = [];
  if (d.name.length < 2) errors.push("name");
  if (!EMAIL_RE.test(d.email)) errors.push("email");
  if (d.subject.length < 3) errors.push("subject");
  if (d.message.length < 10) errors.push("message");
  if (b.consent !== true) errors.push("privacy consent");
  if (errors.length) return json(400, { error: "Please check: " + errors.join(", ") + "." });

  try {
    const ipHash = hashIp(clientIp(event));
    if ((await recentCount("contact_enquiries", ipHash, 60)) >= 5) return json(429, { error: "Too many messages from your connection. Please try again later." });
    const res = await sb("contact_enquiries", { method: "POST", headers: { Prefer: "return=minimal" }, body: { ...d, consent: true, status: "new", ip_hash: ipHash } });
    if (!res.ok) { console.error("insert failed", res.status, await res.text()); return json(502, { error: "We couldn't save your message." }); }
    return json(200, { ok: true });
  } catch (e) { console.error(e); return json(500, { error: "Something went wrong." }); }
};
