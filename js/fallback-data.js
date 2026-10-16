/* Starter content shown when Supabase is not configured (or returns nothing).
   Contains ONLY confirmed public information and the real uploaded media.
   Once Supabase is live, the dashboard content replaces this automatically. */
window.BLC_FALLBACK = {
  events: [
    {
      slug: "bmw-ladies-club-gp-anniversary",
      title: "BMW Ladies Club GP Anniversary Celebration",
      category: "Anniversary celebrations",
      description:
        "BMW Ladies Club GP celebrates its anniversary in October 2026. The club's public listing is on Howler — open it for the confirmed date, venue and ticket information.",
      start_at: null,
      end_at: null,
      date_label: "October 2026 — see the official listing for the exact date",
      venue: "See the official Howler listing",
      location_details: "",
      cover_image: "assets/images/events/club-meetup-01.jpg",
      registration_url: "https://www.howler.co.za/events/gourmet-nova-bmw-ladies-club-gp-anniversary-c066",
      registration_label: "View on Howler",
      status: "upcoming",
      is_sample: false
    }
  ],
  posts: [
    {
      slug: "bmw-pad-drive-2026",
      title: "BMW Pad Drive: A Small Donation. A Big Difference.",
      summary: "BMW Ladies Club GP is collecting sanitary pads for young girls in need. The drive runs until the end of October 2026.",
      category: "Charity Projects",
      published_at: "2026-10-01",
      author: "BMW Ladies Club GP",
      featured_image: "assets/images/charity/pad-drive-collection-01.jpg",
      body:
        "BMW Ladies Club GP is running the BMW Pad Drive — a collection of sanitary pads for young girls in need.\n\n" +
        "Our message is simple: every pad restores dignity, and every donation builds a future. Together we want to keep girls confident, healthy and in school.\n\n" +
        "![Sanitary pads collected in a club member's BMW convertible](assets/images/charity/pad-drive-collection-01.jpg)\n\n" +
        "The drive runs until the end of October 2026. Collection points are available — please contact the club to find out how to donate.\n\n" +
        "Thank you to everyone who has already supported the drive. Keep the donations coming.\n\n" +
        "@video(assets/videos/events/padrive-collection-01.mp4)",
      is_sample: false
    },
    {
      slug: "follow-the-club-on-tiktok",
      title: "Follow our drives on TikTok",
      summary: "Convoys, meet-ups, sisterhood and charity moments — the club shares them first on TikTok.",
      category: "Announcements",
      published_at: "2026-10-01",
      author: "BMW Ladies Club GP",
      featured_image: "assets/images/members/club-sisterhood-01.jpg",
      body:
        "A sisterhood powered by passion and performance — that is what you will find on our official TikTok.\n\n" +
        "Follow @bmw.ladies.club.gp to see our latest convoys, gatherings, mentorship moments and community projects. For events, promotions and bookings, send the club a message.",
      is_sample: false
    }
  ],
  gallery: [
    { id: "g1", type: "image", category: "Members and Sisterhood", src: "assets/images/members/club-sisterhood-01.jpg", caption: "Sisterhood in denim", description: "Club members together on a drive day." },
    { id: "g2", type: "image", category: "Club Gatherings", src: "assets/images/cars/club-convoy-01.jpg", caption: "Gathering at MINI Menlyn", description: "A BMW arrives at a club gathering." },
    { id: "g3", type: "image", category: "Club Gatherings", src: "assets/images/events/club-meetup-01.jpg", caption: "Club meet-up", description: "Members and BMWs at a club meet-up." },
    { id: "g4", type: "image", category: "Community Projects", src: "assets/images/charity/pad-drive-collection-01.jpg", caption: "Pad Drive collection", description: "Donated sanitary pads piled into a club member's BMW." },
    { id: "g5", type: "image", category: "Community Projects", src: "assets/images/charity/club-gift-bags-01.jpg", caption: "Club gift bags", description: "BMW Ladies Club GP branded bags." },
    { id: "v1", type: "video", category: "Drive Videos", src: "assets/videos/drives/club-drive-01.mp4", poster: "assets/images/posters/club-drive-01.jpg", caption: "Club drive — arrivals", description: "BMWs arriving for a club drive." },
    { id: "v2", type: "video", category: "BMW Photoshoots", src: "assets/videos/drives/club-drive-02.mp4", poster: "assets/images/posters/club-drive-02.jpg", caption: "Dark BMW, sharp lines", description: "A close look at a member's BMW." },
    { id: "v3", type: "video", category: "BMW Convoys", src: "assets/videos/drives/club-convoy-01.mp4", poster: "assets/images/posters/club-convoy-01.jpg", caption: "Convoy day", description: "BMWs lined up and rolling out." },
    { id: "v4", type: "video", category: "Drive Videos", src: "assets/videos/drives/club-drive-03.mp4", poster: "assets/images/posters/club-drive-03.jpg", caption: "On the road", description: "A club drive on the move." },
    { id: "v5", type: "video", category: "Club Gatherings", src: "assets/videos/events/club-event-01.mp4", poster: "assets/images/posters/club-event-01.jpg", caption: "Club gathering", description: "Members enjoying a club gathering." },
    { id: "v6", type: "video", category: "Community Projects", src: "assets/videos/events/padrive-collection-01.mp4", poster: "assets/images/posters/padrive-collection-01.jpg", caption: "Pad Drive collection point", description: "Donations coming in for the BMW Pad Drive." },
    { id: "v7", type: "video", category: "Community Projects", src: "assets/videos/events/padrive-community-01.mp4", poster: "assets/images/posters/padrive-community-01.jpg", caption: "Pad Drive community day", description: "Community moments from the Pad Drive." }
  ],
  campaigns: [
    {
      slug: "bmw-pad-drive",
      title: "BMW Pad Drive",
      tagline: "A Small Donation. A Big Difference.",
      description: "BMW Ladies Club GP is collecting sanitary pads for young girls in need — keeping them confident, healthy and in school.",
      start_date: null,
      end_date: "2026-10-31",
      poster: "assets/images/charity/bmw-pad-drive-poster.jpg",
      published: true
    }
  ],
  social: []
};
