import PDFDocument from 'pdfkit';
import fs from 'fs';

// 16:9 slide dimensions in points (72pt = 1 inch, 13.33 x 7.5 inches)
const W = 960, H = 540;

const C = {
  saffron:  [232, 93,  4],
  saffronD: [208, 74,  0],
  gold:     [244, 161, 2],
  goldD:    [160, 112, 0],
  white:    [255, 255, 255],
  pageBg:   [255, 253, 248],
  sectionBg:[255, 243, 224],
  cardBg:   [255, 255, 255],
  darkText: [44,  21,  0],
  bodyText: [74,  48,  0],
  muted:    [138, 96,  64],
  divider:  [240, 192, 128],
  green:    [26,  122, 58],
  greenBg:  [232, 245, 237],
  red:      [192, 57,  43],
};

function rgb(arr) { return arr; }

const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
doc.pipe(fs.createWriteStream('attached_assets/SanatanGuruji_PitchDeck_Final.pdf'));

function addPage() {
  doc.addPage({ size: [W, H], margin: 0 });
}

function bg(color) {
  doc.rect(0, 0, W, H).fill(color || C.pageBg);
  // top saffron bar
  doc.rect(0, 0, W, 7).fill(C.saffron);
  // bottom gold bar
  doc.rect(0, H - 7, W, 7).fill(C.gold);
}

function footer() {
  doc.fontSize(7).fillColor(C.muted)
     .text('🙏  SANATAN GURUJI  |  sanatanguruji.com  |  Confidential — For Investor Use Only',
           0, H - 22, { align: 'center', width: W });
}

function sectionPill(label, x, y, color) {
  const c = color || C.saffron;
  doc.roundedRect(x || 28, y || 12, 160, 22, 4).fill(c);
  doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
     .text(label, (x || 28) + 4, (y || 12) + 6, { width: 152, align: 'center' });
}

function title(mainText, subText) {
  doc.fontSize(22).fillColor(C.darkText).font('Helvetica-Bold')
     .text(mainText, 28, 44, { width: W - 56 });
  if (subText) {
    doc.fontSize(10).fillColor(C.muted).font('Helvetica-Oblique')
       .text(subText, 28, 72, { width: W - 56 });
  }
  doc.moveTo(28, 90).lineTo(W - 28, 90).lineWidth(1).strokeColor(C.divider).stroke();
}

function card(x, y, w, h, bg, borderColor) {
  doc.roundedRect(x, y, w, h, 6)
     .fillAndStroke(bg || C.cardBg, borderColor || C.divider);
}

function accentBar(x, y, w, color) {
  doc.rect(x, y, w, 5).fill(color || C.saffron);
}

// ════════════ SLIDE 1 — COVER ════════════
addPage();
// Left saffron panel
doc.rect(0, 0, 415, H).fill(C.saffron);
doc.rect(415, 0, 12, H).fill(C.gold);
doc.rect(0, 0, W, 7).fill(C.saffronD);
doc.rect(0, H - 7, W, 7).fill(C.gold);

// Om symbol area
doc.fontSize(72).fillColor(C.white).text('🕉', 0, 30, { width: 415, align: 'center' });

doc.fontSize(36).fillColor(C.white).font('Helvetica-Bold')
   .text('Sanatan Guruji', 0, 145, { width: 415, align: 'center' });

// Tagline pill
doc.roundedRect(28, 195, 360, 28, 5).fill(C.saffronD);
doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
   .text('ONE STOP SPIRITUAL SOLUTION', 28, 203, { width: 360, align: 'center', characterSpacing: 1.5 });

doc.fontSize(12).fillColor([255, 224, 192]).font('Helvetica-Oblique')
   .text('Your Guruji. Your Puja. Anytime. Anywhere.', 0, 232, { width: 415, align: 'center' });

doc.fontSize(11).fillColor([255, 208, 144]).font('Helvetica')
   .text('sanatanguruji.com', 0, 255, { width: 415, align: 'center' });

