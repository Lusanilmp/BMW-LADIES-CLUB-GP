/* BMW Ladies Club GP — core site behaviour (all public pages).
   Provides shared helpers on window.BLC, then wires: mobile nav, back-to-top,
   WhatsApp links, FAQ accordion, reveal-on-scroll, hero preview video,
   share buttons, lightbox. Page modules live in /js. */
(function () {
  "use strict";
  var C = (window.BLC_CONFIG = window.BLC_CONFIG || {});
  var BLC = (window.BLC = window.BLC || {});
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  BLC.reduceMotion = reduceMotion;
  document.documentElement.classList.add("js");

  /* ---------- helpers ---------- */
  BLC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  // Only allow https:, relative or site-asset URLs (blocks javascript: etc.)
  BLC.safeUrl = function (u) {
    u = String(u || "").trim();
    if (/^https:\/\//i.test(u) || /^(assets\/|\/assets\/|\.\.\/assets\/)/.test(u) || /^\/storage\//.test(u)) return u;
    return "";
  };
  BLC.el = function (tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  };
  BLC.fmtDate = function (iso, withTime) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var o = { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" };
    if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return d.toLocaleString("en-ZA", o);
  };
  BLC.icon = function (name) {
    var paths = {
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
      play: '<polygon points="6 3 20 12 6 21 6 3"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      ext: '<path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
    };
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  };
  BLC.slugify = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); };

  // Render article body text safely (no raw HTML ever):
  //  blank-line separated paragraphs; ![alt](url) image; @video(url) video
  BLC.renderBody = function (text, container) {
    container.textContent = "";
    String(text || "").split(/\n{2,}/).forEach(function (block) {
      block = block.trim(); if (!block) return;
      var im = block.match(/^!\[(.*?)\]\((.+?)\)$/);
      var vd = block.match(/^@video\((.+?)\)$/);
      if (im && BLC.safeUrl(im[2])) {
        container.appendChild(BLC.el("img", { src: BLC.safeUrl(im[2]), alt: im[1], loading: "lazy" }));
      } else if (vd && BLC.safeUrl(vd[1])) {
        container.appendChild(BLC.el("video", { src: BLC.safeUrl(vd[1]), controls: "", playsinline: "", preload: "none", "aria-label": "Club video" }));
      } else {
        var p = BLC.el("p"); var lines = block.split("\n");
        lines.forEach(function (ln, i) { if (i) p.appendChild(document.createElement("br")); p.appendChild(document.createTextNode(ln)); });
        container.appendChild(p);
      }
    });
  };
  BLC.state = function (container, kind, msg) {
    container.innerHTML = "";
    var d = BLC.el("div", { class: kind === "error" ? "error-box" : kind === "loading" ? "loading" : "empty", role: kind === "error" ? "alert" : "status" });
    if (kind === "loading") d.appendChild(BLC.el("div", { class: "spinner" }));
    d.appendChild(document.createTextNode(msg));
    container.appendChild(d);
  };
  // Load rows from Supabase; fall back to starter content when not configured or empty.
  BLC.load = function (build, fallback) {
    return BLC.ready.then(function (db) {
      if (!db) return { rows: fallback, source: "fallback" };
      return build(db).then(function (res) {
        if (res.error) throw res.error;
        return { rows: res.data || [], source: "supabase" };   // live DB: empty means empty (shows empty state)
      });
    });
  };
  BLC.isUpcoming = function (ev) {
    if (ev.status === "completed" || ev.status === "cancelled") return false;
    var end = ev.end_at || ev.start_at;
    if (!end) return true;                      // date still to be confirmed
    var t = new Date(end).getTime();
    return isNaN(t) ? true : t >= Date.now() - 6 * 3600 * 1000;
  };
  BLC.campaignState = function (c) {
    if (!c.end_date) return "active";
    var end = new Date(c.end_date + "T23:59:59+02:00").getTime();
    return Date.now() > end ? "completed" : "active";
  };

  /* ---------- settings + contact links ---------- */
  function digits(n) { return String(n || "").replace(/\D/g, ""); }
  var WA_MSG = {
    chat: "Hello BMW Ladies Club GP. I visited your website and would like more information.",
    general: "Hello BMW Ladies Club GP. I visited your website and would like more information about joining the club.",
    membership: "Hello BMW Ladies Club GP. I would like to ask about membership.",
    events: "Hello BMW Ladies Club GP. I would like to enquire about your events.",
    contact: "Hello BMW Ladies Club GP. I would like to contact the club.",
    question: "Hello BMW Ladies Club GP. I have a question.",
    charity: "Hello BMW Ladies Club GP. I would like to know how I can support your charity projects.",
    admins: "Hello BMW Ladies Club GP. I would like to speak to a club administrator."
  };
  BLC.waLink = function (key, custom) {
    var n = digits(C.whatsappNumber);
    if (!n) return "";
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(custom || WA_MSG[key] || WA_MSG.general);
  };
  BLC.applyContactLinks = function () {
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      var href = BLC.waLink(a.getAttribute("data-wa"), a.getAttribute("data-wa-text"));
      if (href) {
        a.setAttribute("href", href); a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer");
        a.removeAttribute("aria-disabled"); a.removeAttribute("title"); a.hidden = false;
      } else if (a.classList.contains("wa-float")) {
        a.hidden = true;
      } else {
        a.setAttribute("href", "contact.html#contact-form");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("title", "WhatsApp is not available yet — use the contact form");
        a.removeAttribute("target");
      }
    });
    document.querySelectorAll("[data-social]").forEach(function (a) {
      var url = C[a.getAttribute("data-social") + "Url"];
      if (url) { a.href = url; a.hidden = false; } else if (a.hasAttribute("data-hide-empty")) { a.hidden = true; } else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.hidden = true; }
    });
    document.querySelectorAll("[data-email]").forEach(function (a) {
      if (C.clubEmail) { a.href = "mailto:" + C.clubEmail; a.textContent = C.clubEmail; } else { a.textContent = "Email address coming soon"; a.removeAttribute("href"); }
    });
    document.querySelectorAll("[data-phone]").forEach(function (a) {
      if (C.clubPhone) { a.href = "tel:" + digits(C.clubPhone); a.textContent = C.clubPhone; } else { a.textContent = "Phone number coming soon"; a.removeAttribute("href"); }
    });
    document.querySelectorAll("[data-membership-closed]").forEach(function (n) { n.hidden = C.membershipOpen !== false; });
  };
  // Public settings from Supabase override config.js (admin can edit without code)
  BLC.settingsReady = BLC.ready.then(function (db) {
    if (!db) return;
    return db.from("site_settings").select("key,value").eq("is_public", true).then(function (r) {
      if (r.error || !r.data) return;
      var map = { whatsapp_number: "whatsappNumber", club_email: "clubEmail", club_phone: "clubPhone", instagram_url: "instagramUrl", facebook_url: "facebookUrl", tiktok_url: "tiktokUrl", membership_open: "membershipOpen" };
      r.data.forEach(function (row) {
        if (!map[row.key]) return;
        var v = row.value;
        if (v && typeof v === "object" && "v" in v) v = v.v;
        if (map[row.key] === "membershipOpen") v = v === true || v === "true";
        if (v !== "" && v != null) C[map[row.key]] = v;
      });
    }).catch(function () {});
  }).catch(function () {}).then(BLC.applyContactLinks);

  document.addEventListener("DOMContentLoaded", function () {
    BLC.applyContactLinks();

    /* year */
    document.querySelectorAll("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

    /* mobile nav */
    var toggle = document.querySelector(".nav-toggle"), nav = document.getElementById("primary-nav");
    if (toggle && nav) {
      var setNav = function (open) {
        nav.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        document.body.style.overflow = open ? "hidden" : "";
      };
      toggle.addEventListener("click", function () { setNav(!nav.classList.contains("open")); });
      nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setNav(false); toggle.focus(); } });
      window.matchMedia("(min-width: 1060px)").addEventListener("change", function (m) { if (m.matches) setNav(false); });
    }

    /* back to top */
    var top = document.querySelector(".to-top");
    if (top) {
      var onScroll = function () { top.classList.toggle("show", window.scrollY > 600); };
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
      top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
    }

    /* smooth in-page anchors (CSS handles motion preference) */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1); var t = id && document.getElementById(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); history.replaceState(null, "", "#" + id); t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
      });
    });

    /* FAQ accordion */
    document.querySelectorAll(".faq-q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        document.getElementById(btn.getAttribute("aria-controls")).hidden = open;
      });
      btn.addEventListener("keydown", function (e) {
        var all = Array.prototype.slice.call(document.querySelectorAll(".faq-q")), i = all.indexOf(btn);
        if (e.key === "ArrowDown") { e.preventDefault(); all[(i + 1) % all.length].focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
        if (e.key === "Home") { e.preventDefault(); all[0].focus(); }
        if (e.key === "End") { e.preventDefault(); all[all.length - 1].focus(); }
      });
    });

    /* reveal on scroll */
    var rv = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !reduceMotion) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
      rv.forEach(function (n) { io.observe(n); });
    } else { rv.forEach(function (n) { n.classList.add("in"); }); }

    /* optional hero preview video: muted, inline, never audio; skipped for reduced motion / data saver */
    var pv = document.querySelector("video[data-preview]");
    if (pv) {
      var saver = navigator.connection && navigator.connection.saveData;
      if (reduceMotion || saver) { pv.removeAttribute("autoplay"); pv.controls = true; }
      else {
        pv.muted = true;
        var p = pv.play(); if (p && p.catch) p.catch(function () { pv.controls = true; });
      }
    }

    /* pause other videos when one plays */
    document.addEventListener("play", function (e) {
      if (e.target.tagName !== "VIDEO" || e.target.hasAttribute("data-preview")) return;
      document.querySelectorAll("video").forEach(function (v) { if (v !== e.target && !v.hasAttribute("data-preview")) v.pause(); });
    }, true);

    /* share buttons */
    document.querySelectorAll("[data-share]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        var kind = b.getAttribute("data-share"), url = location.href, title = document.title;
        if (kind === "native" && navigator.share) { e.preventDefault(); navigator.share({ title: title, url: url }).catch(function () {}); return; }
        if (kind === "copy") {
          e.preventDefault();
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = "Link copied ✓"; }).catch(function () { window.prompt("Copy this link:", url); });
        }
      });
    });
    BLC.wireShareLinks = function () {
      var url = encodeURIComponent(location.href), t = encodeURIComponent(document.title);
      var map = { whatsapp: "https://wa.me/?text=" + t + "%20" + url, facebook: "https://www.facebook.com/sharer/sharer.php?u=" + url, x: "https://twitter.com/intent/tweet?text=" + t + "&url=" + url };
      document.querySelectorAll("[data-share-link]").forEach(function (a) { a.href = map[a.getAttribute("data-share-link")] || "#"; a.target = "_blank"; a.rel = "noopener noreferrer"; });
    };
    BLC.wireShareLinks();
  });

  /* ---------- lightbox (used by gallery + home) ---------- */
  var lb = null, lbItems = [], lbIndex = 0, lastFocus = null;
  function ensureLb() {
    if (lb) return lb;
    lb = BLC.el("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Media viewer" });
    lb.innerHTML =
      '<button class="lb-btn lb-close" aria-label="Close viewer"><svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous"><svg class="icon" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<button class="lb-btn lb-next" aria-label="Next"><svg class="icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<div class="lightbox__stage"></div><p class="lightbox__cap" aria-live="polite"></p>';
    document.body.appendChild(lb);
    lb.querySelector(".lb-close").addEventListener("click", BLC.closeLightbox);
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(lbIndex - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(lbIndex + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) BLC.closeLightbox(); });
    var sx = null;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(lbIndex + (dx < 0 ? 1 : -1)); sx = null; });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") BLC.closeLightbox();
      else if (e.key === "ArrowRight") show(lbIndex + 1);
      else if (e.key === "ArrowLeft") show(lbIndex - 1);
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button:not([hidden]), video"); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return lb;
  }
  function show(i) {
    if (!lbItems.length) return;
    lbIndex = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIndex], stage = lb.querySelector(".lightbox__stage");
    stage.textContent = "";
    var src = BLC.safeUrl(it.src);
    if (it.type === "video") stage.appendChild(BLC.el("video", { src: src, poster: BLC.safeUrl(it.poster) || false, controls: "", autoplay: "", playsinline: "", "aria-label": it.caption || "Video" }));
    else stage.appendChild(BLC.el("img", { src: src, alt: it.caption || "" }));
    lb.querySelector(".lightbox__cap").textContent = [it.caption, it.description].filter(Boolean).join(" — ");
    var many = lbItems.length > 1;
    lb.querySelector(".lb-prev").hidden = !many; lb.querySelector(".lb-next").hidden = !many;
  }
  BLC.openLightbox = function (items, index) {
    ensureLb(); lbItems = items; lastFocus = document.activeElement;
    lb.classList.add("open"); document.body.style.overflow = "hidden"; show(index || 0);
    lb.querySelector(".lb-close").focus();
  };
  BLC.closeLightbox = function () {
    if (!lb) return;
    lb.classList.remove("open"); lb.querySelector(".lightbox__stage").textContent = "";
    document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
})();
