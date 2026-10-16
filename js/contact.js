/* Contact form: validation + submit via Netlify Function (stored in Supabase server-side) */
(function () {
  "use strict";
  var C = window.BLC_CONFIG;
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form"); if (!form) return;
    var status = form.querySelector(".form-status");
    var sp = new URLSearchParams(location.search); if (sp.get("subject")) form.elements.subject.value = sp.get("subject").slice(0, 120);
    function err(i, m) { var f = i.closest(".field") || i.closest(".check"); f.classList.toggle("invalid", !!m); var e = f.querySelector(".err"); if (e) e.textContent = m || ""; i.setAttribute("aria-invalid", m ? "true" : "false"); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var el = form.elements, bad = null;
      var checks = [
        [el.name, el.name.value.trim().length < 2 ? "Please enter your name." : ""],
        [el.email, /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(el.email.value.trim()) ? "" : "Please enter a valid email address."],
        [el.subject, el.subject.value.trim().length < 3 ? "Please add a subject." : ""],
        [el.message, el.message.value.trim().length < 10 ? "Please write a short message (10+ characters)." : ""],
        [el.consent, el.consent.checked ? "" : "Please accept the privacy notice."]
      ];
      checks.forEach(function (c) { err(c[0], c[1]); if (c[1] && !bad) bad = c[0]; });
      if (bad) return bad.focus();
      var btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Sending…"; status.className = "form-status";
      fetch(C.functionsBase + "/submit-contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: el.name.value.trim(), email: el.email.value.trim(), subject: el.subject.value.trim(), message: el.message.value.trim(), consent: true, website: el.website.value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || (r.status === 404 ? "The message service isn't switched on yet." : "Could not send your message.")); }); })
        .then(function () { status.className = "form-status show ok"; status.textContent = "Thank you — your message has been received. The club will get back to you."; form.reset(); })
        .catch(function (er) { status.className = "form-status show bad"; status.textContent = er.message + " Please try again or use WhatsApp."; })
        .then(function () { btn.disabled = false; btn.textContent = "Send message"; });
    });
  });
})();