doc.moveTo(40, 418).lineTo(375, 418).lineWidth(0.8).strokeColor([208, 80, 0]).stroke();
doc.fontSize(10).fillColor([255, 208, 144]).font('Helvetica')
   .text('Founder & CEO — Ojus Kulkarni', 0, 428, { width: 415, align: 'center' });

// Right panel
doc.fontSize(20).fillColor(C.darkText).font('Helvetica-Bold')
   .text("India's First Verified\nGuruji Booking Platform", 440, 40, { width: 490, lineGap: 4 });

doc.fontSize(11).fillColor(C.bodyText).font('Helvetica')
   .text("A technology platform connecting Hindu families\nwith verified Gurujis for every puja, ceremony\n& spiritual need — at home or online.\n\nBook your Guruji in minutes — anytime, anywhere.", 440, 115, { width: 490, lineGap: 3 });

// Badges
const badges = [
  { t: '✅  LIVE — 2026', bg: C.greenBg, tc: C.green },
  { t: '🚀  SEED STAGE',  bg: C.sectionBg, tc: C.saffron },
];
badges.forEach((b, i) => {
  doc.roundedRect(440 + i * 220, 250, 205, 28, 5)
     .fillAndStroke(b.bg, b.tc);
  doc.fontSize(10).fillColor(b.tc).font('Helvetica-Bold')
     .text(b.t, 440 + i * 220, 260, { width: 205, align: 'center' });
});

// Stat grid
const stats = [['100+','Cities'],['50+','Puja Types'],['₹499','Starting'],['FREE','Registration']];
stats.forEach((st, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = 440 + col * 246, y = 298 + row * 82;
  doc.roundedRect(x, y, 230, 72, 5).fillAndStroke(C.sectionBg, C.divider);
  doc.fontSize(20).fillColor(C.saffron).font('Helvetica-Bold').text(st[0], x, y + 10, { width: 230, align: 'center' });
  doc.fontSize(9).fillColor(C.muted).font('Helvetica').text(st[1], x, y + 48, { width: 230, align: 'center' });
});

doc.fontSize(8).fillColor(C.muted).font('Helvetica-Oblique')
   .text('Dharmic Technology for Bharat & the Global Hindu Community', 440, 472, { width: 490 });
footer();

// ════════════ SLIDE 2 — PROBLEM ════════════
addPage();
bg();
sectionPill('🔍  THE PROBLEM');
title('🕉  The Problem We Solve', 'Real pain points from families across India — every single day in 2026');

// Quote
card(28, 98, W - 56, 64, [255, 250, 244], C.gold);
doc.rect(28, 98, 8, 64).fill(C.gold);
doc.fontSize(10).fillColor(C.bodyText).font('Helvetica-Oblique')
   .text('"My son\'s Namkaran was next week and I spent 3 days trying to find a good Guruji. I called everyone I knew — friends, relatives, neighbours. I wish there was a way to just book one anytime, anywhere like booking a cab."', 44, 106, { width: W - 88, lineGap: 2 });
doc.fontSize(8).fillColor(C.muted).font('Helvetica').text('— Real customer, Pune, 2026', 44, 148, { width: W - 88 });

// 3 cards
const problems = [
  { icon: '🔍', title: 'Hard to Find', body: 'Families rely only on friends and word-of-mouth for Namkaran, Griha Pravesh or Katha. It takes days and often fails.' },
  { icon: '📚', title: 'Limited Pujas', body: 'Many special regional pujas never happen because no local Guruji knows them. Important traditions get skipped.' },
  { icon: '💼', title: 'Gurujis Struggle', body: 'Thousands of learned Pandits earn little and have no digital presence. Their knowledge deserves a bigger stage.' },
];
problems.forEach((p, i) => {
  const x = 28 + i * 306, y = 172;
  card(x, y, 290, 190, [255, 253, 246], i % 2 === 0 ? C.saffron : C.gold);
  doc.fontSize(24).text(p.icon, x, y + 12, { width: 290, align: 'center' });
  doc.fontSize(12).fillColor(C.saffron).font('Helvetica-Bold').text(p.title, x, y + 52, { width: 290, align: 'center' });
  doc.fontSize(10).fillColor(C.bodyText).font('Helvetica').text(p.body, x + 10, y + 72, { width: 270, align: 'center', lineGap: 2 });
});

