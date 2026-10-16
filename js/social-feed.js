/* Social feed: admin-approved TikTok / Instagram / Facebook posts with official embeds on demand.
   Works with no API credentials (manual posts from the dashboard). No scraping. */
(function () {
  "use strict";
  var BLC = window.BLC, el = BLC.el, C = window.BLC_CONFIG;
  var HOSTS = { tiktok: /^https:\/\/(www\.|vm\.)?tiktok\.com\//i, instagram: /^https:\/\/(www\.)?instagram\.com\//i, facebook: /^https:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//i };
  var NAMES = { tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" };

  function embed(p, holder) {
    var url = p.post_url;
    if (p.platform === "tiktok") {
      var id = (url.match(/\/video\/(\d+)/) || [])[1];
      if (!id) { window.open(url, "_blank", "noopener"); return; }
      holder.innerHTML = '<blockquote class="tiktok-embed" cite="' + BLC.esc(url) + '" data-video-id="' + BLC.esc(id) + '" style="max-width:605px;min-width:240px"><section></section></blockquote>';
      var s = document.createElement("script"); s.async = true; s.src = "https://www.tiktok.com/embed.js"; document.body.appendChild(s);
    } else {
      var src = p.platform === "instagram" ? url.replace(/\/?(\?.*)?$/, "/embed") : "https://www.facebook.com/plugins/post.php?href=" + encodeURIComponent(url) + "&show_text=true&width=500";
      holder.appendChild(el("iframe", { src: src, title: NAMES[p.platform] + " post", loading: "lazy", allowfullscreen: "", style: "width:100%;min-height:480px;border:0" }));
    }
  }
  function card(p) {
    var c = el("article", { class: "card" });
    var m = el("div", { class: "card__media", style: "aspect-ratio:1/1" });
    var t = BLC.safeUrl(p.thumbnail_url); m.appendChild(t ? el("img", { src: t, alt: "", loading: "lazy", width: 540, height: 540 }) : el("div", { class: "ph" }, [el("div", {}, [el("strong", { text: NAMES[p.platform] || "Social" })])]));
    c.appendChild(m);
    var b = el("div", { class: "card__body" });
    b.appendChild(el("div", {}, [el("span", { class: "tag tag--pink", text: NAMES[p.platform] || "Social" })]));
    if (p.caption) b.appendChild(el("p", { text: p.caption.length > 140 ? p.caption.slice(0, 137) + "…" : p.caption }));
    if (p.posted_at) b.appendChild(el("div", { class: "card__meta", text: BLC.fmtDate(p.posted_at) + " · Source: " + NAMES[p.platform] }));
    var holder = el("div", { class: "embed-holder" });
    var act = el("div", { class: "card__actions" });
    var eb = el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Show post here" });
    eb.addEventListener("click", function () { embed(p, holder); eb.hidden = true; });
    act.appendChild(eb);
    act.appendChild(el("a", { class: "btn btn--primary btn--sm", href: p.post_url, target: "_blank", rel: "noopener noreferrer", text: "View on " + (NAMES[p.platform] || "source") }));
    b.appendChild(act); b.appendChild(holder); c.appendChild(b); return c;
  }
  function profileCard() {
    var c = el("article", { class: "card" });
    var b = el("div", { class: "card__body", style: "justify-content:center;text-align:center;padding:36px 24px" });
    b.appendChild(el("h3", { text: "Follow @bmw.ladies.club.gp" }));
    b.appendChild(el("p", { text: "Convoys, meet-ups, sisterhood and charity moments — first on TikTok." }));
    b.appendChild(el("div", { class: "card__actions", style: "justify-content:center" }, [el("a", { class: "btn btn--primary", href: C.tiktokUrl, target: "_blank", rel: "noopener noreferrer", text: "Open TikTok" })]));
    c.appendChild(b); return c;
  }
  document.addEventListener("DOMContentLoaded", function () {
    var box = document.getElementById("social-feed"); if (!box) return;
    var limit = parseInt(box.getAttribute("data-limit") || "6", 10);
    BLC.state(box, "loading", "Loading latest posts…");
    BLC.ready.then(function (db) {
      if (!db) return [];
      return db.from("social_posts").select("*").eq("status", "approved").order("posted_at", { ascending: false }).limit(limit).then(function (r) { if (r.error) throw r.error; return r.data || []; });
    }).then(function (rows) {
      rows = rows.filter(function (p) { return HOSTS[p.platform] && HOSTS[p.platform].test(p.post_url || ""); });
      box.innerHTML = "";
      rows.forEach(function (p) { box.appendChild(card(p)); });
      box.appendChild(profileCard());
    }).catch(function (e) { console.error(e); box.innerHTML = ""; box.appendChild(profileCard()); });
  });
})();
