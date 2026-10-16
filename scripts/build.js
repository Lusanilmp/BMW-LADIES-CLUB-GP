#!/usr/bin/env node
/* Netlify build step (also runnable locally: `npm run build`).
   1. Copies ONLY the public website files into ./dist (so /supabase, /scripts, /netlify, .env.example
      and other project files are never published as static files).
   2. Generates dist/js/config.js: values from js/config.js, overridden by PUBLIC_* environment variables.
   Only PUBLIC values may be injected here. NEVER the service-role key. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const PUBLIC_FILES = ["index.html", "about.html", "events.html", "event.html", "blog.html", "article.html", "gallery.html", "community.html", "join.html", "contact.html", "privacy.html", "admin.html", "404.html", "style.css", "JavaScript.js", "robots.txt", "sitemap.xml"];
const PUBLIC_DIRS = ["css", "js", "assets"];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const f of PUBLIC_FILES) fs.copyFileSync(path.join(root, f), path.join(dist, f));
for (const d of PUBLIC_DIRS) fs.cpSync(path.join(root, d), path.join(dist, d), { recursive: true });

// ---- config injection ----
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "js/config.js"), "utf8"), sandbox);
const cfg = sandbox.window.BLC_CONFIG;
const env = process.env;
const map = {
  PUBLIC_SUPABASE_URL: "supabaseUrl", PUBLIC_SUPABASE_ANON_KEY: "supabaseAnonKey", PUBLIC_WHATSAPP_NUMBER: "whatsappNumber",
  PUBLIC_CLUB_EMAIL: "clubEmail", PUBLIC_CLUB_PHONE: "clubPhone", PUBLIC_TIKTOK_URL: "tiktokUrl",
  PUBLIC_INSTAGRAM_URL: "instagramUrl", PUBLIC_FACEBOOK_URL: "facebookUrl", PUBLIC_DOMAIN: "domain",
};
const applied = [];
for (const [k, prop] of Object.entries(map)) if (env[k]) { cfg[prop] = env[k]; applied.push(k); }
if (env.PUBLIC_MEMBERSHIP_OPEN) { cfg.membershipOpen = env.PUBLIC_MEMBERSHIP_OPEN !== "false"; applied.push("PUBLIC_MEMBERSHIP_OPEN"); }
if (/service[_-]?role/i.test(JSON.stringify(cfg))) { console.error("Refusing to build: config looks like it contains a service-role key."); process.exit(1); }

fs.writeFileSync(path.join(dist, "js/config.js"), "/* Generated at build time — edit js/config.js or set PUBLIC_* env vars. */\nwindow.BLC_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n");
console.log("Built ./dist — env overrides applied:", applied.length ? applied.join(", ") : "(none)");
if (!cfg.supabaseUrl) console.warn("Note: Supabase URL not set — site will run in starter-content mode.");