// Key fact
card(28, 372, W - 56, 46, C.sectionBg, C.divider);
doc.fontSize(10).fillColor(C.saffron).font('Helvetica-Bold')
   .text('🔢  KEY FACT — 80%+ Indian families perform at least 1 major puja per year.  Only 12% can easily book a verified Guruji within 48 hours.', 40, 384, { width: W - 80, align: 'center' });
footer();

// ════════════ SLIDE 3 — SOLUTION ════════════
addPage();
bg();
sectionPill('💡  THE SOLUTION');
title('🕉  The Solution — Sanatan Guruji', 'Book a verified Guruji for any puja — anytime, anywhere, in minutes');

// Orange strip
doc.roundedRect(28, 98, W - 56, 30, 5).fill(C.saffron);
doc.fontSize(11).fillColor(C.white).font('Helvetica-Bold')
   .text('✨  ONE STOP SPIRITUAL SOLUTION  —  Any Puja. Any City. Anytime. Anywhere.', 28, 107, { width: W - 56, align: 'center' });

// Features
const feats = [
  '✅  Verified Gurujis across 100+ cities in India',
  '✅  50+ puja types — home visit or live video call',
  '✅  Easy UPI payment — pay now or on puja day',
  '✅  Booking confirmed in minutes, not days',
  '✅  Star ratings for Gurujis — and customers too',
  '✅  FREE registration for both Gurujis and families',
];
card(28, 138, 545, 210, [255, 252, 247], C.divider);
feats.forEach((f, i) => {
  const col = Math.floor(i / 3), row = i % 3;
  doc.fontSize(10).fillColor(C.bodyText).font('Helvetica')
     .text(f, 40 + col * 272, 150 + row * 62, { width: 260, lineGap: 2 });
});

// FREE badge
card(590, 138, 340, 210, C.sectionBg, C.gold);
doc.fontSize(30).text('🎉', 590, 150, { width: 340, align: 'center' });
doc.fontSize(32).fillColor(C.saffron).font('Helvetica-Bold').text('FREE', 590, 188, { width: 340, align: 'center' });
doc.fontSize(13).fillColor(C.darkText).font('Helvetica').text('Registration for All', 590, 228, { width: 340, align: 'center' });
doc.fontSize(9).fillColor(C.muted).font('Helvetica')
   .text('Sanatan Guruji earns only a small\ncommission per completed booking', 600, 254, { width: 320, align: 'center', lineGap: 2 });

// Stats row
const stats3 = [['100+','Cities in India'],['50+','Puja Types'],['₹499','Starting Price'],['15 min','Avg Booking Time']];
stats3.forEach((st, i) => {
  card(28 + i * 228, 362, 214, 72, C.sectionBg, C.divider);
  doc.fontSize(18).fillColor(C.saffron).font('Helvetica-Bold').text(st[0], 28 + i * 228, 374, { width: 214, align: 'center' });
  doc.fontSize(9).fillColor(C.muted).font('Helvetica').text(st[1], 28 + i * 228, 400, { width: 214, align: 'center' });
});
footer();

// ════════════ SLIDE 4 — HOW IT WORKS ════════════
addPage();
bg();
sectionPill('⚙️  HOW IT WORKS');
title('🕉  How It Works', 'Simple 5-step process — for families and Gurujis alike');

