/* Blog: list (filter + search), home latest stories, article detail */
(function () {
  "use strict";
  var BLC = window.BLC, el = BLC.el;
  var FB = (window.BLC_FALLBACK || {}).posts || [];
  var CATS = ["Latest News", "Club Drives", "Sisterhood Stories", "Community Impact", "Charity Projects", "Upcoming Events", "BMW Lifestyle", "Announcements", "Mentorship"];

  function fetchPosts() {
    return BLC.load(function (db) {
      return db.from("blog_posts").select("*").order("published_at", { ascending: false });
    }, FB);
  }
  function img(p) { return BLC.safeUrl(p.featured_image || p.featured_image_url); }
  function author(p) { return p.author || p.author_name || "BMW Ladies Club GP"; }
  function card(p) {
    var c = el("article", { class: "card reveal in" });
    var m = el("div", { class: "card__media" });
    if (img(p)) m.appendChild(el("img", { src: img(p), alt: "", loading: "lazy", width: 720, height: 540 })); else m.innerHTML = '<div class="ph"><div><strong>Featured image</strong></div></div>';
    c.appendChild(m);
    var b = el("div", { class: "card__body" });
    b.appendChild(el("div", {}, [el("span", { class: "tag", text: p.category || "News" })]));
    var h = el("h3"); h.appendChild(el("a", { href: "article.html?slug=" + encodeURIComponent(p.slug), text: p.title })); b.appendChild(h);
    b.appendChild(el("div", { class: "card__meta" }, [el("span", { text: BLC.fmtDate(p.published_at) + " · " + author(p) })]));
    if (p.summary) b.appendChild(el("p", { text: p.summary }));
    b.appendChild(el("div", { class: "card__actions" }, [el("a", { class: "btn btn--ghost btn--sm", href: "article.html?slug=" + encodeURIComponent(p.slug), text: "Read story" })]));
    c.appendChild(b); return c;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var list = document.getElementById("blog-list"), home = document.getElementById("home-posts"), art = document.getElementById("article");
    var target = list || home || art; if (!target) return;
    BLC.state(target, "loading", "Loading stories…");
    fetchPosts().then(function (res) {
      var rows = res.rows.filter(function (p) { return !p.status || p.status === "published"; });
      if (home) { home.innerHTML = ""; if (!rows.length) BLC.state(home, "empty", "Stories are coming soon."); rows.slice(0, 3).forEach(function (p) { home.appendChild(card(p)); }); }
      if (list) wireList(list, rows);
      if (art) renderArticle(art, rows);
    }).catch(function (e) { console.error(e); BLC.state(target, "error", "We couldn't load stories right now. Please try again shortly."); });
  });

  function wireList(list, rows) {
    var fbar = document.getElementById("blog-filters"), q = document.getElementById("blog-search"), cur = "All", term = "";
    var cats = ["All"].concat(CATS.filter(function (c) { return rows.some(function (p) { return p.category === c; }); }));
    var render = function () {
      var out = rows.filter(function (p) {
        return (cur === "All" || p.category === cur) && (!term || (p.title + " " + (p.summary || "") + " " + (p.body || "")).toLowerCase().indexOf(term) > -1);
      });
      list.innerHTML = "";
      if (!out.length) return BLC.state(list, "empty", term || cur !== "All" ? "No stories match your search." : "No stories have been published yet.");
      out.forEach(function (p) { list.appendChild(card(p)); });
    };
    if (fbar) cats.forEach(function (c) {
      var b = el("button", { class: "chip", type: "button", "aria-pressed": String(c === "All"), text: c });
      b.addEventListener("click", function () { cur = c; fbar.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); render(); });
      fbar.appendChild(b);
    });
    if (q) q.addEventListener("input", function () { term = q.value.trim().toLowerCase(); render(); });
    render();
  }

  function renderArticle(box, rows) {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { var m = location.pathname.match(/\/blog\/([^/]+)\/?$/); if (m) slug = decodeURIComponent(m[1]); }
    var p = rows.filter(function (x) { return x.slug === slug; })[0];
    if (!p) return BLC.state(box, "empty", "We couldn't find that story. Head back to the blog to browse the latest.");
    document.title = p.title + " | BMW Ladies Club GP";
    var set = function (sel, attr, val) { var n = document.querySelector(sel); if (n) n.setAttribute(attr, val); };
    set('meta[name="description"]', "content", p.summary || p.title);
    set('meta[property="og:title"]', "content", p.title); set('meta[property="og:description"]', "content", p.summary || "");
    if (img(p)) set('meta[property="og:image"]', "content", new URL(img(p), location.href).href);
    set('link[rel="canonical"]', "href", (window.BLC_CONFIG.domain || location.origin) + "/blog/" + p.slug);
    var cur = document.getElementById("crumb-current"); if (cur) cur.textContent = p.title;
    var h1 = document.getElementById("page-title"); if (h1) h1.textContent = p.title;
    box.innerHTML = "";
    box.appendChild(el("div", { class: "article__meta" }, [el("span", { class: "tag", text: p.category || "News" }), el("span", { text: BLC.fmtDate(p.published_at) }), el("span", { text: "By " + author(p) })]));
    if (img(p)) box.appendChild(el("img", { src: img(p), alt: "", class: "frame", style: "width:100%;max-height:560px;object-fit:cover;margin-bottom:28px" }));
    var body = el("div", { class: "article__body" }); BLC.renderBody(p.body || p.summary || "", body); box.appendChild(body);
    var sh = el("div", { class: "share" });
    sh.innerHTML = '<strong>Share:</strong><a class="btn btn--ghost btn--sm" data-share-link="whatsapp">WhatsApp</a><a class="btn btn--ghost btn--sm" data-share-link="facebook">Facebook</a><a class="btn btn--ghost btn--sm" data-share-link="x">X</a><button class="btn btn--ghost btn--sm" type="button" data-share="copy">Copy link</button>';
    box.appendChild(sh);
    box.appendChild(el("a", { class: "btn btn--navy", href: "blog.html", text: "← Back to blog" }));
    var rel = rows.filter(function (x) { return x.slug !== p.slug && x.category === p.category; }).concat(rows.filter(function (x) { return x.slug !== p.slug && x.category !== p.category; })).slice(0, 3);
    var relBox = document.getElementById("related");
    if (relBox && rel.length) { relBox.hidden = false; var g = relBox.querySelector(".grid"); rel.forEach(function (x) { g.appendChild(card(x)); }); }
    // re-run share wiring + data-share handlers added after load
    BLC.wireShareLinks && BLC.wireShareLinks();
    sh.querySelector("[data-share=copy]").addEventListener("click", function (e) { var b = e.currentTarget; (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () { b.textContent = "Link copied ✓"; }).catch(function () { window.prompt("Copy this link:", location.href); }); });
    var ld = document.createElement("script"); ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: p.published_at, author: { "@type": "Organization", name: author(p) }, publisher: { "@type": "Organization", name: "BMW Ladies Club GP" }, image: img(p) ? new URL(img(p), location.href).href : undefined });
    document.head.appendChild(ld);
  }
  BLC.blogCard = card;
})();
