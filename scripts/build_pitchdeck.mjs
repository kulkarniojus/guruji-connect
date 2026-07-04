import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  saffron:  'E85D04',
  gold:     'F4A102',
  deepBg:   '0D0600',
  darkBg:   '1A0800',
  cardBg:   '2A1200',
  midBg:    '3D1C00',
  white:    'FFFFFF',
  offWhite: 'FFF5E6',
  lightGold:'FFD580',
  cream:    'FFF0C8',
  green:    '22C55E',
  red:      'EF4444',
  warn:     'FBBF24',
  muted:    'BBA070',
};

// ─── Shared Helpers ──────────────────────────────────────────────────────────
function addBg(slide, opts = {}) {
  slide.background = { color: opts.color || C.deepBg };
  // decorative top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: C.saffron },
    line: { type: 'none' },
  });
  // decorative bottom bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.42, w: '100%', h: 0.08,
    fill: { color: C.gold },
    line: { type: 'none' },
  });
}

function addFooter(slide) {
  slide.addText('🙏  SANATAN GURUJI  |  sanatanguruji.com  |  Confidential — For Investor Use Only', {
    x: 0, y: 7.15, w: '100%', h: 0.28,
    align: 'center', fontSize: 9, color: C.muted, bold: false,
  });
}

function sectionTag(slide, label) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 0.14, w: 1.8, h: 0.32,
    fill: { color: C.saffron },
    line: { type: 'none' },
    rectRadius: 0.05,
  });
  slide.addText(label, {
    x: 0.4, y: 0.14, w: 1.8, h: 0.32,
    align: 'center', fontSize: 10, color: C.white, bold: true,
  });
}

function slideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.4, y: 0.6, w: 12.5, h: 0.6,
    fontSize: 28, color: C.gold, bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 1.2, w: 12.5, h: 0.35,
      fontSize: 13, color: C.muted, italic: true,
    });
  }
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: opts.color || C.cardBg },
    line: { color: opts.border || C.saffron, width: 1 },
    rectRadius: 0.1,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s, { color: '0A0400' });

  // Big Om glow circle
  s.addShape(pptx.ShapeType.ellipse, {
    x: 9.2, y: 0.3, w: 4.2, h: 4.2,
    fill: { type: 'solid', color: 'E85D04', alpha: 15 },
    line: { color: 'E85D04', width: 1, dashType: 'dash' },
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: 9.7, y: 0.8, w: 3.2, h: 3.2,
    fill: { type: 'solid', color: 'F4A102', alpha: 10 },
    line: { color: 'F4A102', width: 1 },
  });
  s.addText('🕉', { x: 9.9, y: 0.9, w: 2.8, h: 2.8, fontSize: 90, align: 'center', valign: 'middle' });

  // Tagline pill
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 0.25, w: 4.5, h: 0.38,
    fill: { color: C.saffron },
    line: { type: 'none' },
    rectRadius: 0.08,
  });
  s.addText('ONE STOP SPIRITUAL SOLUTION', {
    x: 0.4, y: 0.25, w: 4.5, h: 0.38,
    align: 'center', fontSize: 11, color: C.white, bold: true, charSpacing: 1.5,
  });

  s.addText('Sanatan Guruji', {
    x: 0.4, y: 0.8, w: 8.5, h: 1.1,
    fontSize: 58, color: C.gold, bold: true,
  });
  s.addText('Your Guruji. Your Puja. Anytime. Anywhere.', {
    x: 0.4, y: 1.9, w: 8.5, h: 0.5,
    fontSize: 20, color: C.offWhite, italic: true,
  });

  s.addText("India's First Verified Guruji Booking Platform", {
    x: 0.4, y: 2.55, w: 8.5, h: 0.38,
    fontSize: 14, color: C.muted,
  });

  // Divider
  s.addShape(pptx.ShapeType.line, {
    x: 0.4, y: 3.1, w: 7, h: 0,
    line: { color: C.saffron, width: 1.5 },
  });

  s.addText(
    'A technology platform connecting Hindu families with verified Gurujis\n' +
    'for every puja, ceremony & spiritual need — at home or online.',
    { x: 0.4, y: 3.25, w: 8.5, h: 0.75, fontSize: 13, color: C.cream, lineSpacingMultiple: 1.4 }
  );

  // Status badges
  const badges = [
    { label: '✅  LIVE — 2026', col: C.green },
    { label: '🚀  SEED STAGE', col: C.saffron },
  ];
  badges.forEach((b, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.4 + i * 2.4, y: 4.2, w: 2.2, h: 0.4,
      fill: { color: C.midBg },
      line: { color: b.col, width: 1.5 },
      rectRadius: 0.08,
    });
    s.addText(b.label, {
      x: 0.4 + i * 2.4, y: 4.2, w: 2.2, h: 0.4,
      align: 'center', fontSize: 11, color: b.col, bold: true,
    });
  });

  // Founder block
  card(s, 0.4, 5.0, 5.5, 0.95, { color: C.midBg, border: C.gold });
  s.addText('Founder & CEO', {
    x: 0.55, y: 5.1, w: 5.2, h: 0.3,
    fontSize: 10, color: C.muted,
  });
  s.addText('Ojus Kulkarni', {
    x: 0.55, y: 5.4, w: 5.2, h: 0.38,
    fontSize: 18, color: C.gold, bold: true,
  });

  s.addText('sanatanguruji.com', {
    x: 0.4, y: 6.15, w: 8.5, h: 0.35,
    fontSize: 14, color: C.saffron,
  });
  s.addText('Dharmic Technology for Bharat & the Global Hindu Community', {
    x: 0.4, y: 6.55, w: 8.5, h: 0.3,
    fontSize: 11, color: C.muted, italic: true,
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The Problem
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '🔍  THE PROBLEM');
  slideTitle(s, '🕉  The Problem We Solve', 'Real pain points from families across India — every single day');

  // Quote card
  card(s, 0.4, 1.65, 12.5, 1.0, { color: '1F0A00', border: C.gold });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.65, w: 0.12, h: 1.0,
    fill: { color: C.gold },
    line: { type: 'none' },
  });
  s.addText(
    '"My son\'s Namkaran was next week and I spent 3 days trying to find a good Guruji. I called everyone I knew! I wish there was an app like Ola but for Gurujis."',
    { x: 0.65, y: 1.72, w: 10.5, h: 0.55, fontSize: 12, color: C.cream, italic: true, lineSpacingMultiple: 1.4 }
  );
  s.addText('— Real customer, Pune, 2026', {
    x: 0.65, y: 2.3, w: 10.5, h: 0.28, fontSize: 10, color: C.muted,
  });

  // 3 problem cards
  const problems = [
    {
      icon: '🔍', title: 'Hard to Find',
      body: 'Families planning Namkaran, Griha Pravesh or Satyanarayan Katha rely on friends and word-of-mouth. It takes days and often fails.',
    },
    {
      icon: '📚', title: 'Limited Pujas',
      body: 'Many special or regional pujas never happen because no local Guruji knows them. Families skip important traditions from their roots.',
    },
    {
      icon: '💼', title: 'Gurujis Struggle',
      body: 'Thousands of learned Pandits earn very little and have no digital presence. Their knowledge deserves a bigger stage and steady income.',
    },
  ];
  problems.forEach((p, i) => {
    const x = 0.4 + i * 4.32;
    card(s, x, 2.85, 4.1, 2.55, { color: C.cardBg, border: C.saffron });
    s.addText(p.icon, { x, y: 2.95, w: 4.1, h: 0.55, align: 'center', fontSize: 30 });
    s.addText(p.title, {
      x: x + 0.15, y: 3.55, w: 3.8, h: 0.38,
      align: 'center', fontSize: 15, color: C.gold, bold: true,
    });
    s.addText(p.body, {
      x: x + 0.15, y: 3.98, w: 3.8, h: 1.28,
      fontSize: 11, color: C.offWhite, lineSpacingMultiple: 1.45, align: 'center',
    });
  });

  // Key fact banner
  card(s, 0.4, 5.6, 12.5, 0.75, { color: '2D1400', border: C.gold });
  s.addText('🔢  KEY FACT  ——  80%+ Indian families perform at least 1 major puja per year.   Only 12% can easily book a verified Guruji within 48 hours.', {
    x: 0.6, y: 5.72, w: 12.2, h: 0.5,
    align: 'center', fontSize: 12, color: C.lightGold, bold: true,
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — The Solution
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '💡  THE SOLUTION');
  slideTitle(s, '🕉  The Solution — Sanatan Guruji', '"OLA / UBER for Gurujis" — Find, Book & Celebrate in minutes');

  // Tagline strip
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.6, w: 12.5, h: 0.45,
    fill: { color: C.saffron },
    line: { type: 'none' },
    rectRadius: 0.08,
  });
  s.addText('✨  ONE STOP SPIRITUAL SOLUTION  —  Any Puja. Any City. Any Time.', {
    x: 0.4, y: 1.6, w: 12.5, h: 0.45,
    align: 'center', fontSize: 13, color: C.white, bold: true,
  });

  // Feature checkmarks — 2 columns
  const features = [
    '✅  Verified Gurujis across 100+ cities in India',
    '✅  50+ puja types — home visit or live video call',
    '✅  Easy UPI payment — pay now or on puja day',
    '✅  Booking confirmed in minutes, not days',
    '✅  Star ratings for Gurujis — and for customers too',
    '✅  FREE registration for both Gurujis and families',
  ];
  card(s, 0.4, 2.2, 7.8, 2.9, { color: C.cardBg, border: C.saffron });
  features.forEach((f, i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    s.addText(f, {
      x: 0.6 + col * 3.9, y: 2.35 + row * 0.9,
      w: 3.75, h: 0.75,
      fontSize: 12, color: C.offWhite, lineSpacingMultiple: 1.4,
    });
  });

  // Stats cards
  const stats = [
    { n: '100+', l: 'Cities in India' },
    { n: '50+',  l: 'Puja Types' },
    { n: '₹499', l: 'Starting Price' },
    { n: '15 min', l: 'Avg Booking Time' },
  ];
  stats.forEach((st, i) => {
    card(s, 0.4 + i * 2.0, 5.35, 1.85, 1.15, { color: C.midBg, border: C.gold });
    s.addText(st.n, {
      x: 0.4 + i * 2.0, y: 5.42, w: 1.85, h: 0.55,
      align: 'center', fontSize: 22, color: C.gold, bold: true,
    });
    s.addText(st.l, {
      x: 0.4 + i * 2.0, y: 5.95, w: 1.85, h: 0.4,
      align: 'center', fontSize: 10, color: C.muted,
    });
  });

  // Big FREE badge
  card(s, 8.5, 2.2, 4.3, 2.9, { color: '1F0E00', border: C.gold });
  s.addText('🎉', { x: 8.5, y: 2.3, w: 4.3, h: 0.7, align: 'center', fontSize: 40 });
  s.addText('FREE', {
    x: 8.5, y: 3.05, w: 4.3, h: 0.65,
    align: 'center', fontSize: 40, color: C.gold, bold: true,
  });
  s.addText('Registration for All', {
    x: 8.6, y: 3.7, w: 4.1, h: 0.35,
    align: 'center', fontSize: 14, color: C.offWhite,
  });
  s.addText('Sanatan Guruji earns only\na small commission per\ncompleted booking', {
    x: 8.6, y: 4.1, w: 4.1, h: 0.9,
    align: 'center', fontSize: 11, color: C.muted, lineSpacingMultiple: 1.4,
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — How It Works
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '⚙️  HOW IT WORKS');
  slideTitle(s, '🕉  How It Works', 'Simple 5-step process — for families and Gurujis alike');

  const steps = [
    { n: '1', icon: '📍', title: 'Search',
      body: 'Pick your city, puja type & date. Or choose a specific Guruji your family already knows.' },
    { n: '2', icon: '📋', title: 'Book',
      body: 'Fill a short form and pay via UPI — or pay cash on puja day. Add a samagri kit too.' },
    { n: '3', icon: '🔔', title: 'Match',
      body: 'Sanatan Guruji notifies the right Guruji. First available one confirms your booking instantly.' },
    { n: '4', icon: '🙏', title: 'Puja',
      body: 'Guruji visits your home or connects via live video call. Track everything in the app.' },
    { n: '5', icon: '⭐', title: 'Rate & Share',
      body: 'Rate your Guruji. Guruji rates you too. Build a trusted community together.' },
  ];

  steps.forEach((st, i) => {
    const x = 0.35 + i * 2.55;
    // connector arrow
    if (i < steps.length - 1) {
      s.addShape(pptx.ShapeType.rightArrow, {
        x: x + 2.0, y: 2.7, w: 0.52, h: 0.35,
        fill: { color: C.saffron },
        line: { type: 'none' },
      });
    }
    card(s, x, 1.7, 2.1, 3.9, { color: C.cardBg, border: C.saffron });
    // Step number circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.7, y: 1.78, w: 0.7, h: 0.7,
      fill: { color: C.saffron },
      line: { type: 'none' },
    });
    s.addText(st.n, {
      x: x + 0.7, y: 1.78, w: 0.7, h: 0.7,
      align: 'center', valign: 'middle', fontSize: 15, color: C.white, bold: true,
    });
    s.addText(st.icon, { x, y: 2.55, w: 2.1, h: 0.65, align: 'center', fontSize: 30 });
    s.addText(st.title, {
      x: x + 0.1, y: 3.25, w: 1.9, h: 0.38,
      align: 'center', fontSize: 14, color: C.gold, bold: true,
    });
    s.addText(st.body, {
      x: x + 0.1, y: 3.68, w: 1.9, h: 1.78,
      fontSize: 10.5, color: C.offWhite, lineSpacingMultiple: 1.45, align: 'center',
    });
  });

  // Bottom banner
  card(s, 0.4, 5.8, 12.5, 0.65, { color: '2D1400', border: C.gold });
  s.addText('🎉  Both Gurujis and Families register for FREE — Sanatan Guruji earns only a small commission when a puja booking is completed.', {
    x: 0.6, y: 5.91, w: 12.2, h: 0.4,
    align: 'center', fontSize: 12, color: C.lightGold, bold: true,
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Market Opportunity
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '📊  MARKET SIZE');
  slideTitle(s, '🕉  Market Opportunity', 'Bharat + Global Hindu Diaspora — a massive underserved market in 2026');

  // TAM / SAM / SOM
  const markets = [
    { label: 'TAM', val: '₹85,000 Cr', sub: 'Total Religious Services Market (India)', color: C.saffron },
    { label: 'SAM', val: '₹22,000 Cr', sub: 'Online + Home Puja Bookings', color: C.gold },
    { label: 'SOM', val: '₹1,800 Cr', sub: '3–5 Year Realistic Capture', color: C.green },
  ];
  markets.forEach((m, i) => {
    const x = 0.4 + i * 4.32;
    card(s, x, 1.65, 4.1, 1.75, { color: C.cardBg, border: m.color });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.65, w: 4.1, h: 0.08, fill: { color: m.color }, line: { type: 'none' } });
    s.addText(m.label, {
      x: x + 0.15, y: 1.8, w: 3.8, h: 0.42,
      align: 'center', fontSize: 22, color: m.color, bold: true,
    });
    s.addText(m.val, {
      x: x + 0.15, y: 2.22, w: 3.8, h: 0.55,
      align: 'center', fontSize: 26, color: C.white, bold: true,
    });
    s.addText(m.sub, {
      x: x + 0.15, y: 2.82, w: 3.8, h: 0.45,
      align: 'center', fontSize: 10, color: C.muted,
    });
  });

  // Country grid
  const countries = [
    { flag: '🇮🇳', name: 'India', n1: '110 Cr Hindus', n2: '~22 Cr active puja-seeking families' },
    { flag: '🇸🇬', name: 'Singapore', n1: '5% Hindus (~3.6 Lakh)', n2: '~90,000 target customers' },
    { flag: '🇺🇸', name: 'USA', n1: '32 Lakh Indian Hindus', n2: '~8 Lakh online puja seekers' },
    { flag: '🇬🇧', name: 'UK', n1: '14 Lakh Hindus', n2: '~3.5 Lakh diaspora families' },
    { flag: '🇦🇺', name: 'Australia', n1: '6.8 Lakh Hindus', n2: '~1.7 Lakh online puja seekers' },
    { flag: '🇨🇦', name: 'Canada', n1: '5.5 Lakh Hindus', n2: '~1.3 Lakh diaspora families' },
  ];
  countries.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.32;
    const y = 3.65 + row * 1.22;
    card(s, x, y, 4.1, 1.1, { color: C.midBg, border: col === 0 && row === 0 ? C.gold : C.saffron });
    s.addText(`${c.flag}  ${c.name}`, {
      x: x + 0.15, y: y + 0.1, w: 3.8, h: 0.38,
      fontSize: 14, color: C.gold, bold: true,
    });
    s.addText(`${c.n1}  ·  ${c.n2}`, {
      x: x + 0.15, y: y + 0.52, w: 3.8, h: 0.48,
      fontSize: 10, color: C.offWhite,
    });
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Competitive Advantage (was slide 7)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '🏆  COMPETITIVE EDGE');
  slideTitle(s, '🕉  Sanatan Guruji vs Others', 'Why we are different from what exists today');

  const cols = ['Feature / Capability', 'Sanatan Guruji', 'Other Portals A', 'Other Portals B', 'Word of Mouth'];
  const colW = [3.6, 2.1, 2.1, 2.1, 2.1];
  const colX = [0.4, 4.05, 6.2, 8.35, 10.5];
  const headerColor = C.midBg;

  // Header row
  cols.forEach((col, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: colX[i], y: 1.65, w: colW[i], h: 0.52,
      fill: { color: i === 1 ? C.saffron : headerColor },
      line: { color: C.saffron, width: 0.5 },
    });
    s.addText(col, {
      x: colX[i], y: 1.65, w: colW[i], h: 0.52,
      align: 'center', valign: 'middle', fontSize: 11,
      color: i === 1 ? C.white : C.gold, bold: true,
    });
  });

  const rows = [
    ['Verified Gurujis',        '✅ Yes', '⚠️ Partial', '❌ No', '❌ No'],
    ['50+ Puja Types',          '✅ Yes', '⚠️ Limited', '❌ No', '❌ No'],
    ['Online Video Puja',       '✅ Yes', '❌ No',      '❌ No', '❌ No'],
    ['Real-time Booking Track', '✅ Yes', '❌ No',      '✅ Yes', '❌ No'],
    ['Ratings for Both Sides',  '✅ Yes', '❌ No',      '✅ Yes', '❌ No'],
    ['Free Registration',       '✅ Yes', '❌ No',      '❌ No', '❌ No'],
    ['Samagri Delivery',        '✅ Coming', '❌ No',   '❌ No', '❌ No'],
    ['Guruji Learning Portal',  '✅ Coming', '❌ No',   '❌ No', '❌ No'],
  ];

  rows.forEach((row, ri) => {
    const rowY = 2.22 + ri * 0.56;
    const rowBg = ri % 2 === 0 ? C.cardBg : C.deepBg;
    cols.forEach((_, ci) => {
      s.addShape(pptx.ShapeType.rect, {
        x: colX[ci], y: rowY, w: colW[ci], h: 0.52,
        fill: { color: ci === 1 ? '1F1000' : rowBg },
        line: { color: C.saffron, width: 0.4 },
      });
      const cellVal = ci === 0 ? row[0] : row[ci];
      const isCheck = cellVal.startsWith('✅');
      const isCross = cellVal.startsWith('❌');
      const isWarn  = cellVal.startsWith('⚠️');
      const cellColor = isCheck ? C.green : isCross ? C.red : isWarn ? C.warn : C.offWhite;
      s.addText(cellVal, {
        x: colX[ci], y: rowY, w: colW[ci], h: 0.52,
        align: ci === 0 ? 'left' : 'center', valign: 'middle',
        fontSize: ci === 0 ? 11 : 12,
        color: ci === 1 ? (isCheck ? C.lightGold : C.red) : cellColor,
        bold: ci === 1,
        margin: ci === 0 ? [0, 0, 0, 8] : 0,
      });
    });
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Business Model (was slide 8)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '💰  BUSINESS MODEL');
  slideTitle(s, '🕉  Business Model', 'Simple, fair & dharmic — free for all, commission only on bookings');

  // Free banner
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.6, w: 12.5, h: 0.5,
    fill: { color: C.saffron },
    line: { type: 'none' },
    rectRadius: 0.08,
  });
  s.addText('🎉  NO registration fees — Gurujis join FREE. Families book FREE. Sanatan Guruji earns only a small commission on each completed puja booking.', {
    x: 0.55, y: 1.68, w: 12.2, h: 0.36,
    fontSize: 12, color: C.white, bold: true, align: 'center',
  });

  const blocks = [
    {
      icon: '💰', title: 'How We Earn',
      points: [
        '▸  Small commission per completed booking',
        '▸  Gurujis pay nothing to join the platform',
        '▸  Families pay nothing to register or search',
        '▸  Featured / verified badge (optional)',
      ],
    },
    {
      icon: '👨‍👩‍👧', title: 'Who Uses the Platform',
      points: [
        '▸  Families booking pujas (weddings, Namkaran, Griha Pravesh…)',
        '▸  Individual Gurujis expanding their reach digitally',
        '▸  Corporate offices & housing societies (bulk)',
        '▸  NRI families worldwide for online pujas',
      ],
    },
    {
      icon: '📈', title: 'Growth Strategy',
      points: [
        '▸  Referral: families invite families — both get rewards',
        '▸  Guruji word-of-mouth: happy Gurujis bring Gurujis',
        '▸  City-by-city expansion starting from metro cities',
        '▸  Samagri & big event services add value per booking',
      ],
    },
  ];

  blocks.forEach((b, i) => {
    const x = 0.4 + i * 4.32;
    card(s, x, 2.3, 4.1, 3.65, { color: C.cardBg, border: C.saffron });
    s.addText(b.icon, { x, y: 2.4, w: 4.1, h: 0.62, align: 'center', fontSize: 30 });
    s.addText(b.title, {
      x: x + 0.15, y: 3.08, w: 3.8, h: 0.42,
      align: 'center', fontSize: 15, color: C.gold, bold: true,
    });
    b.points.forEach((pt, pi) => {
      s.addText(pt, {
        x: x + 0.2, y: 3.58 + pi * 0.57, w: 3.7, h: 0.52,
        fontSize: 10.5, color: C.offWhite, lineSpacingMultiple: 1.3,
      });
    });
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Future Phases (was slide 9)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '🚀  FUTURE PHASES');
  slideTitle(s, '🕉  Future Phases — One Stop Spiritual Platform', 'Sanatan Guruji: your complete spiritual journey partner, for life');

  const futures = [
    { icon: '🛒', title: 'Online Samagri',       body: 'Ready-made puja kits delivered to your door — fresh flowers, diyas, agarbatti & more.' },
    { icon: '📱', title: 'Online Pujas',          body: 'Live video pujas by verified Gurujis for NRI families & busy urban devotees worldwide.' },
    { icon: '📚', title: 'Guruji Learning',       body: 'Gurujis learn new & rare puja vidhi through video courses — grow skills, earn more.' },
    { icon: '🏛️', title: 'Ved Shala Tie-ups',     body: 'Partner with Vedic schools to onboard next-gen Gurujis trained in authentic traditions.' },
    { icon: '🎙️', title: 'Lectures by Big Gurujis', body: 'Live and recorded talks from respected saints & scholars accessible to every devotee.' },
    { icon: '🛡️', title: 'Guruji Insurance',      body: 'Health & life cover for Gurujis through insurance tie-ups — because they deserve protection.' },
    { icon: '🚗', title: 'Cab Tie-ups',            body: 'Easy pickup & drop for Gurujis for home puja visits — making every booking seamless.' },
    { icon: '🎉', title: 'Big Events & Yagnas',   body: 'Organise Gurujis for Bhagwat Katha, new mandir openings & community yagnas.' },
  ];

  futures.forEach((f, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 3.22;
    const y = 1.75 + row * 2.45;
    card(s, x, y, 3.05, 2.28, { color: C.cardBg, border: C.saffron });
    s.addText(f.icon, { x, y: y + 0.1, w: 3.05, h: 0.58, align: 'center', fontSize: 26 });
    s.addText(f.title, {
      x: x + 0.1, y: y + 0.72, w: 2.85, h: 0.42,
      align: 'center', fontSize: 12, color: C.gold, bold: true,
    });
    s.addText(f.body, {
      x: x + 0.1, y: y + 1.18, w: 2.85, h: 1.0,
      align: 'center', fontSize: 9.5, color: C.offWhite, lineSpacingMultiple: 1.4,
    });
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Roadmap (was slide 10)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '🗺️  ROADMAP');
  slideTitle(s, '🕉  Roadmap & Milestones', 'Building the complete spiritual ecosystem — step by step');

  const phases = [
    {
      n: '1', label: '2026 — TODAY', title: 'Live Platform',
      points: ['Web + Mobile app', 'Verified Guruji booking', 'UPI payments & ratings', 'Admin dashboard'],
      color: C.green,
    },
    {
      n: '2', label: '+6 MONTHS', title: 'Scale India',
      points: ['50 cities', 'Samagri kit delivery', 'Corporate bookings', 'Guruji Pro listing'],
      color: C.gold,
    },
    {
      n: '3', label: '+12 MONTHS', title: 'Online Pujas & NRI',
      points: ['Live video pujas', 'Singapore & USA launch', 'Guruji learning portal', 'Cab tie-ups'],
      color: C.saffron,
    },
    {
      n: '4', label: '+24 MONTHS', title: 'Full Ecosystem',
      points: ['Ved Shala tie-ups', 'Big event services', 'Guruji insurance', 'Lectures by big Gurujis'],
      color: 'C084FC',
    },
  ];

  // Timeline connector
  s.addShape(pptx.ShapeType.line, {
    x: 1.5, y: 2.9, w: 10.4, h: 0,
    line: { color: C.saffron, width: 2, dashType: 'dash' },
  });

  phases.forEach((ph, i) => {
    const x = 0.4 + i * 3.22;
    // dot on timeline
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 1.1, y: 2.65, w: 0.5, h: 0.5,
      fill: { color: ph.color },
      line: { type: 'none' },
    });
    card(s, x, 3.2, 3.05, 3.55, { color: C.cardBg, border: ph.color });
    s.addShape(pptx.ShapeType.rect, { x, y: 3.2, w: 3.05, h: 0.08, fill: { color: ph.color }, line: { type: 'none' } });
    s.addText(ph.label, {
      x: x + 0.1, y: 3.3, w: 2.85, h: 0.35,
      align: 'center', fontSize: 10, color: ph.color, bold: true,
    });
    s.addText(ph.title, {
      x: x + 0.1, y: 3.68, w: 2.85, h: 0.42,
      align: 'center', fontSize: 14, color: C.gold, bold: true,
    });
    ph.points.forEach((pt, pi) => {
      s.addText(`▸  ${pt}`, {
        x: x + 0.15, y: 4.18 + pi * 0.6, w: 2.75, h: 0.52,
        fontSize: 11, color: C.offWhite,
      });
    });
  });

  // Phase labels above
  phases.forEach((ph, i) => {
    const x = 0.4 + i * 3.22;
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.75, y: 1.65, w: 0.75, h: 0.75,
      fill: { color: ph.color },
      line: { type: 'none' },
    });
    s.addText(ph.n, {
      x: x + 0.75, y: 1.65, w: 0.75, h: 0.75,
      align: 'center', valign: 'middle', fontSize: 20, color: C.white, bold: true,
    });
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — The Ask (was slide 11)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  sectionTag(s, '🤝  THE ASK');
  slideTitle(s, '🕉  The Ask', 'Join us in building Bharat\'s spiritual future');

  // Raise box
  card(s, 0.4, 1.65, 5.7, 2.0, { color: '2D1400', border: C.gold });
  s.addText('WE WANT TO RAISE', {
    x: 0.55, y: 1.78, w: 5.4, h: 0.38,
    align: 'center', fontSize: 11, color: C.muted, bold: true, charSpacing: 1.5,
  });
  s.addText('₹1.5 Crore', {
    x: 0.55, y: 2.15, w: 5.4, h: 0.7,
    align: 'center', fontSize: 38, color: C.gold, bold: true,
  });
  s.addText('Seed Round  |  15% Equity', {
    x: 0.55, y: 2.88, w: 5.4, h: 0.38,
    align: 'center', fontSize: 13, color: C.offWhite,
  });

  // Use of funds
  card(s, 6.3, 1.65, 6.6, 2.0, { color: C.cardBg, border: C.saffron });
  s.addText('USE OF FUNDS', {
    x: 6.45, y: 1.75, w: 6.3, h: 0.35,
    fontSize: 11, color: C.gold, bold: true, charSpacing: 1.5,
  });
  const funds = [
    { pct: '40%', label: 'Product & Tech (App + Platform)' },
    { pct: '30%', label: 'Marketing & Guruji Onboarding' },
    { pct: '20%', label: 'City Expansion & Operations' },
    { pct: '10%', label: 'Legal, Compliance & Team' },
  ];
  funds.forEach((f, i) => {
    s.addText(`${f.pct}`, {
      x: 6.45, y: 2.15 + i * 0.35, w: 0.7, h: 0.33,
      fontSize: 12, color: C.saffron, bold: true,
    });
    s.addText(f.label, {
      x: 7.2, y: 2.15 + i * 0.35, w: 5.5, h: 0.33,
      fontSize: 11, color: C.offWhite,
    });
  });

  // Why invest now
  const reasons = [
    { icon: '📱', text: 'UPI: 9 Billion+ transactions/month — digital payments are mainstream in India' },
    { icon: '🌐', text: 'Post-2020 shift: 3× more families open to online & video spiritual services' },
    { icon: '🌍', text: 'NRI diaspora actively seeks trusted online pujas — a global market waiting to be served' },
    { icon: '📲', text: '80%+ smartphone penetration in urban India — the audience is already digital' },
    { icon: '🇮🇳', text: 'Government push for digital services in Tier-2/3 cities — massive growth ahead' },
    { icon: '📚', text: 'Vedic knowledge is at risk of fading — Sanatan Guruji is the platform to preserve it' },
  ];

  s.addText('WHY INVEST NOW?', {
    x: 0.4, y: 3.82, w: 12.5, h: 0.38,
    fontSize: 13, color: C.gold, bold: true, charSpacing: 1.5,
  });

  reasons.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(s, 0.4 + col * 6.35, 4.28 + row * 0.85, 6.1, 0.75, { color: C.cardBg, border: C.saffron });
    s.addText(r.icon, {
      x: 0.55 + col * 6.35, y: 4.35 + row * 0.85, w: 0.55, h: 0.6,
      fontSize: 18, align: 'center',
    });
    s.addText(r.text, {
      x: 1.15 + col * 6.35, y: 4.32 + row * 0.85, w: 5.2, h: 0.65,
      fontSize: 10.5, color: C.offWhite, lineSpacingMultiple: 1.35,
    });
  });

  addFooter(s);
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Thank You (was slide 12)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s, { color: '0A0400' });

  // Glow circles
  s.addShape(pptx.ShapeType.ellipse, {
    x: 5.2, y: 0.8, w: 3.0, h: 3.0,
    fill: { type: 'solid', color: 'E85D04', alpha: 12 },
    line: { color: 'E85D04', width: 1, dashType: 'dash' },
  });
  s.addText('🕉', { x: 5.6, y: 0.85, w: 2.2, h: 2.2, fontSize: 70, align: 'center', valign: 'middle' });

  s.addText('॥ श्री गणेशाय नमः ॥', {
    x: 0.4, y: 3.1, w: 12.5, h: 0.45,
    align: 'center', fontSize: 16, color: C.gold, italic: true,
  });

  s.addText('Sanatan Guruji', {
    x: 0.4, y: 3.6, w: 12.5, h: 0.85,
    align: 'center', fontSize: 48, color: C.gold, bold: true,
  });

  // Tagline pill
  s.addShape(pptx.ShapeType.roundRect, {
    x: 3.5, y: 4.5, w: 6.4, h: 0.45,
    fill: { color: C.saffron },
    line: { type: 'none' },
    rectRadius: 0.1,
  });
  s.addText('ONE STOP SPIRITUAL SOLUTION', {
    x: 3.5, y: 4.5, w: 6.4, h: 0.45,
    align: 'center', fontSize: 13, color: C.white, bold: true, charSpacing: 2,
  });

  s.addText('Let\'s bring every puja to life — and celebrate every Guruji', {
    x: 0.4, y: 5.1, w: 12.5, h: 0.38,
    align: 'center', fontSize: 13, color: C.cream, italic: true,
  });

  // Contact card
  card(s, 2.5, 5.6, 8.4, 1.25, { color: C.midBg, border: C.gold });
  s.addText('GET IN TOUCH', {
    x: 2.65, y: 5.68, w: 8.1, h: 0.3,
    align: 'center', fontSize: 10, color: C.gold, bold: true, charSpacing: 2,
  });
  s.addText('📧  ojus@sanatanguruji.com     🌐  www.sanatanguruji.com     📍  India  |  Singapore  |  Global', {
    x: 2.65, y: 6.02, w: 8.1, h: 0.38,
    align: 'center', fontSize: 12, color: C.offWhite,
  });
  s.addText('Ojus Kulkarni  —  Founder & CEO', {
    x: 2.65, y: 6.45, w: 8.1, h: 0.3,
    align: 'center', fontSize: 11, color: C.muted,
  });

  s.addText('🙏  Thank You  🙏', {
    x: 0.4, y: 6.9, w: 12.5, h: 0.42,
    align: 'center', fontSize: 14, color: C.gold, bold: true,
  });
}

// ─── Save ─────────────────────────────────────────────────────────────────
await pptx.writeFile({ fileName: 'attached_assets/SanatanGuruji_PitchDeck_Final.pptx' });
console.log('Pitch deck written successfully.');