const steps = [
  { n:'1', icon:'📍', title:'Search',   body:'Open app, pick city, puja type & date. Choose a specific Guruji or let us find the best one near you.' },
  { n:'2', icon:'📋', title:'Book',     body:'Fill a short form. Pay via UPI securely — or pay cash on puja day. Add samagri kit too.' },
  { n:'3', icon:'🔔', title:'Confirm',  body:'Sanatan Guruji notifies the right Guruji. Booking confirmed in minutes — anytime, anywhere.' },
  { n:'4', icon:'🙏', title:'Puja',     body:'Guruji visits your home or connects via live video call. Track everything in real time.' },
  { n:'5', icon:'⭐', title:'Rate',     body:'Rate your Guruji. Guruji rates you too. Build a trusted spiritual community together.' },
];
steps.forEach((st, i) => {
  const x = 28 + i * 183, y = 100;
  card(x, y, 170, 290, [255, 252, 246], C.divider);
  doc.circle(x + 85, y + 30, 20).fill(C.saffron);
  doc.fontSize(14).fillColor(C.white).font('Helvetica-Bold').text(st.n, x, y + 20, { width: 170, align: 'center' });
  doc.fontSize(22).text(st.icon, x, y + 55, { width: 170, align: 'center' });
  doc.fontSize(12).fillColor(C.saffron).font('Helvetica-Bold').text(st.title, x, y + 92, { width: 170, align: 'center' });
  doc.fontSize(9).fillColor(C.bodyText).font('Helvetica').text(st.body, x + 8, y + 114, { width: 154, align: 'center', lineGap: 2 });
  if (i < 4) {
    doc.polygon([x + 172, y + 140], [x + 182, y + 150], [x + 172, y + 160]).fill(C.divider);
  }
});

card(28, 402, W - 56, 36, C.sectionBg, C.divider);
doc.fontSize(10).fillColor(C.saffron).font('Helvetica-Bold')
   .text('🎉  Both Gurujis and Families register for FREE — Sanatan Guruji earns only a small commission when a booking is completed.', 40, 412, { width: W - 80, align: 'center' });
footer();

// ════════════ SLIDE 5 — MARKET ════════════
addPage();
bg();
sectionPill('📊  MARKET SIZE');
title('🕉  Market Opportunity', 'Bharat + Global Hindu Diaspora — a massive underserved market in 2026');

const markets = [
  { label:'TAM', val:'₹85,000 Cr', sub:'Total Religious Services Market (India)', accent:C.saffron, bg:[255,245,235] },
  { label:'SAM', val:'₹22,000 Cr', sub:'Online + Home Puja Bookings',             accent:C.gold,    bg:[255,251,240] },
  { label:'SOM', val:'₹1,800 Cr',  sub:'3–5 Year Realistic Capture',              accent:C.green,   bg:[240,250,244] },
];
markets.forEach((m, i) => {
  const x = 28 + i * 306, y = 98;
  card(x, y, 290, 118, m.bg, m.accent);
  doc.rect(x, y, 290, 5).fill(m.accent);
  doc.fontSize(16).fillColor(m.accent).font('Helvetica-Bold').text(m.label, x, y + 16, { width: 290, align: 'center' });
  doc.fontSize(22).fillColor(C.darkText).font('Helvetica-Bold').text(m.val, x, y + 42, { width: 290, align: 'center' });
  doc.fontSize(9).fillColor(C.muted).font('Helvetica').text(m.sub, x, y + 82, { width: 290, align: 'center' });
});

const countries = [
  { f:'🇮🇳', n:'India',     d:'110 Cr Hindus · ~22 Cr active puja-seeking families' },
  { f:'🇸🇬', n:'Singapore', d:'3.6 Lakh Hindus · ~90,000 target customers' },
  { f:'🇺🇸', n:'USA',       d:'32 Lakh Indian Hindus · ~8 Lakh online puja seekers' },
  { f:'🇬🇧', n:'UK',        d:'14 Lakh Hindus · ~3.5 Lakh diaspora families' },
  { f:'🇦🇺', n:'Australia', d:'6.8 Lakh Hindus · ~1.7 Lakh online seekers' },
  { f:'🇨🇦', n:'Canada',    d:'5.5 Lakh Hindus · ~1.3 Lakh diaspora families' },
];
countries.forEach((c, i) => {
  const col = i % 3, row = Math.floor(i / 3);
  const x = 28 + col * 306, y = 228 + row * 86;
  card(x, y, 290, 76, i === 0 ? [255,248,240] : C.cardBg, i === 0 ? C.saffron : C.divider);
  doc.fontSize(13).fillColor(C.darkText).font('Helvetica-Bold').text(`${c.f}  ${c.n}`, x + 10, y + 10, { width: 270 });
  doc.fontSize(9).fillColor(C.bodyText).font('Helvetica').text(c.d, x + 10, y + 34, { width: 270 });
});
footer();

