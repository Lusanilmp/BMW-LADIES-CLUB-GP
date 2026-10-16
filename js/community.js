/* Charity campaigns (community page + home impact strip). Auto-marks campaigns Completed after end date. */
(function () {
  "use strict";
  var BLC = window.BLC, el = BLC.el;
  var FB = (window.BLC_FALLBACK || {}).campaigns || [];
  function dateRange(c) {
    var f = function (d) { return d ? new Date(d + "T12:00:00+02:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" }) : ""; };
    return c.start_date ? f(c.start_date) + " – " + f(c.end_date) : (c.end_date ? "Runs until " + f(c.end_date) : "");
  }
  function build(c, compact) {
    var state = BLC.campaignState(c), wrap = el("article", { class: "split split--wide-left", style: "align-items:start" });
    var t = el("div");
    t.appendChild(el("span", { class: "tag " + (state === "active" ? "tag--pink" : "tag--ok"), text: state === "active" ? "Campaign open" : "Campaign completed" }));
    t.appendChild(el(compact ? "h3" : "h2", { text: c.title, style: "margin-top:12px" }));
    if (c.tagline) t.appendChild(el("p", { class: "lead", text: "“" + c.tagline + "”" }));
    if (c.description) t.appendChild(el("p", { text: c.description }));
    var dr = dateRange(c); if (dr) t.appendChild(el("p", { class: "card__meta" }, [el("span", { text: dr })]));
    t.appendChild(el("p", { class: "progress-note", text: state === "active" ? "Official donation details are shared by the club on request — please enquire below." : "Thank you to everyone who supported this campaign." }));
    var a = el("div", { class: "card__actions" });
    if (state === "active") {
      a.appendChild(el("a", { class: "btn btn--wa", href: "contact.html", "data-wa": "charity", text: "Enquire About Donating" }));
      a.appendChild(el("a", { class: "btn btn--ghost", href: "contact.html?subject=" + encodeURIComponent("Donation enquiry: " + c.title), text: "Send an enquiry" }));
    }
    t.appendChild(a); wrap.appendChild(t);
    var p = BLC.safeUrl(c.poster || c.poster_url);
    var fr = el("div", { class: "frame pad-poster" });
    fr.appendChild(p ? el("img", { src: p, alt: c.title + " campaign poster", loading: "lazy", width: 804, height: 1052 }) : el("div", { class: "ph" }, [el("div", {}, [el("strong", { text: "Campaign poster" }), "Upload in the admin dashboard."])]));
    wrap.appendChild(fr); return wrap;
  }
  document.addEventListener("DOMContentLoaded", function () {
    var box = document.getElementById("campaigns"); if (!box) return;
    BLC.state(box, "loading", "Loading campaigns…");
    BLC.load(function (db) { return db.from("charity_campaigns").select("*").order("end_date", { ascending: false }); }, FB).then(function (res) {
      box.innerHTML = "";
      var rows = res.rows; if (!rows.length) return BLC.state(box, "empty", "No campaigns are published right now.");
      var compact = box.hasAttribute("data-compact"); if (compact) rows = rows.slice(0, 1);
      rows.forEach(function (c, i) { box.appendChild(build(c, compact)); if (i < rows.length - 1) box.appendChild(el("hr", { style: "border:0;border-top:1px solid var(--line);margin:48px 0" })); });
      BLC.applyContactLinks();
    }).catch(function (e) { console.error(e); BLC.state(box, "error", "We couldn't load campaigns right now."); });
  });
})();
