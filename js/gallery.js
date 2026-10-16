/* Gallery: filterable grid + lightbox; home photo grid + video row */
(function () {
  "use strict";
  var BLC = window.BLC, el = BLC.el;
  var FB = (window.BLC_FALLBACK || {}).gallery || [];
  var CATS = ["BMW Convoys", "Members and Sisterhood", "Club Gatherings", "Special Events", "Community Projects", "BMW Photoshoots", "Behind the Scenes", "Drive Videos"];

  function norm(r) {
    return { id: r.id, type: r.media_type || r.type || "image", category: r.category, src: r.file_url || r.src, poster: r.poster_url || r.poster, caption: r.caption, description: r.description };
  }
  function fetchItems() {
    return BLC.load(function (db) { return db.from("gallery_media").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }); }, FB)
      .then(function (res) { return res.rows.map(norm).filter(function (i) { return BLC.safeUrl(i.src); }); });
  }
  function tile(it, i, open) {
    var f = el("figure", { class: "g-item" });
    var b = el("button", { type: "button", "aria-label": "Open " + (it.type === "video" ? "video: " : "photo: ") + (it.caption || "media") });
    if (it.type === "video") {
      var p = BLC.safeUrl(it.poster);
      b.appendChild(p ? el("img", { src: p, alt: it.caption || "Video preview", loading: "lazy", width: 540, height: 960 }) : el("div", { class: "ph", style: "aspect-ratio:9/16" }, [el("div", {}, [el("strong", { text: "Video" })])]));
      var pl = el("span", { class: "play" }); pl.innerHTML = BLC.icon("play") + " Play"; f.appendChild(pl);
    } else b.appendChild(el("img", { src: BLC.safeUrl(it.src), alt: it.caption || it.description || "Club photo", loading: "lazy", width: 720, height: 960 }));
    b.addEventListener("click", function () { open(i); });
    f.appendChild(b);
    if (it.caption) f.appendChild(el("figcaption", { class: "g-cap", text: it.caption }));
    return f;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("gallery-grid"), hp = document.getElementById("home-photos"), hv = document.getElementById("home-videos");
    if (!grid && !hp && !hv) return;
    var target = grid || hp || hv; BLC.state(target, "loading", "Loading media…");
    fetchItems().then(function (items) {
      if (hp) {
        hp.innerHTML = "";
        var photos = items.filter(function (i) { return i.type === "image"; }).slice(0, 4);
        photos.forEach(function (it, i) { var a = el("button", { type: "button", class: "cell", "aria-label": "Open photo: " + (it.caption || "club photo"), style: "border:0;padding:0;cursor:zoom-in" }, [el("img", { src: BLC.safeUrl(it.src), alt: it.caption || "Club photo", loading: "lazy", width: 540, height: 720 })]); a.addEventListener("click", function () { BLC.openLightbox(photos, i); }); hp.appendChild(a); });
        if (!photos.length) BLC.state(hp, "empty", "Photos are coming soon.");
      }
      if (hv) {
        hv.innerHTML = "";
        var vids = items.filter(function (i) { return i.type === "video"; }).slice(0, 4);
        vids.forEach(function (v) { hv.appendChild(el("div", { class: "video-card" }, [el("video", { src: BLC.safeUrl(v.src), poster: BLC.safeUrl(v.poster) || false, controls: "", playsinline: "", preload: "none", "aria-label": v.caption || "Club drive video" })])); });
        if (!vids.length) BLC.state(hv, "empty", "Drive videos are coming soon.");
      }
      if (grid) {
        var cur = "All", fbar = document.getElementById("gallery-filters"), shown = items;
        var cats = ["All"].concat(CATS.filter(function (c) { return items.some(function (i) { return i.category === c; }); }));
        var render = function () {
          shown = items.filter(function (i) { return cur === "All" || i.category === cur; });
          grid.innerHTML = "";
          if (!shown.length) return BLC.state(grid, "empty", "Nothing in this category yet.");
          shown.forEach(function (it, i) { grid.appendChild(tile(it, i, function (idx) { BLC.openLightbox(shown, idx); })); });
        };
        grid.classList.add("gallery-grid");
        cats.forEach(function (c) {
          var b = el("button", { class: "chip", type: "button", "aria-pressed": String(c === "All"), text: c });
          b.addEventListener("click", function () { cur = c; fbar.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); render(); });
          fbar.appendChild(b);
        });
        render();
        if (location.hash === "#videos") { var vb = Array.prototype.filter.call(fbar.querySelectorAll(".chip"), function (x) { return x.textContent === "Drive Videos"; })[0]; if (vb) vb.click(); }
      }
    }).catch(function (e) { console.error(e); BLC.state(target, "error", "We couldn't load the gallery right now. Please try again shortly."); });
  });
})();
