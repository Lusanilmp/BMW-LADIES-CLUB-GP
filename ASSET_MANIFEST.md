# Asset manifest

Where every media file lives, what it is, where it is used, and how to replace it. Keep the same file name when replacing so no code changes are needed (or upload new media via Admin → Gallery).

## Used (from the files supplied)

| File in site | Source / role | Used on |
|---|---|---|
| `assets/images/logos/bmw-ladies-club-gp-logo.png` | **Cropped from the Pad Drive poster** (no standalone logo was uploaded) — low resolution | Header, footer, favicon/OG |
| `assets/images/charity/bmw-pad-drive-poster.jpg` | Pad Drive poster, **bank-details strip removed** | Community page, home |
| `assets/images/charity/pad-drive-collection-01.jpg` | Cropped from TikTok screenshot: pads piled in a red BMW convertible | Community, blog, gallery |
| `assets/images/charity/club-gift-bags-01.jpg` | Cropped from TikTok profile screenshot: club gift bags | Community, gallery |
| `assets/images/members/club-sisterhood-01.jpg` | Four members in denim | Hero, about, gallery |
| `assets/images/cars/club-convoy-01.jpg` | Black BMW at MINI Menlyn gathering | Hero, gallery |
| `assets/images/events/club-meetup-01.jpg` | White BMW 4 Series at a meet-up | Anniversary event card, gallery |
| `assets/images/banners/og-default.jpg` | Social-sharing image generated from the above | All pages (Open Graph) |
| `assets/videos/drives/club-drive-01.mp4` | WhatsApp video 17:41:18 | Home, gallery |
| `assets/videos/drives/club-drive-02.mp4` | WhatsApp video 17:41:24 | Home, gallery |
| `assets/videos/drives/club-drive-03.mp4` | WhatsApp video 17:42:39 | Gallery |
| `assets/videos/drives/club-convoy-01.mp4` | WhatsApp video 17:42:34 | Gallery |
| `assets/videos/events/club-event-01.mp4` | WhatsApp video 17:41:31 | Gallery |
| `assets/videos/events/padrive-collection-01.mp4` | WhatsApp video 17:41:14 | Blog post, gallery |
| `assets/videos/events/padrive-community-01.mp4` | WhatsApp video 17:42:24 | Community, gallery |
| `assets/images/posters/*.jpg` | Thumbnails extracted from each video | Video posters |

Processing applied: videos re-encoded for web (H.264/AAC, faststart) with the 4-second TikTok end-card removed; photos recompressed. **No people or logos were altered.**

## Known gaps / please supply
- **Original logo** (SVG or high-res PNG with transparent background) — current one is a crop (≈400 px).
- **Original videos without the TikTok watermark** (the supplied ones carry TikTok's overlay and the club's corner badge).
- Photos for: BMW Convoys, Special Events, Behind the Scenes, BMW Photoshoots, Mentorship, leadership team (only if the club wants them shown).
- Anniversary poster/banner (the Howler listing image) — upload in Admin → Events.
- Charity poster in the club's own artwork *without* banking details, if donation info is approved for publication.

## Recommended slot names for future uploads
`club-hero.jpg`, `club-convoy-01.jpg`…, `club-sisterhood-01.jpg`…, `club-meetup-01.jpg`…, `anniversary-poster.jpg`, `charity-pad-drive.jpg`, `club-drive-01.mp4`…, `club-event-01.mp4`…
Folders: `assets/images/{logos,banners,cars,members,events,charity,placeholders,posters}`, `assets/videos/{drives,events}`.

## Replacing media
- **Gallery items:** Admin → Gallery (upload to Supabase Storage, set category/caption). Dashboard items override the starter set in `js/fallback-data.js` once any exist.
- **Static images** (hero, logo): overwrite the file in `assets/` keeping the same name and redeploy.
- Allowed types: JPG, PNG, WebP, SVG (static), MP4, WebM. Storage bucket limit and MIME checks are set in `supabase/policies.sql`.
- Missing media never shows a broken icon: cards fall back to a labelled placeholder.