// ════════════ SLIDE 6 — COMPETITIVE ════════════
addPage();
bg();
sectionPill('🏆  COMPETITIVE EDGE');
title('🕉  Sanatan Guruji vs Others', 'Why we are different from what exists today');

const colXs = [28, 310, 458, 606, 754], colWs = [276, 144, 144, 144, 158];
const headers6 = ['Feature / Capability','Sanatan Guruji','Other Portals A','Other Portals B','Word of Mouth'];
headers6.forEach((h, i) => {
  doc.rect(colXs[i], 98, colWs[i], 34).fillAndStroke(i === 1 ? C.saffron : C.sectionBg, C.divider);
  doc.fontSize(9).fillColor(i === 1 ? C.white : C.darkText).font('Helvetica-Bold')
     .text(h, colXs[i] + 4, 108, { width: colWs[i] - 8, align: i === 0 ? 'left' : 'center' });
});
const rows6 = [
  ['Verified Gurujis',           '✅ Yes',    '⚠️ Partial', '❌ No',  '❌ No'],
  ['50+ Puja Types',             '✅ Yes',    '⚠️ Limited', '❌ No',  '❌ No'],
  ['Online Video Puja',          '✅ Yes',    '❌ No',      '❌ No',  '❌ No'],
  ['Real-time Booking Tracking', '✅ Yes',    '❌ No',      '✅ Yes', '❌ No'],
  ['Ratings for Both Sides',     '✅ Yes',    '❌ No',      '✅ Yes', '❌ No'],
  ['Free Registration',          '✅ Yes',    '❌ No',      '❌ No',  '❌ No'],
  ['Samagri Delivery',           '✅ Coming', '❌ No',      '❌ No',  '❌ No'],
  ['Guruji Learning Portal',     '✅ Coming', '❌ No',      '❌ No',  '❌ No'],
];
rows6.forEach((row, ri) => {
  const y = 132 + ri * 38;
  const rowBg = ri % 2 === 0 ? C.cardBg : C.pageBg;
  colXs.forEach((cx, ci) => {
    doc.rect(cx, y, colWs[ci], 34).fillAndStroke(ci === 1 ? [255,247,240] : rowBg, C.divider);
    const val = row[ci];
    const isChk = val && val.startsWith('✅');
    const isCross = val && val.startsWith('❌');
    const isWarn = val && val.startsWith('⚠️');
    const tc = isChk ? C.green : isCross ? C.red : isWarn ? C.goldD : C.bodyText;
    doc.fontSize(ci === 0 ? 10 : 11).fillColor(tc).font(ci === 1 && isChk ? 'Helvetica-Bold' : 'Helvetica')
       .text(val || '', cx + 4, y + 10, { width: colWs[ci] - 8, align: ci === 0 ? 'left' : 'center' });
  });
});
footer();

// ════════════ SLIDE 7 — BUSINESS MODEL ════════════
addPage();
bg();
sectionPill('💰  BUSINESS MODEL');
title('🕉  Business Model', 'Simple, fair & dharmic — free for all, commission only on completed bookings');

doc.roundedRect(28, 98, W - 56, 30, 5).fill(C.saffron);
doc.fontSize(10).fillColor(C.white).font('Helvetica-Bold')
   .text('🎉  NO registration fees — Gurujis join FREE. Families book FREE. Commission only on completed bookings.', 28, 107, { width: W - 56, align: 'center' });

