import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// ─── Brand Colors (WHITE/LIGHT theme) ───────────────────────────────────────
const C = {
  saffron:   'E85D04',
  saffronLt: 'FF8C42',
  gold:      'C07000',
  goldLt:    'F4A102',
  white:     'FFFFFF',
  offWhite:  'FFF9F2',
  pageBg:    'FFFDF8',
  cardBg:    'FFFFFF',
  cardBorder:'E8D5B0',
  sectionBg: 'FFF3E0',
  darkText:  '2C1500',
  bodyText:  '4A3000',
  mutedText: '8A6040',
  divider:   'F0C080',
  green:     '1A7A3A',
  greenLt:   'E8F5ED',
  red:       'C0392B',
  redLt:     'FDECEA',
  warn:      'A07000',
  warnLt:    'FFF8E1',
  lightBg:   'FFF3E0',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function addBg(slide, color) {
  slide.background = { color: color || C.pageBg };
  // saffron top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.1,
    fill: { color: C.saffron }, line: { type: 'none' },
  });
  // gold bottom accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.4, w: '100%', h: 0.1,
    fill: { color: C.goldLt }, line: { type: 'none' },
  });
}

function addFooter(slide) {
  slide.addText('🙏  SANATAN GURUJI  |  sanatanguruji.com  |  Confidential — For Investor Use Only', {
    x: 0, y: 7.15, w: '100%', h: 0.26,
    align: 'center', fontSize: 9, color: C.mutedText,
  });
}

function sectionPill(slide, label, color) {
  const bg = color || C.saffron;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 0.16, w: 2.2, h: 0.34,
    fill: { color: bg }, line: { type: 'none' }, rectRadius: 0.06,
  });
  slide.addText(label, {
    x: 0.4, y: 0.16, w: 2.2, h: 0.34,
    align: 'center', fontSize: 10, color: C.white, bold: true,
  });
}

function slideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.4, y: 0.62, w: 12.5, h: 0.58,
    fontSize: 26, color: C.darkText, bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 1.22, w: 12.5, h: 0.3,
      fontSize: 12, color: C.mutedText, italic: true,
    });
  }
  // thin divider under title
  slide.addShape(pptx.ShapeType.line, {
    x: 0.4, y: 1.58, w: 12.5, h: 0,
    line: { color: C.divider, width: 1.2 },
  });
}

function card(slide, x, y, w, h, opts) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: (opts && opts.bg) || C.cardBg },
    line: { color: (opts && opts.border) || C.cardBorder, width: 1 },
    rectRadius: 0.1,
    shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: 'C09060', opacity: 0.12 },
  });
}

