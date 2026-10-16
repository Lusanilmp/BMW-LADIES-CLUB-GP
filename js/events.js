/* Events: listing (upcoming/past, filter), home preview, detail + RSVP */
(function () {
  "use strict";
  var BLC = window.BLC, el = BLC.el;
  var FB = (window.BLC_FALLBACK || {}).events || [];

  function fetchEvents() {
    return BLC.load(function (db) {
      return db.from("events").select("*").order("start_at", { ascending: true, nullsFirst: false });
    }, FB);
  }
  function whenText(e) {
    if (e.start_at) {
      var s = BLC.fmtDate(e.start_at, true);
      return e.end_at ? s + " – " + BLC.fmtDate(e.end_at, true) : s;
    }
    return e.date_label || "Date to be confirmed";
  }
  function card(e, upcoming) {
    var c = el("article", { class: "card reveal" });
    var m = el("div", { class: "card__media" });
    var img = BLC.safeUrl(e.cover_image || e.cover_image_url);
    if (img) m.appendChild(el("img", { src: img, alt: e.title + " event image", loading: "lazy", width: 720, height: 540 }));
    else m.innerHTML = '<div class="ph"><div><strong>Event poster</strong>Upload a banner in the admin dashboard.</div></div>';
    c.appendChild(m);
    var b = el("div", { class: "card__body" });
    b.appendChild(el("div", {}, [el("span", { class: "tag " + (upcoming ? "tag--pink" : "tag--muted"), text: upcoming ? (e.category || "Event") : "Past event" })]));
    var h = el("h3"); h.appendChild(el("a", { href: "event.html?slug=" + encodeURIComponent(e.slug), text: e.title })); b.appendChild(h);
    var meta = el("div", { class: "card__meta" });
    var d = el("span"); d.innerHTML = BLC.icon("calendar"); d.appendChild(document.createTextNode(whenText(e))); meta.appendChild(d);
    if (e.venue) { var v = el("span"); v.innerHTML = BLC.icon("pin"); v.appendChild(document.createTextNode(e.venue)); meta.appendChild(v); }
    b.appendChild(meta);
    if (e.description) b.appendChild(el("p", { text: e.description.length > 150 ? e.description.slice(0, 147) + "…" : e.description }));
    var act = el("div", { class: "card__actions" });
    act.appendChild(el("a", { class: "btn btn--ghost btn--sm", href: "event.html?slug=" + encodeURIComponent(e.slug), text: "View Details" }));
    var reg = BLC.safeUrl(e.registration_url);
    if (upcoming && reg) act.appendChild(el("a", { class: "btn btn--primary btn--sm", href: reg, target: "_blank", rel: "noopener noreferrer", text: e.registration_label || "Book / RSVP" }));
    b.appendChild(act); c.appendChild(b);
    return c;
  }
  function fill(container, list, upcoming, emptyMsg) {
    container.innerHTML = "";
    if (!list.length) return BLC.state(container, "empty", emptyMsg);
    list.forEach(function (e) { container.appendChild(card(e, upcoming)); });
    container.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var up = document.getElementById("events-upcoming"), past = document.getElementById("events-past"), home = document.getElementById("home-events"), detail = document.getElementById("event-detail");
    if (!up && !home && !detail) return;
    var target = up || home || detail;
    BLC.state(target, "loading", "Loading events…");
    fetchEvents().then(function (res) {
      var rows = res.rows.slice();
      var upcoming = rows.filter(BLC.isUpcoming), pastRows = rows.filter(function (e) { return !BLC.isUpcoming(e); }).reverse();
      if (home) fill(home, upcoming.slice(0, 3), true, "No upcoming events are published yet — follow us on TikTok for the latest.");
      if (up) {
        var cats = Array.from(new Set(upcoming.map(function (e) { return e.category; }).filter(Boolean)));
        var fbar = document.getElementById("event-filters"), current = "All";
        var render = function () {
          fill(up, upcoming.filter(function (e) { return current === "All" || e.category === current; }), true, "No upcoming events in this category right now.");
        };
        if (fbar) {
          ["All"].concat(cats).forEach(function (c) {
            var b = el("button", { class: "chip", type: "button", "aria-pressed": String(c === "All"), text: c });
            b.addEventListener("click", function () { current = c; fbar.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); render(); });
            fbar.appendChild(b);
          });
          if (cats.length < 1) fbar.hidden = true;
        }
        render();
        if (past) fill(past, pastRows, false, "Past events will appear here automatically once their dates have passed.");
      }
      if (detail) renderDetail(detail, rows, res.source);
    }).catch(function (err) {
      console.error(err); BLC.state(target, "error", "We couldn't load events right now. Please try again shortly.");
    });
  });

  function renderDetail(box, rows, source) {
    var slug = new URLSearchParams(location.search).get("slug");
    var e = rows.filter(function (x) { return x.slug === slug; })[0];
    if (!e) return BLC.state(box, "empty", "We couldn't find that event. Return to the events page to see what's on.");
    document.title = e.title + " | BMW Ladies Club GP";
    var cur = document.getElementById("crumb-current"); if (cur) cur.textContent = e.title;
    var h1 = document.getElementById("page-title"); if (h1) h1.textContent = e.title;
    var upcoming = BLC.isUpcoming(e);
    box.innerHTML = "";
    var wrap = el("div", { class: "split split--wide-left" });
    var left = el("div");
    left.appendChild(el("span", { class: "tag " + (upcoming ? "tag--pink" : "tag--muted"), text: upcoming ? (e.category || "Event") : "This event has ended" }));
    left.appendChild(el("h2", { text: "About this event", style: "margin-top:12px" }));
    BLC.renderBody(e.description || "", left.appendChild(el("div", { class: "article__body" })));
    var facts = el("ul", { class: "values" });
    [["calendar", "When", whenText(e)], ["pin", "Where", [e.venue, e.location_details].filter(Boolean).join(" — ") || "Venue to be confirmed"]].forEach(function (f) {
      var li = el("li", { class: "value" }); li.innerHTML = BLC.icon(f[0]); li.appendChild(el("h3", { text: f[1] })); li.appendChild(el("p", { text: f[2] })); facts.appendChild(li);
    });
    left.appendChild(facts);
    var act = el("div", { class: "card__actions", style: "margin-top:22px" });
    var reg = BLC.safeUrl(e.registration_url);
    if (upcoming && reg) act.appendChild(el("a", { class: "btn btn--primary", href: reg, target: "_blank", rel: "noopener noreferrer", text: e.registration_label || "Book / RSVP" }));
    act.appendChild(el("a", { class: "btn btn--wa", href: "contact.html", "data-wa": "events", text: "Enquire About This Event" }));
    act.appendChild(el("a", { class: "btn btn--ghost", href: "events.html", text: "Back to events" }));
    left.appendChild(act);
    if (!upcoming) left.appendChild(el("p", { class: "status-note", style: "margin-top:18px", text: "Ticket sales and bookings for this event are closed." }));
    var right = el("div");
    var cover = BLC.safeUrl(e.cover_image || e.cover_image_url);
    var fr = el("div", { class: "frame" });
    if (cover) fr.appendChild(el("img", { src: cover, alt: e.title, width: 720, height: 960 })); else fr.innerHTML = '<div class="ph"><div><strong>Event poster</strong>Banner coming soon.</div></div>';
    right.appendChild(fr);
    wrap.appendChild(left); wrap.appendChild(right); box.appendChild(wrap);
    BLC.applyContactLinks();

    // Optional RSVP (only for DB events with RSVP enabled and a real id)
    if (upcoming && e.allow_rsvp && e.id && source === "supabase") box.appendChild(rsvpForm(e));
    var ld = document.createElement("script"); ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Event", name: e.title, description: e.description || "", startDate: e.start_at || undefined, endDate: e.end_at || undefined, eventStatus: "https://schema.org/EventScheduled", location: e.venue ? { "@type": "Place", name: e.venue } : undefined, organizer: { "@type": "Organization", name: "BMW Ladies Club GP" }, image: cover ? new URL(cover, location.href).href : undefined });
    document.head.appendChild(ld);
  }

  function rsvpForm(e) {
    var f = el("form", { class: "form", style: "margin-top:36px;max-width:640px", novalidate: "" });
    f.innerHTML = '<h3>RSVP</h3><div class="form-grid"><div class="field"><label for="r-name">Full name <span class="req">*</span></label><input id="r-name" required maxlength="120" autocomplete="name"></div><div class="field"><label for="r-email">Email <span class="req">*</span></label><input id="r-email" type="email" required maxlength="160" autocomplete="email"></div><div class="field"><label for="r-phone">Contact number</label><input id="r-phone" type="tel" maxlength="30" autocomplete="tel"></div><button class="btn btn--primary" type="submit">Send RSVP</button></div><div class="form-status" role="status"></div>';
    var st = f.querySelector(".form-status");
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = f.querySelector("#r-name").value.trim(), email = f.querySelector("#r-email").value.trim();
      st.className = "form-status show bad";
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { st.textContent = "Please enter your name and a valid email address."; return; }
      BLC.db().from("event_registrations").insert({ event_id: e.id, full_name: name, email: email, phone: f.querySelector("#r-phone").value.trim() || null }).then(function (r) {
        if (r.error) { st.textContent = "Sorry, we couldn't save your RSVP. Please try again."; return; }
        st.className = "form-status show ok"; st.textContent = "Thank you! Your RSVP has been received."; f.reset();
      });
    });
    return f;
  }
  BLC.eventCard = card;
})();