const bmBlocks = [
  { icon:'💰', title:'How We Earn', pts:['Small commission per completed booking','Gurujis pay nothing to join','Families pay nothing to register or search','Optional featured badge for Gurujis'] },
  { icon:'👨‍👩‍👧', title:'Who Uses It', pts:['Families — Namkaran, Griha Pravesh, festivals','Individual Gurujis growing their reach','Corporate offices & housing societies','NRI families for online video pujas'] },
  { icon:'📈', title:'Growth Strategy', pts:['Referrals: families invite families','Guruji word-of-mouth drives more Gurujis','City-by-city expansion from metros','Samagri & events add value per booking'] },
];
bmBlocks.forEach((b, i) => {
  const x = 28 + i * 306, y = 138;
  card(x, y, 290, 270, [255,252,248], C.divider);
  doc.rect(x, y, 290, 5).fill(C.saffron);
  doc.fontSize(24).text(b.icon, x, y + 16, { width: 290, align: 'center' });
  doc.fontSize(13).fillColor(C.saffron).font('Helvetica-Bold').text(b.title, x, y + 54, { width: 290, align: 'center' });
  b.pts.forEach((pt, pi) => {
    doc.fontSize(10).fillColor(C.bodyText).font('Helvetica')
       .text('▸  ' + pt, x + 12, y + 82 + pi * 44, { width: 266, lineGap: 2 });
  });
});
footer();

// ════════════ SLIDE 8 — FUTURE PHASES ════════════
addPage();
bg();
sectionPill('🚀  FUTURE PHASES');
title('🕉  Future Phases — One Stop Spiritual Platform', 'Sanatan Guruji: your complete spiritual journey partner, for life');

const futures = [
  { icon:'🛒', title:'Online Samagri',      body:'Ready-made puja kits delivered to door.' },
  { icon:'📱', title:'Online Pujas',         body:'Live video pujas for NRI & urban families.' },
  { icon:'📚', title:'Guruji Learning',      body:'Video courses for Gurujis — new puja vidhi.' },
  { icon:'🏛️', title:'Ved Shala Tie-ups',    body:'Next-gen Gurujis from Vedic schools.' },
  { icon:'🎙️', title:'Big Guruji Lectures',  body:'Live & recorded talks by respected saints.' },
  { icon:'🛡️', title:'Guruji Insurance',     body:'Health & life cover for our Gurujis.' },
  { icon:'🚗', title:'Cab Tie-ups',           body:'Easy pickup & drop for home puja visits.' },
  { icon:'🎉', title:'Big Events & Yagnas',  body:'Bhagwat Katha, yagnas & temple events.' },
];
futures.forEach((f, i) => {
  const col = i % 4, row = Math.floor(i / 4);
  const x = 28 + col * 228, y = 98 + row * 176;
  card(x, y, 214, 162, [255,252,248], C.divider);
  doc.rect(x, y, 214, 4).fill(i % 2 === 0 ? C.saffron : C.gold);
  doc.fontSize(20).text(f.icon, x, y + 12, { width: 214, align: 'center' });
  doc.fontSize(11).fillColor(C.saffron).font('Helvetica-Bold').text(f.title, x, y + 48, { width: 214, align: 'center' });
  doc.fontSize(9).fillColor(C.bodyText).font('Helvetica').text(f.body, x + 8, y + 70, { width: 198, align: 'center', lineGap: 2 });
});
footer();

// ════════════ SLIDE 9 — ROADMAP ════════════
addPage();
bg();
sectionPill('🗺️  ROADMAP');
title('🕉  Roadmap & Milestones', 'Building the complete spiritual ecosystem — step by step from 2026');