function accentCard(slide, x, y, w, h, accent) {
  card(slide, x, y, w, h, { bg: C.cardBg, border: accent || C.saffron });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.1, h,
    fill: { color: accent || C.saffron }, line: { type: 'none' },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  // saffron left panel
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 5.8, h: 7.5,
    fill: { color: C.saffron }, line: { type: 'none' },
  });
  // gold accent stripe
  s.addShape(pptx.ShapeType.rect, {
    x: 5.8, y: 0, w: 0.18, h: 7.5,
    fill: { color: C.goldLt }, line: { type: 'none' },
  });

  // Left panel content
  s.addText('🕉', { x: 0.3, y: 0.4, w: 5.2, h: 1.6, fontSize: 72, align: 'center', valign: 'middle' });
  s.addText('Sanatan\nGuruji', {
    x: 0.3, y: 2.05, w: 5.2, h: 1.8,
    fontSize: 46, color: C.white, bold: true, align: 'center', lineSpacingMultiple: 1.1,
  });
  // Tagline pill on left panel
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 3.95, w: 4.8, h: 0.44,
    fill: { color: 'D04A00' }, line: { type: 'none' }, rectRadius: 0.08,
  });
  s.addText('ONE STOP SPIRITUAL SOLUTION', {
    x: 0.5, y: 3.95, w: 4.8, h: 0.44,
    align: 'center', fontSize: 11, color: C.white, bold: true, charSpacing: 1.5,
  });

  s.addText('Your Guruji. Your Puja.\nAnytime. Anywhere.', {
    x: 0.3, y: 4.52, w: 5.2, h: 0.85,
    align: 'center', fontSize: 14, color: 'FFE0C0', italic: true, lineSpacingMultiple: 1.4,
  });
  s.addText('sanatanguruji.com', {
    x: 0.3, y: 5.45, w: 5.2, h: 0.35,
    align: 'center', fontSize: 13, color: 'FFD090',
  });

  // Founder block bottom of left panel
  s.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 6.3, w: 5.2, h: 0.02,
    fill: { color: 'D05000' }, line: { type: 'none' },
  });
  s.addText('Founder & CEO — Ojus Kulkarni', {
    x: 0.3, y: 6.4, w: 5.2, h: 0.3,
    align: 'center', fontSize: 11, color: 'FFD090',
  });

  // Right panel
  s.addText("India's First Verified\nGuruji Booking Platform", {
    x: 6.3, y: 0.6, w: 6.8, h: 1.3,
    fontSize: 26, color: C.darkText, bold: true, lineSpacingMultiple: 1.2,
  });
  s.addText(
    'A technology platform connecting Hindu families with verified Gurujis\nfor every puja, ceremony & spiritual need — at home or online.\n\nBook your Guruji in minutes — anytime, anywhere.',
    { x: 6.3, y: 2.1, w: 6.8, h: 1.3, fontSize: 13, color: C.bodyText, lineSpacingMultiple: 1.55 }
  );

  // Status badges
  const badges = [
    { t: '✅  LIVE — 2026', bg: C.greenLt, tc: C.green, border: C.green },
    { t: '🚀  SEED STAGE', bg: 'FFF3E0', tc: C.saffron, border: C.saffron },
  ];
  badges.forEach((b, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 6.3 + i * 3.0, y: 3.55, w: 2.7, h: 0.45,
      fill: { color: b.bg }, line: { color: b.border, width: 1.2 }, rectRadius: 0.08,
    });
    s.addText(b.t, {
      x: 6.3 + i * 3.0, y: 3.55, w: 2.7, h: 0.45,
      align: 'center', fontSize: 12, color: b.tc, bold: true,
    });
  });

  // Stat grid
  const stats = [
    { n: '100+', l: 'Cities' },
    { n: '50+',  l: 'Puja Types' },
    { n: '₹499', l: 'Starting' },
    { n: 'FREE', l: 'Registration' },
  ];
  stats.forEach((st, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 6.3 + col * 3.35;
    const y = 4.2 + row * 1.18;
    card(s, x, y, 3.1, 1.05, { bg: C.sectionBg, border: C.divider });
    s.addText(st.n, { x, y: y + 0.06, w: 3.1, h: 0.55, align: 'center', fontSize: 24, color: C.saffron, bold: true });
    s.addText(st.l, { x, y: y + 0.6, w: 3.1, h: 0.35, align: 'center', fontSize: 11, color: C.mutedText });
  });

  s.addText('Dharmic Technology for Bharat & the Global Hindu Community', {
    x: 6.3, y: 6.65, w: 6.8, h: 0.3,
    fontSize: 10, color: C.mutedText, italic: true,
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The Problem
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '🔍  THE PROBLEM');
  slideTitle(s, '🕉  The Problem We Solve', 'Real pain points from families across India — every single day in 2026');

  // Quote
  card(s, 0.4, 1.72, 12.5, 0.98, { bg: 'FFFAF4', border: C.goldLt });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.72, w: 0.14, h: 0.98,
    fill: { color: C.goldLt }, line: { type: 'none' },
  });
  s.addText(
    '"My son\'s Namkaran was next week and I spent 3 days trying to find a good Guruji. I called everyone I knew — friends, relatives, neighbours. I wish there was a way to just book one anytime, anywhere like booking a cab."',
    { x: 0.68, y: 1.8, w: 11.8, h: 0.58, fontSize: 12, color: C.bodyText, italic: true, lineSpacingMultiple: 1.4 }
  );
  s.addText('— Real customer, Pune, 2026', {
    x: 0.68, y: 2.42, w: 11.8, h: 0.22, fontSize: 10, color: C.mutedText,
  });

  const problems = [
    {
      icon: '🔍', title: 'Hard to Find',
      body: 'Families planning Namkaran, Griha Pravesh or Satyanarayan Katha rely only on friends and word-of-mouth. It takes days and often fails.',
      bg: 'FFFDF6', border: C.saffron,
    },
    {
      icon: '📚', title: 'Limited Pujas Available',
      body: 'Many special or regional pujas never happen because no local Guruji knows them. Families are forced to skip important traditions.',
      bg: 'FFFDF6', border: C.goldLt,
    },
    {
      icon: '💼', title: 'Gurujis Need a Platform',
      body: 'Thousands of learned Pandits earn very little and have no digital presence. Their knowledge deserves a bigger stage and steady income.',
      bg: 'FFFDF6', border: C.saffron,
    },
  ];
  problems.forEach((p, i) => {
    const x = 0.4 + i * 4.32;
    card(s, x, 2.85, 4.1, 2.55, { bg: p.bg, border: p.border });
    s.addText(p.icon, { x, y: 2.95, w: 4.1, h: 0.55, align: 'center', fontSize: 28 });
    s.addText(p.title, {
      x: x + 0.15, y: 3.55, w: 3.8, h: 0.38,
      align: 'center', fontSize: 14, color: C.saffron, bold: true,
    });
    s.addText(p.body, {
      x: x + 0.2, y: 3.98, w: 3.7, h: 1.3,
      fontSize: 11, color: C.bodyText, lineSpacingMultiple: 1.45, align: 'center',
    });
  });

  // Key fact banner
  card(s, 0.4, 5.58, 12.5, 0.72, { bg: C.sectionBg, border: C.divider });
  s.addText('🔢  KEY FACT  ——  80%+ Indian families perform at least 1 major puja per year.   Only 12% can easily book a verified Guruji within 48 hours.', {
    x: 0.6, y: 5.7, w: 12.2, h: 0.46,
    align: 'center', fontSize: 12, color: C.saffron, bold: true,
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — The Solution
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '💡  THE SOLUTION');
  slideTitle(s, '🕉  The Solution — Sanatan Guruji', 'Book a verified Guruji for any puja — anytime, anywhere, in minutes');

  // Tagline strip
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.65, w: 12.5, h: 0.45,
    fill: { color: C.saffron }, line: { type: 'none' }, rectRadius: 0.07,
  });
  s.addText('✨  ONE STOP SPIRITUAL SOLUTION  —  Any Puja. Any City. Anytime. Anywhere.', {
    x: 0.4, y: 1.65, w: 12.5, h: 0.45,
    align: 'center', fontSize: 13, color: C.white, bold: true,
  });

  const features = [
    '✅  Verified Gurujis across 100+ cities in India',
    '✅  50+ puja types — home visit or live video call',
    '✅  Easy UPI payment — pay now or on puja day',
    '✅  Booking confirmed in minutes, not days',
    '✅  Star ratings for Gurujis — and for customers too',
    '✅  FREE registration for both Gurujis and families',
  ];
  card(s, 0.4, 2.25, 7.8, 2.85, { bg: 'FFFCF7', border: C.divider });
  features.forEach((f, i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    s.addText(f, {
      x: 0.6 + col * 3.9, y: 2.42 + row * 0.88,
      w: 3.75, h: 0.78,
      fontSize: 12, color: C.bodyText, lineSpacingMultiple: 1.4,
    });
  });

  // Stats
  const stats = [
    { n: '100+', l: 'Cities in India' },
    { n: '50+',  l: 'Puja Types' },
    { n: '₹499', l: 'Starting Price' },
    { n: '15 min', l: 'Avg Booking Time' },
  ];
  stats.forEach((st, i) => {
    card(s, 0.4 + i * 2.0, 5.3, 1.85, 1.12, { bg: C.sectionBg, border: C.divider });
    s.addText(st.n, { x: 0.4 + i * 2.0, y: 5.38, w: 1.85, h: 0.52, align: 'center', fontSize: 22, color: C.saffron, bold: true });
    s.addText(st.l, { x: 0.4 + i * 2.0, y: 5.9, w: 1.85, h: 0.38, align: 'center', fontSize: 10, color: C.mutedText });
  });

  // FREE badge
  card(s, 8.5, 2.25, 4.3, 2.85, { bg: C.sectionBg, border: C.goldLt });
  s.addText('🎉', { x: 8.5, y: 2.35, w: 4.3, h: 0.65, align: 'center', fontSize: 36 });
  s.addText('FREE', { x: 8.5, y: 3.05, w: 4.3, h: 0.65, align: 'center', fontSize: 42, color: C.saffron, bold: true });
  s.addText('Registration for All', { x: 8.6, y: 3.72, w: 4.1, h: 0.35, align: 'center', fontSize: 14, color: C.darkText });
  s.addText('Sanatan Guruji earns only\na small commission per\ncompleted booking', {
    x: 8.6, y: 4.12, w: 4.1, h: 0.85,
    align: 'center', fontSize: 11, color: C.mutedText, lineSpacingMultiple: 1.45,
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — How It Works
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '⚙️  HOW IT WORKS');
  slideTitle(s, '🕉  How It Works', 'Simple 5-step process — for families and Gurujis alike');

  const steps = [
    { n: '1', icon: '📍', title: 'Search',
      body: 'Open the app, pick your city, puja type & date. Choose a specific Guruji or let us find the best match near you.' },
    { n: '2', icon: '📋', title: 'Book',
      body: 'Fill a short form. Pay via UPI securely — or pay cash on puja day. Add a samagri kit too.' },
    { n: '3', icon: '🔔', title: 'Confirm',
      body: 'Sanatan Guruji notifies the right Guruji. Get booking confirmed in minutes — anytime, anywhere.' },
    { n: '4', icon: '🙏', title: 'Puja',
      body: 'Guruji visits your home or connects via live video call. Track everything in the app in real time.' },
    { n: '5', icon: '⭐', title: 'Rate & Share',
      body: 'Rate your Guruji. Guruji rates you too. Together we build a trusted spiritual community.' },
  ];

  steps.forEach((st, i) => {
    const x = 0.35 + i * 2.55;
    if (i < steps.length - 1) {
      s.addShape(pptx.ShapeType.rightArrow, {
        x: x + 2.02, y: 2.68, w: 0.5, h: 0.32,
        fill: { color: C.divider }, line: { type: 'none' },
      });
    }
    card(s, x, 1.72, 2.12, 3.85, { bg: 'FFFCF6', border: C.cardBorder });
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.71, y: 1.8, w: 0.7, h: 0.7,
      fill: { color: C.saffron }, line: { type: 'none' },
    });
    s.addText(st.n, { x: x + 0.71, y: 1.8, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 16, color: C.white, bold: true });
    s.addText(st.icon, { x, y: 2.58, w: 2.12, h: 0.6, align: 'center', fontSize: 28 });
    s.addText(st.title, { x: x + 0.1, y: 3.22, w: 1.92, h: 0.38, align: 'center', fontSize: 14, color: C.saffron, bold: true });
    s.addText(st.body, { x: x + 0.1, y: 3.64, w: 1.92, h: 1.82, fontSize: 10, color: C.bodyText, lineSpacingMultiple: 1.45, align: 'center' });
  });

  card(s, 0.4, 5.72, 12.5, 0.62, { bg: C.sectionBg, border: C.divider });
  s.addText('🎉  Both Gurujis and Families register for FREE — Sanatan Guruji earns only a small commission when a puja booking is completed.', {
    x: 0.6, y: 5.83, w: 12.2, h: 0.38,
    align: 'center', fontSize: 12, color: C.saffron, bold: true,
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Market Opportunity
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '📊  MARKET SIZE');
  slideTitle(s, '🕉  Market Opportunity', 'Bharat + Global Hindu Diaspora — a massive underserved market in 2026');

  const markets = [
    { label: 'TAM', val: '₹85,000 Cr', sub: 'Total Religious Services Market (India)', accent: C.saffron, bg: 'FFF5EB' },
    { label: 'SAM', val: '₹22,000 Cr', sub: 'Online + Home Puja Bookings',             accent: C.goldLt,  bg: 'FFFBF0' },
    { label: 'SOM', val: '₹1,800 Cr',  sub: '3–5 Year Realistic Capture',              accent: C.green,   bg: 'F0FAF4' },
  ];
  markets.forEach((m, i) => {
    const x = 0.4 + i * 4.32;
    card(s, x, 1.68, 4.1, 1.75, { bg: m.bg, border: m.accent });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.68, w: 4.1, h: 0.1, fill: { color: m.accent }, line: { type: 'none' } });
    s.addText(m.label, { x: x + 0.15, y: 1.85, w: 3.8, h: 0.4, align: 'center', fontSize: 20, color: m.accent, bold: true });
    s.addText(m.val, { x: x + 0.15, y: 2.25, w: 3.8, h: 0.55, align: 'center', fontSize: 26, color: C.darkText, bold: true });
    s.addText(m.sub, { x: x + 0.15, y: 2.82, w: 3.8, h: 0.45, align: 'center', fontSize: 10, color: C.mutedText });
  });

  const countries = [
    { flag: '🇮🇳', name: 'India',     n1: '110 Cr Hindus', n2: '~22 Cr active puja-seeking families' },
    { flag: '🇸🇬', name: 'Singapore', n1: '3.6 Lakh Hindus', n2: '~90,000 target customers' },
    { flag: '🇺🇸', name: 'USA',       n1: '32 Lakh Indian Hindus', n2: '~8 Lakh online puja seekers' },
    { flag: '🇬🇧', name: 'UK',        n1: '14 Lakh Hindus', n2: '~3.5 Lakh diaspora families' },
    { flag: '🇦🇺', name: 'Australia', n1: '6.8 Lakh Hindus', n2: '~1.7 Lakh online seekers' },
    { flag: '🇨🇦', name: 'Canada',    n1: '5.5 Lakh Hindus', n2: '~1.3 Lakh diaspora families' },
  ];
  countries.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.32;
    const y = 3.65 + row * 1.22;
    const isIndia = (i === 0);
    card(s, x, y, 4.1, 1.1, { bg: isIndia ? 'FFF8F0' : C.cardBg, border: isIndia ? C.saffron : C.cardBorder });
    s.addText(`${c.flag}  ${c.name}`, { x: x + 0.18, y: y + 0.1, w: 3.75, h: 0.38, fontSize: 14, color: C.darkText, bold: true });
    s.addText(`${c.n1}  ·  ${c.n2}`, { x: x + 0.18, y: y + 0.52, w: 3.75, h: 0.46, fontSize: 10, color: C.bodyText });
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Competitive Advantage
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '🏆  COMPETITIVE EDGE');
  slideTitle(s, '🕉  Sanatan Guruji vs Others', 'Why we are different from what exists today');

  const colX = [0.4, 4.05, 6.22, 8.39, 10.56];
  const colW = [3.6, 2.1, 2.1, 2.1, 2.1];
  const headers = ['Feature / Capability', 'Sanatan Guruji', 'Other Portals A', 'Other Portals B', 'Word of Mouth'];

  headers.forEach((h, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: colX[i], y: 1.68, w: colW[i], h: 0.5,
      fill: { color: i === 1 ? C.saffron : C.sectionBg },
      line: { color: C.divider, width: 0.6 },
    });
    s.addText(h, {
      x: colX[i], y: 1.68, w: colW[i], h: 0.5,
      align: 'center', valign: 'middle', fontSize: 11,
      color: i === 1 ? C.white : C.darkText, bold: true,
      margin: i === 0 ? [0, 0, 0, 8] : 0,
    });
  });

  const rows = [
    ['Verified Gurujis',           '✅ Yes',    '⚠️ Partial', '❌ No',  '❌ No'],
    ['50+ Puja Types',             '✅ Yes',    '⚠️ Limited', '❌ No',  '❌ No'],
    ['Online Video Puja',          '✅ Yes',    '❌ No',      '❌ No',  '❌ No'],
    ['Real-time Booking Tracking', '✅ Yes',    '❌ No',      '✅ Yes', '❌ No'],
    ['Ratings for Both Sides',     '✅ Yes',    '❌ No',      '✅ Yes', '❌ No'],
    ['Free Registration',          '✅ Yes',    '❌ No',      '❌ No',  '❌ No'],
    ['Samagri Delivery',           '✅ Coming', '❌ No',      '❌ No',  '❌ No'],
    ['Guruji Learning Portal',     '✅ Coming', '❌ No',      '❌ No',  '❌ No'],
  ];

  rows.forEach((row, ri) => {
    const rowY = 2.22 + ri * 0.55;
    const rowBg = ri % 2 === 0 ? C.white : C.pageBg;
    colX.forEach((cx, ci) => {
      s.addShape(pptx.ShapeType.rect, {
        x: cx, y: rowY, w: colW[ci], h: 0.5,
        fill: { color: ci === 1 ? 'FFF7F0' : rowBg },
        line: { color: C.divider, width: 0.4 },
      });
      const val = row[ci] || row[0];
      const cellVal = ci === 0 ? row[0] : row[ci];
      const isCheck = cellVal.startsWith('✅');
      const isCross = cellVal.startsWith('❌');
      const isWarn  = cellVal.startsWith('⚠️');
      const cellColor = isCheck ? C.green : isCross ? C.red : isWarn ? C.warn : C.bodyText;
      s.addText(cellVal, {
        x: cx, y: rowY, w: colW[ci], h: 0.5,
        align: ci === 0 ? 'left' : 'center', valign: 'middle',
        fontSize: ci === 0 ? 11 : 12,
        color: ci === 1 ? (isCheck ? C.green : C.red) : cellColor,
        bold: ci === 1 && isCheck,
        margin: ci === 0 ? [0, 0, 0, 8] : 0,
      });
    });
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Business Model
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '💰  BUSINESS MODEL');
  slideTitle(s, '🕉  Business Model', 'Simple, fair & dharmic — free for all, commission only on completed bookings');

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.65, w: 12.5, h: 0.46,
    fill: { color: C.saffron }, line: { type: 'none' }, rectRadius: 0.07,
  });
  s.addText('🎉  NO registration fees — Gurujis join FREE. Families book FREE. Sanatan Guruji earns only a small commission on each completed puja booking.', {
    x: 0.55, y: 1.72, w: 12.2, h: 0.33,
    fontSize: 12, color: C.white, bold: true, align: 'center',
  });

  const blocks = [
    { icon: '💰', title: 'How We Earn', points: [
      '▸  Small commission per completed booking',
      '▸  Gurujis pay nothing to join the platform',
      '▸  Families pay nothing to register or search',
      '▸  Optional featured/verified badge for Gurujis',
    ]},
    { icon: '👨‍👩‍👧', title: 'Who Uses the Platform', points: [
      '▸  Families booking pujas — weddings, Namkaran, Griha Pravesh, festivals',
      '▸  Individual Gurujis growing their reach digitally',
      '▸  Corporate offices & housing societies (bulk bookings)',
      '▸  NRI families worldwide for online video pujas',
    ]},
    { icon: '📈', title: 'Growth Strategy', points: [
      '▸  Referrals: families invite families — both get rewards',
      '▸  Guruji word-of-mouth: happy Gurujis bring more Gurujis',
      '▸  City-by-city expansion starting from metro cities',
      '▸  Samagri & big event services add value per booking',
    ]},
  ];

  blocks.forEach((b, i) => {
    const x = 0.4 + i * 4.32;
    card(s, x, 2.3, 4.1, 3.65, { bg: 'FFFCF8', border: C.cardBorder });
    s.addShape(pptx.ShapeType.rect, { x, y: 2.3, w: 4.1, h: 0.06, fill: { color: C.saffron }, line: { type: 'none' } });
    s.addText(b.icon, { x, y: 2.38, w: 4.1, h: 0.62, align: 'center', fontSize: 28 });
    s.addText(b.title, { x: x + 0.15, y: 3.05, w: 3.8, h: 0.4, align: 'center', fontSize: 14, color: C.saffron, bold: true });
    b.points.forEach((pt, pi) => {
      s.addText(pt, { x: x + 0.2, y: 3.52 + pi * 0.57, w: 3.7, h: 0.5, fontSize: 10.5, color: C.bodyText, lineSpacingMultiple: 1.3 });
    });
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Future Phases
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '🚀  FUTURE PHASES');
  slideTitle(s, '🕉  Future Phases — One Stop Spiritual Platform', 'Sanatan Guruji: your complete spiritual journey partner, for life');

  const futures = [
    { icon: '🛒', title: 'Online Samagri',       body: 'Ready-made puja kits delivered to your door — fresh flowers, diyas, agarbatti & more.' },
    { icon: '📱', title: 'Online Pujas',          body: 'Live video pujas by verified Gurujis for NRI families & busy urban devotees worldwide.' },
    { icon: '📚', title: 'Guruji Learning',       body: 'Gurujis learn new & rare puja vidhi through video courses — grow skills, earn more.' },
    { icon: '🏛️', title: 'Ved Shala Tie-ups',     body: 'Partner with Vedic schools to onboard next-gen Gurujis trained in authentic traditions.' },
    { icon: '🎙️', title: 'Lectures by Big Gurujis', body: 'Live & recorded talks from respected saints & scholars — accessible to every devotee.' },
    { icon: '🛡️', title: 'Guruji Insurance',      body: 'Health & life cover for Gurujis through insurance tie-ups — because they deserve protection.' },
    { icon: '🚗', title: 'Cab Tie-ups',            body: 'Easy pickup & drop for Gurujis for home puja visits — making every booking seamless.' },
    { icon: '🎉', title: 'Big Events & Yagnas',   body: 'Organise Gurujis for Bhagwat Katha, new mandir openings & community yagnas.' },
  ];

  futures.forEach((f, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 3.22;
    const y = 1.78 + row * 2.42;
    card(s, x, y, 3.05, 2.25, { bg: 'FFFCF8', border: C.cardBorder });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 3.05, h: 0.06, fill: { color: i % 2 === 0 ? C.saffron : C.goldLt }, line: { type: 'none' } });
    s.addText(f.icon, { x, y: y + 0.1, w: 3.05, h: 0.56, align: 'center', fontSize: 24 });
    s.addText(f.title, { x: x + 0.1, y: y + 0.7, w: 2.85, h: 0.4, align: 'center', fontSize: 12, color: C.saffron, bold: true });
    s.addText(f.body, { x: x + 0.1, y: y + 1.14, w: 2.85, h: 1.0, align: 'center', fontSize: 9.5, color: C.bodyText, lineSpacingMultiple: 1.4 });
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Roadmap
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '🗺️  ROADMAP');
  slideTitle(s, '🕉  Roadmap & Milestones', 'Building the complete spiritual ecosystem — step by step from 2026');

  const phases = [
    { n: '1', label: '2026 — TODAY', title: 'Live Platform', accent: C.saffron,
      points: ['Web + Mobile app live', 'Verified Guruji booking', 'UPI payments & ratings', 'Admin dashboard'] },
    { n: '2', label: '+6 MONTHS', title: 'Scale India', accent: C.goldLt,
      points: ['50 cities', 'Samagri kit delivery', 'Corporate bookings', 'Guruji Pro listing'] },
    { n: '3', label: '+12 MONTHS', title: 'Online Pujas & NRI', accent: 'E85D04',
      points: ['Live video pujas', 'Singapore & USA launch', 'Guruji learning portal', 'Cab tie-ups'] },
    { n: '4', label: '+24 MONTHS', title: 'Full Ecosystem', accent: '9333EA',
      points: ['Ved Shala tie-ups', 'Big event services', 'Guruji insurance', 'Lectures by big Gurujis'] },
  ];

  // Timeline line
  s.addShape(pptx.ShapeType.line, {
    x: 1.5, y: 2.85, w: 10.4, h: 0,
    line: { color: C.divider, width: 2 },
  });

  phases.forEach((ph, i) => {
    const x = 0.35 + i * 3.22;
    // dot
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 1.12, y: 2.62, w: 0.5, h: 0.5,
      fill: { color: ph.accent }, line: { type: 'none' },
    });
    // phase number
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.76, y: 1.6, w: 0.75, h: 0.75,
      fill: { color: ph.accent }, line: { type: 'none' },
    });
    s.addText(ph.n, { x: x + 0.76, y: 1.6, w: 0.75, h: 0.75, align: 'center', valign: 'middle', fontSize: 20, color: C.white, bold: true });

    card(s, x, 3.18, 3.05, 3.5, { bg: 'FFFCF8', border: C.cardBorder });
    s.addShape(pptx.ShapeType.rect, { x, y: 3.18, w: 3.05, h: 0.08, fill: { color: ph.accent }, line: { type: 'none' } });
    s.addText(ph.label, { x: x + 0.1, y: 3.28, w: 2.85, h: 0.35, align: 'center', fontSize: 10, color: ph.accent, bold: true });
    s.addText(ph.title, { x: x + 0.1, y: 3.65, w: 2.85, h: 0.42, align: 'center', fontSize: 14, color: C.darkText, bold: true });
    ph.points.forEach((pt, pi) => {
      s.addText(`▸  ${pt}`, { x: x + 0.18, y: 4.14 + pi * 0.58, w: 2.7, h: 0.5, fontSize: 11, color: C.bodyText });
    });
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — The Ask
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionPill(s, '🤝  THE ASK');
  slideTitle(s, '🕉  The Ask', 'Join us in building Bharat\'s spiritual future');

  // Raise box
  card(s, 0.4, 1.68, 5.7, 1.95, { bg: C.sectionBg, border: C.saffron });
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.68, w: 5.7, h: 0.08, fill: { color: C.saffron }, line: { type: 'none' } });
  s.addText('WE WANT TO RAISE', { x: 0.55, y: 1.82, w: 5.4, h: 0.35, align: 'center', fontSize: 11, color: C.mutedText, bold: true, charSpacing: 1.5 });
  s.addText('₹1.5 Crore', { x: 0.55, y: 2.18, w: 5.4, h: 0.7, align: 'center', fontSize: 36, color: C.saffron, bold: true });
  s.addText('Seed Round  |  15% Equity', { x: 0.55, y: 2.9, w: 5.4, h: 0.35, align: 'center', fontSize: 13, color: C.darkText });

  // Use of funds
  card(s, 6.3, 1.68, 6.6, 1.95, { bg: C.cardBg, border: C.cardBorder });
  s.addText('USE OF FUNDS', { x: 6.45, y: 1.78, w: 6.3, h: 0.32, fontSize: 11, color: C.saffron, bold: true, charSpacing: 1.5 });
  const funds = [
    ['40%', 'Product & Tech (App + Platform)'],
    ['30%', 'Marketing & Guruji Onboarding'],
    ['20%', 'City Expansion & Operations'],
    ['10%', 'Legal, Compliance & Team'],
  ];
  funds.forEach(([pct, label], i) => {
    s.addText(pct, { x: 6.45, y: 2.16 + i * 0.35, w: 0.75, h: 0.32, fontSize: 12, color: C.saffron, bold: true });
    s.addText(label, { x: 7.25, y: 2.16 + i * 0.35, w: 5.5, h: 0.32, fontSize: 11, color: C.bodyText });
  });

  // Why invest now
  s.addText('WHY INVEST NOW?', { x: 0.4, y: 3.78, w: 12.5, h: 0.36, fontSize: 13, color: C.saffron, bold: true, charSpacing: 1.5 });
  const reasons = [
    { icon: '📱', text: 'UPI: 9 Billion+ transactions/month — digital payments are mainstream in India (2026)' },
    { icon: '🌐', text: '3× more families now open to online & video spiritual services post-2020' },
    { icon: '🌍', text: 'NRI diaspora actively seeks trusted online pujas — a global market ready to be served' },
    { icon: '📲', text: '80%+ smartphone penetration in urban India — the audience is already digital' },
    { icon: '🇮🇳', text: 'Government push for digital services in Tier-2/3 cities — massive growth ahead' },
    { icon: '📚', text: 'Vedic knowledge is at risk of fading — Sanatan Guruji is the platform to preserve it' },
  ];
  reasons.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    accentCard(s, 0.4 + col * 6.35, 4.24 + row * 0.85, 6.1, 0.75);
    s.addText(r.icon, { x: 0.62 + col * 6.35, y: 4.3 + row * 0.85, w: 0.52, h: 0.62, fontSize: 18, align: 'center' });
    s.addText(r.text, { x: 1.18 + col * 6.35, y: 4.3 + row * 0.85, w: 5.18, h: 0.62, fontSize: 10.5, color: C.bodyText, lineSpacingMultiple: 1.35 });
  });
  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Thank You
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  // saffron left panel
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 5.8, h: 7.5, fill: { color: C.saffron }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.rect, { x: 5.8, y: 0, w: 0.18, h: 7.5, fill: { color: C.goldLt }, line: { type: 'none' } });

  // Left panel
  s.addText('🕉', { x: 0.3, y: 0.6, w: 5.2, h: 1.8, fontSize: 80, align: 'center', valign: 'middle' });
  s.addText('॥ श्री गणेशाय नमः ॥', { x: 0.3, y: 2.5, w: 5.2, h: 0.42, align: 'center', fontSize: 14, color: 'FFE0C0', italic: true });
  s.addText('Sanatan Guruji', { x: 0.3, y: 3.0, w: 5.2, h: 0.72, align: 'center', fontSize: 30, color: C.white, bold: true });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 3.82, w: 4.6, h: 0.44,
    fill: { color: 'D04A00' }, line: { type: 'none' }, rectRadius: 0.08,
  });
  s.addText('ONE STOP SPIRITUAL SOLUTION', {
    x: 0.6, y: 3.82, w: 4.6, h: 0.44,
    align: 'center', fontSize: 10.5, color: C.white, bold: true, charSpacing: 1.5,
  });
  s.addText('sanatanguruji.com', { x: 0.3, y: 4.45, w: 5.2, h: 0.35, align: 'center', fontSize: 13, color: 'FFD090' });
  s.addShape(pptx.ShapeType.line, { x: 0.6, y: 5.05, w: 4.6, h: 0, line: { color: 'D05000', width: 0.8 } });
  s.addText('Ojus Kulkarni\nFounder & CEO', { x: 0.3, y: 5.18, w: 5.2, h: 0.72, align: 'center', fontSize: 14, color: 'FFD090', lineSpacingMultiple: 1.4 });

  // Right panel
  s.addText('Let\'s bring every puja to life\nand celebrate every Guruji', {
    x: 6.3, y: 0.65, w: 6.7, h: 1.5,
    fontSize: 26, color: C.darkText, bold: true, lineSpacingMultiple: 1.2,
  });
  s.addShape(pptx.ShapeType.line, { x: 6.3, y: 2.3, w: 6.7, h: 0, line: { color: C.divider, width: 1 } });
  s.addText(
    'Every family deserves a joyful, trusted puja experience.\nEvery Guruji deserves to be found, respected & celebrated.\n\nSanatan Guruji is that platform — built with devotion.',
    { x: 6.3, y: 2.45, w: 6.7, h: 1.35, fontSize: 13, color: C.bodyText, lineSpacingMultiple: 1.6 }
  );

  // Contact card
  card(s, 6.3, 3.95, 6.7, 1.65, { bg: C.sectionBg, border: C.divider });
  s.addText('GET IN TOUCH', { x: 6.45, y: 4.08, w: 6.4, h: 0.32, fontSize: 11, color: C.saffron, bold: true, charSpacing: 2 });
  const contacts = [
    { icon: '📧', val: 'ojus@sanatanguruji.com' },
    { icon: '🌐', val: 'www.sanatanguruji.com' },
    { icon: '📍', val: 'India  |  Singapore  |  Global' },
  ];
  contacts.forEach((c, i) => {
    s.addText(`${c.icon}  ${c.val}`, { x: 6.45, y: 4.46 + i * 0.38, w: 6.4, h: 0.34, fontSize: 12, color: C.darkText });
  });

  s.addText('🙏  Thank You  🙏', { x: 6.3, y: 5.8, w: 6.7, h: 0.6, align: 'center', fontSize: 20, color: C.saffron, bold: true });
  s.addText('Dharmic Technology for Bharat & the Global Hindu Community', { x: 6.3, y: 6.52, w: 6.7, h: 0.3, fontSize: 10, color: C.mutedText, italic: true });
}

// ─── Save ────────────────────────────────────────────────────────────────────
await pptx.writeFile({ fileName: 'attached_assets/SanatanGuruji_PitchDeck_Final.pptx' });
console.log('Pitch deck written successfully — 11 slides, white theme.');
