/* ============================================================
   BMW Ladies Club GP — PUBLIC site configuration
   ------------------------------------------------------------
   Edit the values below, OR let Netlify generate this file at
   deploy time from environment variables (see README.md →
   "Public configuration"; build command: node scripts/generate-config.js).

   ONLY public values belong here. The Supabase *anon/publishable*
   key is designed to be public (it is protected by Row Level
   Security). NEVER put the service-role key in this file.
   ============================================================ */
window.BLC_CONFIG = {
  siteName: "BMW Ladies Club GP",
  domain: "https://bmwladiesclubgp.co.za",

  // Social profiles
  tiktokUrl: "https://www.tiktok.com/@bmw.ladies.club.gp",
  instagramUrl: "",   // supply once the official account URL is confirmed
  facebookUrl: "",    // supply once the official page URL is confirmed

  // ★ WhatsApp: digits only, with country code, no "+" (e.g. 27XXXXXXXXX).
  // Left blank on purpose — the club's number has not been confirmed.
  // While blank, every WhatsApp button is disabled gracefully.
  whatsappNumber: "",

  // Official contact details — blank until confirmed by the club
  clubEmail: "",
  clubPhone: "",

  // Supabase (public values only)
  supabaseUrl: "",       // e.g. https://abcdxyz.supabase.co
  supabaseAnonKey: "",   // the anon / publishable key

  // Branding
  logoPath: "assets/images/logos/bmw-ladies-club-gp-logo.png",
  defaultSeoImage: "assets/images/members/club-sisterhood-01.jpg",

  // Membership switch (can also be toggled in Admin → Settings)
  membershipOpen: true,

  // Where Netlify Functions live
  functionsBase: "/.netlify/functions"
};