const phases = [
  { n:'1', label:'2026 — TODAY', title:'Live Platform', accent:C.saffron, pts:['Web + Mobile app live','Verified Guruji booking','UPI payments & ratings','Admin dashboard'] },
  { n:'2', label:'+6 MONTHS',   title:'Scale India',   accent:C.gold,    pts:['50 cities','Samagri kit delivery','Corporate bookings','Guruji Pro listing'] },
  { n:'3', label:'+12 MONTHS',  title:'Online & NRI',  accent:[200,80,0], pts:['Live video pujas','Singapore & USA launch','Guruji learning portal','Cab tie-ups'] },
  { n:'4', label:'+24 MONTHS',  title:'Full Ecosystem',accent:[147,51,234], pts:['Ved Shala tie-ups','Big event services','Guruji insurance','Big Guruji lectures'] },
];

// Timeline
doc.moveTo(60, 188).lineTo(W - 60, 188).lineWidth(1.5).strokeColor(C.divider).stroke();

phases.forEach((ph, i) => {
  const x = 28 + i * 228, y = 208;
  // dot
  doc.circle(x + 107, 188, 8).fill(ph.accent);
  // number badge
  doc.circle(x + 107, 140, 18).fill(ph.accent);
  doc.fontSize(14).fillColor(C.white).font('Helvetica-Bold').text(ph.n, x, 133, { width: 214, align: 'center' });

  card(x, y, 214, 268, [255,252,248], C.divider);
  doc.rect(x, y, 214, 5).fill(ph.accent);
  doc.fontSize(9).fillColor(ph.accent).font('Helvetica-Bold').text(ph.label, x, y + 14, { width: 214, align: 'center' });
  doc.fontSize(13).fillColor(C.darkText).font('Helvetica-Bold').text(ph.title, x, y + 34, { width: 214, align: 'center' });
  ph.pts.forEach((pt, pi) => {
    doc.fontSize(10).fillColor(C.bodyText).font('Helvetica')
       .text('▸  ' + pt, x + 12, y + 64 + pi * 44, { width: 190 });
  });
});
footer();

// ════════════ SLIDE 10 — THE ASK ════════════
addPage();
bg();
sectionPill('🤝  THE ASK');
title('🕉  The Ask', "Join us in building Bharat's spiritual future");

// Raise box
card(28, 98, 400, 140, C.sectionBg, C.saffron);
doc.rect(28, 98, 400, 5).fill(C.saffron);
doc.fontSize(10).fillColor(C.muted).font('Helvetica-Bold').text('WE WANT TO RAISE', 28, 114, { width: 400, align: 'center', characterSpacing: 1.5 });
doc.fontSize(30).fillColor(C.saffron).font('Helvetica-Bold').text('₹1.5 Crore', 28, 140, { width: 400, align: 'center' });
doc.fontSize(12).fillColor(C.darkText).font('Helvetica').text('Seed Round  |  15% Equity', 28, 188, { width: 400, align: 'center' });

// Use of funds
card(444, 98, 488, 140, C.cardBg, C.divider);
doc.fontSize(10).fillColor(C.saffron).font('Helvetica-Bold').text('USE OF FUNDS', 454, 110, { characterSpacing: 1.5 });
const funds = [['40%','Product & Tech (App + Platform)'],['30%','Marketing & Guruji Onboarding'],['20%','City Expansion & Operations'],['10%','Legal, Compliance & Team']];
funds.forEach(([pct, label], i) => {
  doc.fontSize(11).fillColor(C.saffron).font('Helvetica-Bold').text(pct, 454, 132 + i * 24, { width: 52 });
  doc.fontSize(10).fillColor(C.bodyText).font('Helvetica').text(label, 510, 132 + i * 24, { width: 410 });
});

