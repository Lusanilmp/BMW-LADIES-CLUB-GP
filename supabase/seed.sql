-- ============================================================
-- BMW Ladies Club GP — seed data (run THIRD, optional)
-- Contains ONLY confirmed public information and the real media supplied
-- by the club. Media paths point at files shipped inside the website
-- (assets/...). Safe to re-run.
-- ============================================================

insert into public.blog_categories (name, slug, sort_order) values
  ('Latest News','latest-news',1), ('Club Drives','club-drives',2), ('Sisterhood Stories','sisterhood-stories',3),
  ('Community Impact','community-impact',4), ('Charity Projects','charity-projects',5), ('Upcoming Events','upcoming-events',6),
  ('BMW Lifestyle','bmw-lifestyle',7), ('Announcements','announcements',8), ('Mentorship','mentorship',9)
on conflict (name) do nothing;

-- Public settings. NOTE: whatsapp_number / club_email / club_phone are intentionally NOT seeded
-- (not yet confirmed). Set them in Admin → Settings once the club confirms them.
insert into public.site_settings (key, value, is_public) values
  ('membership_open', '{"v": true}', true),
  ('tiktok_url', '{"v": "https://www.tiktok.com/@bmw.ladies.club.gp"}', true)
on conflict (key) do nothing;

-- Anniversary celebration: only the confirmed facts (October 2026 + public Howler listing).
-- Add the exact date/time/venue in Admin → Events once confirmed.
insert into public.events (slug, title, category, description, date_label, venue, cover_image_url,
                           registration_url, registration_label, status, is_published)
values ('bmw-ladies-club-gp-anniversary', 'BMW Ladies Club GP Anniversary Celebration', 'Anniversary celebrations',
        'BMW Ladies Club GP celebrates its anniversary in October 2026. The club''s public listing is on Howler — open it for the confirmed date, venue and ticket information.',
        'October 2026 — see the official listing for the exact date', 'See the official Howler listing',
        'assets/images/events/club-meetup-01.jpg',
        'https://www.howler.co.za/events/gourmet-nova-bmw-ladies-club-gp-anniversary-c066', 'View on Howler',
        'upcoming', true)
on conflict (slug) do nothing;

insert into public.charity_campaigns (slug, title, tagline, description, end_date, poster_url, is_published)
values ('bmw-pad-drive', 'BMW Pad Drive', 'A Small Donation. A Big Difference.',
        'BMW Ladies Club GP is collecting sanitary pads for young girls in need — keeping them confident, healthy and in school.',
        '2026-10-31', 'assets/images/charity/bmw-pad-drive-poster.jpg', true)
on conflict (slug) do nothing;

insert into public.blog_posts (slug, title, summary, category, author_name, featured_image_url, status, published_at, body)
values
('bmw-pad-drive-2026', 'BMW Pad Drive: A Small Donation. A Big Difference.',
 'BMW Ladies Club GP is collecting sanitary pads for young girls in need. The drive runs until the end of October 2026.',
 'Charity Projects', 'BMW Ladies Club GP', 'assets/images/charity/pad-drive-collection-01.jpg', 'published', '2026-10-01T08:00:00+02:00',
 E'BMW Ladies Club GP is running the BMW Pad Drive — a collection of sanitary pads for young girls in need.\n\nOur message is simple: every pad restores dignity, and every donation builds a future. Together we want to keep girls confident, healthy and in school.\n\n![Sanitary pads collected in a club member''s BMW convertible](assets/images/charity/pad-drive-collection-01.jpg)\n\nThe drive runs until the end of October 2026. Collection points are available — please contact the club to find out how to donate.\n\nThank you to everyone who has already supported the drive. Keep the donations coming.\n\n@video(assets/videos/events/padrive-collection-01.mp4)'),
('follow-the-club-on-tiktok', 'Follow our drives on TikTok',
 'Convoys, meet-ups, sisterhood and charity moments — the club shares them first on TikTok.',
 'Announcements', 'BMW Ladies Club GP', 'assets/images/members/club-sisterhood-01.jpg', 'published', '2026-10-01T08:00:00+02:00',
 E'A sisterhood powered by passion and performance — that is what you will find on our official TikTok.\n\nFollow @bmw.ladies.club.gp to see our latest convoys, gatherings, mentorship moments and community projects. For events, promotions and bookings, send the club a message.')
on conflict (slug) do nothing;

-- Gallery: the club's real photos and videos (shipped in /assets).
insert into public.gallery_media (media_type, category, file_url, poster_url, caption, description, sort_order, is_published)
select * from (values
 ('image','Members and Sisterhood','assets/images/members/club-sisterhood-01.jpg',null,'Sisterhood in denim','Club members together on a drive day.',1,true),
 ('image','Club Gatherings','assets/images/cars/club-convoy-01.jpg',null,'Gathering at MINI Menlyn','A BMW arrives at a club gathering.',2,true),
 ('image','Club Gatherings','assets/images/events/club-meetup-01.jpg',null,'Club meet-up','Members and BMWs at a club meet-up.',3,true),
 ('image','Community Projects','assets/images/charity/pad-drive-collection-01.jpg',null,'Pad Drive collection','Donated sanitary pads piled into a club member''s BMW.',4,true),
 ('image','Community Projects','assets/images/charity/club-gift-bags-01.jpg',null,'Club gift bags','BMW Ladies Club GP branded bags.',5,true),
 ('video','Drive Videos','assets/videos/drives/club-drive-01.mp4','assets/images/posters/club-drive-01.jpg','Club drive — arrivals','BMWs arriving for a club drive.',6,true),
 ('video','BMW Photoshoots','assets/videos/drives/club-drive-02.mp4','assets/images/posters/club-drive-02.jpg','Dark BMW, sharp lines','A close look at a member''s BMW.',7,true),
 ('video','BMW Convoys','assets/videos/drives/club-convoy-01.mp4','assets/images/posters/club-convoy-01.jpg','Convoy day','BMWs lined up and rolling out.',8,true),
 ('video','Drive Videos','assets/videos/drives/club-drive-03.mp4','assets/images/posters/club-drive-03.jpg','On the road','A club drive on the move.',9,true),
 ('video','Club Gatherings','assets/videos/events/club-event-01.mp4','assets/images/posters/club-event-01.jpg','Club gathering','Members enjoying a club gathering.',10,true),
 ('video','Community Projects','assets/videos/events/padrive-collection-01.mp4','assets/images/posters/padrive-collection-01.jpg','Pad Drive collection point','Donations coming in for the BMW Pad Drive.',11,true),
 ('video','Community Projects','assets/videos/events/padrive-community-01.mp4','assets/images/posters/padrive-community-01.jpg','Pad Drive community day','Community moments from the Pad Drive.',12,true)
) as v(media_type, category, file_url, poster_url, caption, description, sort_order, is_published)
where not exists (select 1 from public.gallery_media g where g.file_url = v.file_url);
