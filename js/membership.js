/* Membership application: 3-step form, client validation, secure submit via Netlify Function.
   The browser NEVER writes to the applications table directly. */
(function () {
  "use strict";
  var BLC = window.BLC, C = window.BLC_CONFIG;
  var PROVINCES = ["Gauteng", "Limpopo", "Mpumalanga", "North West", "Free State", "KwaZulu-Natal", "Eastern Cape", "Western Cape", "Northern Cape"];

  function fieldOf(input) { return input.closest(".field") || input.closest(".check"); }
  function setErr(input, msg) {
    var f = fieldOf(input); if (!f) return;
    f.classList.toggle("invalid", !!msg);
    var e = f.querySelector(".err"); if (e) e.textContent = msg || "";
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  var RULES = {
    full_name: function (v) { return v.trim().length < 2 ? "Please enter your full name." : ""; },
    email: function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address."; },
    phone: function (v) { return /^[+\d][\d\s()-]{8,18}$/.test(v.trim()) ? "" : "Please enter a valid contact number."; },
    province: function (v) { return v ? "" : "Please choose your province."; },
    city: function (v) { return v.trim().length < 2 ? "Please enter your city or town." : ""; },
    reason: function (v) { return v.trim().length < 20 ? "Tell us a little more (at least 20 characters)." : ""; },
    consent: function (v, i) { return i.checked ? "" : "Please accept the privacy notice to continue."; },
    vehicle_year: function (v) { return !v || (/^\d{4}$/.test(v) && +v >= 1975 && +v <= new Date().getFullYear() + 1) ? "" : "Enter a 4-digit year or leave blank."; }
  };
  function validate(form, names) {
    var first = null;
    names.forEach(function (n) {
      var i = form.elements[n]; if (!i) return;
      var msg = RULES[n] ? RULES[n](i.type === "checkbox" ? "" : i.value, i) : "";
      setErr(i, msg); if (msg && !first) first = i;
    });
    if (first) first.focus();
    return !first;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("join-form"); if (!form) return;
    var status = form.querySelector(".form-status");
    var prov = form.elements.province; PROVINCES.forEach(function (p) { var o = document.createElement("option"); o.value = o.textContent = p; prov.appendChild(o); });
    prov.value = "Gauteng";

    BLC.settingsReady.then(function () {
      if (C.membershipOpen === false) { form.hidden = true; var n = document.getElementById("membership-closed"); if (n) n.hidden = false; }
    });

    var steps = Array.prototype.slice.call(form.querySelectorAll("[data-step]")), bar = form.querySelectorAll(".steps li"), cur = 0;
    var groups = [["full_name", "email", "phone"], ["province", "city", "vehicle_year"], ["reason", "consent"]];
    function go(n, focus) {
      cur = n;
      steps.forEach(function (s, i) { s.hidden = i !== n; });
      bar.forEach(function (b, i) { b.classList.toggle("on", i <= n); });
      var h = steps[n].querySelector("h2,h3"); if (h && focus !== false) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: false }); }
    }
    form.querySelectorAll("[data-next]").forEach(function (b) { b.addEventListener("click", function () { if (validate(form, groups[cur])) go(cur + 1); }); });
    form.querySelectorAll("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { go(cur - 1); }); });
    go(0, false);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form, groups[2])) return;
      var btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Submitting…";
      status.className = "form-status";
      var data = {};
      ["full_name", "email", "phone", "province", "city", "bmw_model", "vehicle_year", "reason", "heard_about", "website"].forEach(function (k) { if (form.elements[k]) data[k] = form.elements[k].value.trim(); });
      data.consent = true;
      fetch(C.functionsBase + "/submit-membership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j, code: r.status }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j.error || (res.code === 404 ? "The submission service isn't switched on yet." : "Submission failed."));
          form.hidden = true; var ok = document.getElementById("join-success"); ok.hidden = false; ok.focus();
        })
        .catch(function (err) {
          status.className = "form-status show bad"; status.textContent = err.message + " Please try again, or contact the club directly.";
          btn.disabled = false; btn.textContent = "Submit application";
        });
    });
  });
})();