// Why now
doc.fontSize(12).fillColor(C.saffron).font('Helvetica-Bold').text('WHY INVEST NOW?', 28, 252, { characterSpacing: 1.5 });
const reasons = [
  { i:'📱', t:'UPI: 9 Billion+ transactions/month — digital payments are mainstream in India (2026)' },
  { i:'🌐', t:'3× more families now open to online & video spiritual services post-2020' },
  { i:'🌍', t:'NRI diaspora actively seeks trusted online pujas — a global market ready to be served' },
  { i:'📲', t:'80%+ smartphone penetration in urban India — the audience is already digital' },
  { i:'🇮🇳', t:'Government push for digital services in Tier-2/3 cities — massive growth ahead' },
  { i:'📚', t:'Vedic knowledge is at risk of fading — Sanatan Guruji preserves & amplifies it' },
];
reasons.forEach((r, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = 28 + col * 462, y = 276 + row * 62;
  card(x, y, 446, 52, C.cardBg, C.divider);
  doc.rect(x, y, 5, 52).fill(C.saffron);
  doc.fontSize(16).text(r.i, x + 10, y + 16, { width: 28 });
  doc.fontSize(9.5).fillColor(C.bodyText).font('Helvetica').text(r.t, x + 42, y + 10, { width: 396, lineGap: 2 });
});
footer();

// ════════════ SLIDE 11 — THANK YOU ════════════
addPage();
doc.rect(0, 0, W, H).fill(C.white);
doc.rect(0, 0, 415, H).fill(C.saffron);
doc.rect(415, 0, 12, H).fill(C.gold);
doc.rect(0, 0, W, 7).fill(C.saffronD);
doc.rect(0, H - 7, W, 7).fill(C.gold);

doc.fontSize(60).fillColor(C.white).text('🕉', 0, 40, { width: 415, align: 'center' });
doc.fontSize(13).fillColor([255,224,192]).font('Helvetica-Oblique').text('॥ श्री गणेशाय नमः ॥', 0, 168, { width: 415, align: 'center' });
doc.fontSize(26).fillColor(C.white).font('Helvetica-Bold').text('Sanatan Guruji', 0, 196, { width: 415, align: 'center' });
doc.roundedRect(30, 236, 356, 28, 5).fill(C.saffronD);
doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
   .text('ONE STOP SPIRITUAL SOLUTION', 30, 244, { width: 356, align: 'center', characterSpacing: 1.5 });
doc.fontSize(11).fillColor([255,208,144]).font('Helvetica').text('sanatanguruji.com', 0, 278, { width: 415, align: 'center' });
doc.moveTo(40, 318).lineTo(375, 318).lineWidth(0.8).strokeColor([208,80,0]).stroke();
doc.fontSize(11).fillColor([255,208,144]).font('Helvetica').text('Ojus Kulkarni  —  Founder & CEO', 0, 328, { width: 415, align: 'center' });

// Right
doc.fontSize(22).fillColor(C.darkText).font('Helvetica-Bold')
   .text("Let's bring every puja to life\nand celebrate every Guruji", 440, 40, { width: 490, lineGap: 4 });
doc.moveTo(440, 118).lineTo(W - 28, 118).lineWidth(0.8).strokeColor(C.divider).stroke();
doc.fontSize(12).fillColor(C.bodyText).font('Helvetica')
   .text('Every family deserves a joyful, trusted puja experience.\nEvery Guruji deserves to be found, respected & celebrated.\n\nSanatan Guruji is that platform — built with devotion.', 440, 130, { width: 490, lineGap: 3 });

card(440, 280, 490, 120, C.sectionBg, C.divider);
doc.fontSize(10).fillColor(C.saffron).font('Helvetica-Bold').text('GET IN TOUCH', 450, 294, { characterSpacing: 2 });
[['📧','ojus@sanatanguruji.com'],['🌐','www.sanatanguruji.com'],['📍','India  |  Singapore  |  Global']].forEach(([ic, val], i) => {
  doc.fontSize(11).fillColor(C.darkText).font('Helvetica').text(`${ic}  ${val}`, 450, 316 + i * 26, { width: 470 });
});
doc.fontSize(16).fillColor(C.saffron).font('Helvetica-Bold').text('🙏  Thank You  🙏', 440, 416, { width: 490, align: 'center' });
doc.fontSize(8).fillColor(C.muted).font('Helvetica-Oblique')
   .text('Dharmic Technology for Bharat & the Global Hindu Community', 440, 446, { width: 490 });

doc.end();
console.log('PDF written to attached_assets/SanatanGuruji_PitchDeck_Final.pdf');
