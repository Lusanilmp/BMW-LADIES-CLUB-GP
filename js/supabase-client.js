/* Supabase client loader. If Supabase is not configured the site runs in
   "starter content" mode using js/fallback-data.js, so nothing breaks. */
(function () {
  var C = window.BLC_CONFIG || {};
  var BLC = (window.BLC = window.BLC || {});
  var client = null;
  var CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

  BLC.configured = !!(C.supabaseUrl && C.supabaseAnonKey);

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = resolve; s.onerror = function () { reject(new Error("Could not load Supabase library")); };
      document.head.appendChild(s);
    });
  }

  // Resolves to a client, or null when not configured / unavailable.
  BLC.ready = BLC.configured
    ? loadScript(CDN).then(function () {
        client = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
        return client;
      }).catch(function (e) { console.warn("[BLC] Supabase unavailable:", e.message); BLC.configured = false; return null; })
    : Promise.resolve(null);

  BLC.db = function () { return client; };
})();
