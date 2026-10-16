/* Admin dashboard. Authentication: Supabase Auth (email + password).
   Authorisation: server-side — every table is protected by Row Level Security that
   checks public.is_admin(). This UI check is a convenience only; it is NOT the security boundary. */
(function () {
  "use strict";
  var BLC = window.BLC, el = BLC.el, db = null;
  var $ = function (id) { return document.getElementById(id); };

  var BLOG_CATS = ["Latest News", "Club Drives", "Sisterhood Stories", "Community Impact", "Charity Projects", "Upcoming Events", "BMW Lifestyle", "Announcements", "Mentorship"];
  var EVENT_CATS = ["Club drives", "BMW convoys", "Club meetups", "Anniversary celebrations", "Social gatherings", "Charity campaigns", "Mentorship events", "Community outreach"];
  var GALLERY_CATS = ["BMW Convoys", "Members and Sisterhood", "Club Gatherings", "Special Events", "Community Projects", "BMW Photoshoots", "Behind the Scenes", "Drive Videos"];
  var IMG = ["image/jpeg", "image/png", "image/webp"], VID = ["video/mp4", "video/webm"];
  var MAX_IMG = 8 * 1024 * 1024, MAX_VID = 50 * 1024 * 1024;

  /* ---- entity schemas (drive list + form) ---- */
  var E = {
    applications: { table: "membership_applications", label: "Membership applications", order: ["created_at", false], readonly: true, cols: ["created_at", "full_name", "email", "phone", "city", "province", "bmw_model", "status"], statusActions: ["approved", "rejected", "pending"], detail: ["reason", "heard_about", "vehicle_year"] },
    events: { table: "events", label: "Events", order: ["start_at", false], cols: ["title", "category", "start_at", "status", "is_published"], titleKey: "title",
      fields: [["title", "text", true], ["slug", "text", false, "Leave blank to auto-generate"], ["category", "select", false, EVENT_CATS], ["description", "textarea"], ["start_at", "datetime"], ["end_at", "datetime"], ["date_label", "text", false, "Shown when no exact date, e.g. 'October 2026'"], ["venue", "text"], ["location_details", "text"], ["cover_image_url", "file", false, IMG, "events"], ["registration_url", "url", false, "Third-party ticket link (e.g. Howler)"], ["registration_label", "text"], ["status", "select", false, ["upcoming", "completed", "cancelled"]], ["allow_rsvp", "check", false, "Allow RSVPs on this site"], ["is_published", "check", false, "Published (visible to the public)"]] },
    posts: { table: "blog_posts", label: "Blog posts", order: ["created_at", false], cols: ["title", "category", "status", "published_at"], titleKey: "title",
      fields: [["title", "text", true], ["slug", "text", false, "Leave blank to auto-generate"], ["category", "select", false, BLOG_CATS], ["summary", "textarea"], ["body", "textarea", false, "Blank line = new paragraph. Image: ![alt](https://…)  Video: @video(https://…)"], ["featured_image_url", "file", false, IMG, "blog"], ["author_name", "text"], ["status", "select", false, ["draft", "published"]], ["published_at", "datetime"]] },
    gallery: { table: "gallery_media", label: "Gallery", order: ["created_at", false], cols: ["caption", "media_type", "category", "is_published"], titleKey: "caption",
      fields: [["media_type", "select", true, ["image", "video"]], ["category", "select", true, GALLERY_CATS], ["file_url", "file", true, IMG.concat(VID), "gallery"], ["poster_url", "file", false, IMG, "gallery"], ["caption", "text"], ["description", "textarea"], ["sort_order", "number"], ["is_published", "check", false, "Published"]] },
    social: { table: "social_posts", label: "Social posts", order: ["created_at", false], cols: ["platform", "post_url", "status", "source", "posted_at"], titleKey: "post_url",
      fields: [["platform", "select", true, ["tiktok", "instagram", "facebook"]], ["post_url", "url", true, "Original post URL (https)"], ["caption", "textarea"], ["thumbnail_url", "file", false, IMG, "social"], ["embed_url", "url"], ["posted_at", "datetime"], ["status", "select", false, ["pending", "approved", "rejected"]]] },
    campaigns: { table: "charity_campaigns", label: "Campaigns", order: ["end_date", false], cols: ["title", "start_date", "end_date", "is_published"], titleKey: "title",
      fields: [["title", "text", true], ["slug", "text"], ["tagline", "text"], ["description", "textarea"], ["start_date", "date"], ["end_date", "date"], ["poster_url", "file", false, IMG, "charity"], ["is_published", "check", false, "Published"]] },
    enquiries: { table: "contact_enquiries", label: "Enquiries", order: ["created_at", false], readonly: true, cols: ["created_at", "name", "email", "subject", "status"], statusActions: ["new", "read", "closed"], detail: ["message"], deletable: true },
    registrations: { table: "event_registrations", label: "Event RSVPs", order: ["created_at", false], readonly: true, cols: ["created_at", "full_name", "email", "phone", "event_id"] }
  };
  var SETTINGS = [["whatsapp_number", "WhatsApp number (digits, with country code, no +)"], ["club_email", "Official club email"], ["club_phone", "Official club phone"], ["tiktok_url", "TikTok URL"], ["instagram_url", "Instagram URL"], ["facebook_url", "Facebook URL"], ["membership_open", "Membership applications open (true / false)"]];

  function toast(msg, bad) { var s = $("toast"); s.textContent = msg; s.className = "toast show" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(function () { s.className = "toast"; }, 4200); }
  function fmtCell(k, v) {
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (/_at$/.test(k)) return BLC.fmtDate(v, true);
    return String(v);
  }
  function localDT(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

  /* ---- auth ---- */
  function showLogin(msg) { $("app").hidden = true; $("login").hidden = false; $("login-msg").textContent = msg || ""; }
  function enter() {
    db.rpc("is_admin").then(function (r) {
      if (r.error || r.data !== true) { db.auth.signOut(); return showLogin("This account is not authorised as a club administrator."); }
      $("login").hidden = true; $("app").hidden = false; tab("overview");
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    BLC.ready.then(function (client) {
      db = client;
      if (!db) { $("login").hidden = false; $("login-form").hidden = true; $("login-msg").textContent = "Supabase is not configured yet. Add your Supabase URL and anon key to js/config.js (see README), then reload."; return; }
      db.auth.getSession().then(function (s) { if (s.data.session) enter(); else showLogin(); });
    });
    $("login-form").addEventListener("submit", function (e) {
      e.preventDefault(); $("login-msg").textContent = "Signing in…";
      db.auth.signInWithPassword({ email: $("l-email").value.trim(), password: $("l-pass").value }).then(function (r) {
        if (r.error) return ($("login-msg").textContent = "Sign-in failed. Check your email and password.");
        $("l-pass").value = ""; enter();
      });
    });
    $("logout").addEventListener("click", function () { db.auth.signOut().then(function () { showLogin("Signed out."); }); });
    document.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab(b.getAttribute("data-tab")); }); });
  });

  /* ---- tabs ---- */
  function tab(name) {
    document.querySelectorAll("[data-tab]").forEach(function (b) { b.setAttribute("aria-current", String(b.getAttribute("data-tab") === name)); });
    var main = $("panel"); main.innerHTML = ""; main.focus();
    if (name === "overview") return overview(main);
    if (name === "settings") return settings(main);
    list(main, E[name]);
  }

  function overview(main) {
    main.appendChild(el("h2", { text: "Overview" }));
    var grid = el("div", { class: "stats" }); main.appendChild(grid);
    var q = [
      ["Pending applications", db.from("membership_applications").select("id", { count: "exact", head: true }).eq("status", "pending")],
      ["Upcoming events", db.from("events").select("id", { count: "exact", head: true }).eq("status", "upcoming").eq("is_published", true)],
      ["Published posts", db.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published")],
      ["Draft posts", db.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "draft")],
      ["Unpublished media", db.from("gallery_media").select("id", { count: "exact", head: true }).eq("is_published", false)],
      ["Social posts to review", db.from("social_posts").select("id", { count: "exact", head: true }).eq("status", "pending")],
      ["New enquiries", db.from("contact_enquiries").select("id", { count: "exact", head: true }).eq("status", "new")]
    ];
    q.forEach(function (x) {
      var c = el("div", { class: "stat" }, [el("strong", { text: "…" }), el("span", { text: x[0] })]); grid.appendChild(c);
      x[1].then(function (r) { c.firstChild.textContent = r.error ? "!" : String(r.count || 0); });
    });
    main.appendChild(el("h3", { text: "Recently added media", style: "margin-top:28px" }));
    var rm = el("div", { class: "recent" }); main.appendChild(rm);
    db.from("gallery_media").select("caption,file_url,media_type,poster_url").eq("is_published", true).order("created_at", { ascending: false }).limit(6).then(function (r) {
      if (r.error || !r.data.length) return (rm.textContent = "No media yet.");
      r.data.forEach(function (m) { var u = BLC.safeUrl(m.media_type === "video" ? m.poster_url : m.file_url); rm.appendChild(u ? el("img", { src: u, alt: m.caption || "", loading: "lazy" }) : el("span", { class: "tag", text: m.caption || "video" })); });
    });
    var sync = el("p", { class: "muted", text: "Last social sync: checking…" }); main.appendChild(sync);
    db.from("integration_sync_logs").select("*").order("created_at", { ascending: false }).limit(1).then(function (r) { sync.textContent = r.data && r.data[0] ? "Last social sync: " + BLC.fmtDate(r.data[0].created_at, true) + " — " + r.data[0].platform + ": " + r.data[0].status + (r.data[0].message ? " (" + r.data[0].message + ")" : "") : "Last social sync: never (manual publishing works without any API)."; });
  }

  /* ---- generic list ---- */
  function list(main, cfg) {
    var head = el("div", { class: "bar" }, [el("h2", { text: cfg.label })]);
    if (!cfg.readonly) { var nb = el("button", { class: "btn btn--primary btn--sm", type: "button", text: "+ New" }); nb.addEventListener("click", function () { form(main, cfg, null); }); head.appendChild(nb); }
    var filter = null;
    if (cfg.statusActions) {
      filter = el("select", { "aria-label": "Filter by status" }, [el("option", { value: "", text: "All statuses" })].concat(cfg.statusActions.map(function (s) { return el("option", { value: s, text: s }); })));
      filter.addEventListener("change", load); head.appendChild(filter);
    }
    main.appendChild(head);
    var box = el("div", { class: "tablewrap" }); main.appendChild(box);
    function load() {
      box.textContent = "Loading…";
      var q = db.from(cfg.table).select("*").order(cfg.order[0], { ascending: cfg.order[1] }).limit(300);
      if (filter && filter.value) q = q.eq("status", filter.value);
      q.then(function (r) {
        if (r.error) { box.textContent = ""; box.appendChild(el("p", { class: "bad", role: "alert", text: "Could not load: " + r.error.message })); return; }
        if (!r.data.length) { box.textContent = "Nothing here yet."; return; }
        var t = el("table"), tr = el("tr"); cfg.cols.concat(["Actions"]).forEach(function (c) { tr.appendChild(el("th", { scope: "col", text: c.replace(/_/g, " ") })); }); t.appendChild(el("thead", {}, [tr]));
        var tb = el("tbody");
        r.data.forEach(function (row) {
          var tr = el("tr"); cfg.cols.forEach(function (c) { tr.appendChild(el("td", { text: fmtCell(c, row[c]) })); });
          var td = el("td", { class: "acts" });
          if (cfg.detail) { var d = el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Details" }); d.addEventListener("click", function () { alert(cfg.detail.map(function (k) { return k.replace(/_/g, " ") + ": " + (row[k] || "—"); }).join("\n\n")); }); td.appendChild(d); }
          (cfg.statusActions || []).forEach(function (s) {
            if (row.status === s) return;
            var b = el("button", { class: "btn btn--sm " + (s === "approved" ? "btn--primary" : "btn--ghost"), type: "button", text: s === "approved" ? "Approve" : s === "rejected" ? "Reject" : "Mark " + s });
            b.addEventListener("click", function () { db.from(cfg.table).update({ status: s }).eq("id", row.id).then(function (r2) { if (r2.error) toast(r2.error.message, true); else { toast("Updated"); load(); } }); });
            td.appendChild(b);
          });
          if (!cfg.readonly) { var eb = el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Edit" }); eb.addEventListener("click", function () { form(main, cfg, row); }); td.appendChild(eb); }
          if (!cfg.readonly || cfg.deletable) {
            var del = el("button", { class: "btn btn--sm danger", type: "button", text: "Delete" });
            del.addEventListener("click", function () { if (!confirm("Delete this item permanently? This cannot be undone.")) return; db.from(cfg.table).delete().eq("id", row.id).then(function (r2) { if (r2.error) toast(r2.error.message, true); else { toast("Deleted"); load(); } }); });
            td.appendChild(del);
          }
          tr.appendChild(td); tb.appendChild(tr);
        });
        t.appendChild(tb); box.textContent = ""; box.appendChild(t);
      });
    }
    load();
  }

  /* ---- generic form ---- */
  function upload(file, accept, folder) {
    if (accept.indexOf(file.type) < 0) return Promise.reject(new Error("File type not allowed (" + (file.type || "unknown") + ")."));
    var isVid = VID.indexOf(file.type) > -1;
    if (file.size > (isVid ? MAX_VID : MAX_IMG)) return Promise.reject(new Error("File too large (max " + (isVid ? "50" : "8") + " MB)."));
    var ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" }[file.type];
    var path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return db.storage.from("media").upload(path, file, { contentType: file.type, upsert: false }).then(function (r) {
      if (r.error) throw r.error; return db.storage.from("media").getPublicUrl(path).data.publicUrl;
    });
  }
  function form(main, cfg, row) {
    main.innerHTML = "";
    main.appendChild(el("h2", { text: (row ? "Edit " : "New ") + cfg.label.toLowerCase().replace(/s$/, "") }));
    var f = el("form", { class: "form", novalidate: "" }), grid = el("div", { class: "form-grid two" }); f.appendChild(grid);
    var inputs = {};
    cfg.fields.forEach(function (fd, idx) {
      var key = fd[0], type = fd[1], req = fd[2], extra = fd[3], id = "f-" + key, val = row ? row[key] : null;
      var wrap = el("div", { class: "field" + (type === "textarea" || type === "file" ? " full" : "") });
      var label = el("label", { for: id }, [key.replace(/_/g, " ") + (req ? " *" : "")]);
      var inp;
      if (type === "select") { inp = el("select", { id: id }, [el("option", { value: "", text: "— choose —" })].concat(extra.map(function (o) { return el("option", { value: o, text: o }); }))); inp.value = val || (key === "status" ? extra[0] : ""); }
      else if (type === "textarea") { inp = el("textarea", { id: id, rows: key === "body" ? 14 : 4 }); inp.value = val || ""; }
      else if (type === "check") { inp = el("input", { id: id, type: "checkbox" }); inp.checked = row ? !!val : key === "is_published" ? false : false; label = el("label", { for: id, class: "inline" }, [inp, " " + (extra || key)]); }
      else if (type === "file") { inp = el("input", { id: id, type: "text", placeholder: "Upload a file below, or paste an https:// URL", value: val || "" }); }
      else if (type === "datetime") { inp = el("input", { id: id, type: "datetime-local", value: localDT(val) }); }
      else if (type === "date") { inp = el("input", { id: id, type: "date", value: val || "" }); }
      else if (type === "number") { inp = el("input", { id: id, type: "number", value: val == null ? 0 : val }); }
      else { inp = el("input", { id: id, type: type === "url" ? "url" : "text", value: val || "" }); }
      inputs[key] = { el: inp, type: type, req: req };
      if (type !== "check") wrap.appendChild(label); else wrap.appendChild(label);
      if (type !== "check") wrap.appendChild(inp);
      if (type === "file") {
        var fi = el("input", { type: "file", accept: extra.join(","), "aria-label": "Upload file for " + key }); var st = el("span", { class: "muted" });
        fi.addEventListener("change", function () { if (!fi.files[0]) return; st.textContent = "Uploading…"; upload(fi.files[0], extra, fd[4]).then(function (u) { inp.value = u; st.textContent = "Uploaded ✓"; if (key === "file_url" && inputs.media_type) inputs.media_type.el.value = fi.files[0].type.indexOf("video") === 0 ? "video" : "image"; }).catch(function (e) { st.textContent = ""; toast(e.message, true); }); });
        wrap.appendChild(fi); wrap.appendChild(st);
      }
      if (typeof extra === "string" && type !== "check") wrap.appendChild(el("div", { class: "hint", text: extra }));
      grid.appendChild(wrap);
    });
    var bar = el("div", { class: "bar", style: "margin-top:18px" });
    var save = el("button", { class: "btn btn--primary", type: "submit", text: "Save" }), cancel = el("button", { class: "btn btn--ghost", type: "button", text: "Cancel" });
    cancel.addEventListener("click", function () { tab(Object.keys(E).filter(function (k) { return E[k] === cfg; })[0]); });
    bar.appendChild(save); bar.appendChild(cancel); f.appendChild(bar); main.appendChild(f);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var out = {}, miss = null;
      cfg.fields.forEach(function (fd) {
        var i = inputs[fd[0]], v;
        if (i.type === "check") v = i.el.checked;
        else if (i.type === "datetime") v = i.el.value ? new Date(i.el.value).toISOString() : null;
        else if (i.type === "number") v = parseInt(i.el.value || "0", 10) || 0;
        else v = i.el.value.trim() === "" ? null : i.el.value.trim();
        if (i.req && (v === null || v === "")) miss = miss || fd[0];
        if ((i.type === "url" || i.type === "file") && v && !/^https:\/\//i.test(v) && !/^assets\//.test(v)) miss = miss || fd[0] + " (must start with https://)";
        out[fd[0]] = v;
      });
      if (miss) return toast("Please complete: " + miss.replace(/_/g, " "), true);
      if ("slug" in out && !out.slug && out[cfg.titleKey]) out.slug = BLC.slugify(out[cfg.titleKey]) + "-" + Math.random().toString(36).slice(2, 5);
      if (cfg.table === "blog_posts" && out.status === "published" && !out.published_at) out.published_at = new Date().toISOString();
      save.disabled = true;
      var q = row ? db.from(cfg.table).update(out).eq("id", row.id) : db.from(cfg.table).insert(out);
      q.then(function (r) { save.disabled = false; if (r.error) return toast("Save failed: " + r.error.message, true); toast("Saved ✓"); cancel.click(); });
    });
  }

  /* ---- site settings ---- */
  function settings(main) {
    main.appendChild(el("h2", { text: "Website settings" }));
    main.appendChild(el("p", { class: "muted", text: "These public values override js/config.js. Leave a field blank to keep the default." }));
    var f = el("form", { class: "form" }), grid = el("div", { class: "form-grid" }); f.appendChild(grid); main.appendChild(f);
    var ins = {};
    db.from("site_settings").select("key,value").then(function (r) {
      var cur = {}; (r.data || []).forEach(function (x) { cur[x.key] = x.value && typeof x.value === "object" && "v" in x.value ? x.value.v : x.value; });
      SETTINGS.forEach(function (s) { var w = el("div", { class: "field" }); var i = el("input", { id: "s-" + s[0], type: "text", value: cur[s[0]] == null ? "" : String(cur[s[0]]) }); ins[s[0]] = i; w.appendChild(el("label", { for: "s-" + s[0], text: s[1] })); w.appendChild(i); grid.appendChild(w); });
      var b = el("button", { class: "btn btn--primary", type: "submit", text: "Save settings", style: "margin-top:16px" }); f.appendChild(b);
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var rows = SETTINGS.filter(function (s) { return ins[s[0]].value.trim() !== ""; }).map(function (s) { var v = ins[s[0]].value.trim(); if (s[0] === "whatsapp_number") v = v.replace(/\D/g, ""); return { key: s[0], value: { v: v }, is_public: true }; });
      db.from("site_settings").upsert(rows, { onConflict: "key" }).then(function (r) { toast(r.error ? "Save failed: " + r.error.message : "Settings saved ✓", !!r.error); });
    });
  }
})();
