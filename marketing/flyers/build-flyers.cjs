/**
 * Renders the sample marketing flyers to PNG (1080x1350, Instagram/WhatsApp portrait)
 * plus a print-ready PDF of each.
 *
 * Not part of the app build. Needs `qrcode` and `playwright` on NODE_PATH, e.g.:
 *   npm i --prefix /tmp/flyer-tools qrcode playwright
 *   NODE_PATH=/tmp/flyer-tools/node_modules node marketing/flyers/build-flyers.cjs
 *
 * Copy follows .claude/brand-voice-guidelines.md. Change SITE_URL once the live domain
 * is confirmed (Open Question 2 in the guidelines).
 */
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { chromium } = require("playwright");

const SITE_URL = "https://cooachly.com";
const ROOT = path.resolve(__dirname, "../..");
const OUT = __dirname;

const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString("base64");
const COOACHLY_LOGO = `data:image/png;base64,${b64("public/icons/cooachly-512.png")}`;
const ARTS_LOGO = `data:image/png;base64,${b64("public/icons/arts-512.png")}`;
const ARTS_HERO = `data:image/jpeg;base64,${b64("public/images/arts/hero.jpg")}`;

const CONTACT = "For enquiries: +91 80151 51896 · support@cooachly.com";

const utm = (p, campaign) =>
  `${SITE_URL}${p}?utm_source=flyer&utm_medium=print_social&utm_campaign=${campaign}`;

const THEMES = {
  cooachly: {
    bg: "#14532D", deep: "#052E16", mid: "#15803D", accent: "#BEF264", tint: "#F0FDF4", ink: "#14532D",
    head: "'Plus Jakarta Sans', 'Geist', system-ui, sans-serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
    logo: COOACHLY_LOGO, brand: "Cooachly", tagline: "Coaching, scheduled simply",
  },
  arts: {
    bg: "#7F1D1D", deep: "#450A0A", mid: "#B91C1C", accent: "#FCD34D", tint: "#FEF3C7", ink: "#7F1D1D",
    head: "'Cormorant Garamond', Georgia, serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
    logo: ARTS_LOGO, brand: "Cooachly Arts", tagline: "Carnatic vocals, taught live",
  },
};

const FLYERS = [
  {
    file: "cooachly-free-demo", theme: "cooachly",
    eyebrow: "LIVE 1:1 ONLINE COACHING",
    headline: "Expert guidance.<br>Better learning.<br><em>Brighter future.</em>",
    sub: "Your own dedicated coach, at a time that fits your schedule, in your own timezone.",
    bullets: [
      "Qualified, vetted educators",
      "Math · Physics · Chemistry · Biology · Economics & more",
      "Email & WhatsApp reminders before every session",
      "AI summary of every session, emailed afterward",
    ],
    cta: "Book your free 30-min demo",
    ctaNote: "No payment needed for your first class",
    url: utm("/demo", "free_demo_nov26"),
  },
  {
    file: "cooachly-sat-act-prep", theme: "cooachly",
    eyebrow: "PSAT · SAT · ACT PREP",
    headline: "Find the gaps.<br><em>Close them, 1:1.</em>",
    sub: "Test prep with a coach who works on <b>your</b> weak spots, live, in your own timezone.",
    bullets: [
      "8 sessions a month (2 a week) · $120/month",
      "~45-min sessions, extendable to 1 hour",
      "Weekend & evening slots",
      "Message your coach between sessions",
    ],
    cta: "Try a free 30-min demo",
    ctaNote: "Pay only once you're ready to enrol",
    url: utm("/demo", "test_prep_nov26"),
  },
  {
    file: "cooachly-become-a-coach", theme: "cooachly",
    eyebrow: "NOW WELCOMING EDUCATORS",
    headline: "Teach students<br><em>across the world.</em>",
    sub: "Set your subjects and availability once. Cooachly handles the rest.",
    bullets: [
      "Students see your slots in their own timezone",
      "Automatic reminders & a video room for every booking",
      "Secure payments via Stripe; earnings on your dashboard",
      "Screening, demo & onboarding, then start teaching",
    ],
    cta: "Apply to teach",
    ctaNote: "cooachly.com/become-a-coach",
    url: utm("/become-a-coach", "coach_recruiting_nov26"),
  },
  {
    file: "arts-free-demo", theme: "arts", hero: true,
    eyebrow: "CARNATIC VOCALS · ALL AGES & LEVELS",
    headline: "Sruti. Laya. Bhava.<br><em>Passed on, one voice at a time.</em>",
    sub: "Live 1:1 classes with qualified gurus, in your own timezone.",
    bullets: [
      "Sarali varisai fundamentals to concert-ready kritis",
      "Fixed 30-minute classes, booked in your timezone",
      "No platform fees, ever: agree your rate with your guru",
      "Every guru vetted before they can teach",
    ],
    cta: "Book your free demo class",
    ctaNote: "Learn online, sing anywhere.",
    url: utm("/arts/demo", "arts_free_demo_nov26"),
  },
  {
    file: "arts-become-a-guru", theme: "arts",
    eyebrow: "FOR CARNATIC VOCAL GURUS",
    headline: "Your tradition.<br><em>Your students, worldwide.</em>",
    sub: "Teach 1:1 online on your own terms. Cooachly Arts takes no cut.",
    bullets: [
      "Set your own levels, rate and availability",
      "Students book in their timezone; you teach in yours",
      "Reminders, video room & messaging built in",
      "No booking fees, no commission",
    ],
    cta: "Apply to teach",
    ctaNote: "Tradition, kept alive.",
    url: utm("/arts/become-a-coach", "guru_recruiting_nov26"),
  },
];

function html(f, qrSvg) {
  const t = THEMES[f.theme];
  const isArts = f.theme === "arts";
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px}
body{font-family:${t.body};background:${t.bg};color:#fff;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:
  radial-gradient(900px 700px at 110% -10%, ${t.mid} 0%, transparent 60%),
  radial-gradient(700px 600px at -20% 110%, ${t.deep} 0%, transparent 60%), ${t.bg}}
${f.hero ? `.hero{position:absolute;right:0;top:0;width:100%;height:560px;background:url(${ARTS_HERO}) center/cover;opacity:.35;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,transparent 100%)}` : ""}
.arc{position:absolute;right:-180px;top:-180px;width:620px;height:620px;border-radius:50%;border:2px solid ${t.accent}33}
.arc.b{right:-120px;top:-120px;width:500px;height:500px;border-color:${t.accent}22}
.wrap{position:relative;height:100%;padding:72px 80px 64px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:22px}
.top img{width:96px;height:96px;border-radius:${isArts ? "20px" : "50%"};background:#fff;${isArts ? "background:none" : ""}}
.brand{font-family:${t.head};font-weight:700;font-size:${isArts ? 44 : 38}px;letter-spacing:${isArts ? "0" : "-.5px"}}
.tag{font-size:20px;color:${t.accent};font-weight:600;margin-top:2px}
.eyebrow{margin-top:${f.hero ? 110 : 84}px;display:inline-block;align-self:flex-start;background:${t.accent};color:${t.deep};
  font-weight:800;font-size:20px;letter-spacing:2px;padding:10px 18px;border-radius:999px}
h1{font-family:${t.head};font-weight:${isArts ? 700 : 800};font-size:${isArts ? 84 : 86}px;line-height:1.04;
  letter-spacing:${isArts ? "0" : "-2.5px"};margin-top:30px}
h1 em{font-style:${isArts ? "italic" : "normal"};color:${t.accent}}
.sub{font-size:30px;line-height:1.4;margin-top:28px;color:#ffffffe0;max-width:860px;text-wrap:balance}
ul{list-style:none;margin-top:40px;display:grid;gap:18px}
li{font-size:27px;line-height:1.3;display:flex;gap:16px;align-items:flex-start}
li:before{content:"";flex:0 0 14px;height:14px;margin-top:10px;border-radius:${isArts ? "2px" : "50%"};
  background:${t.accent};${isArts ? "transform:rotate(45deg)" : ""}}
.cta{margin-top:auto;display:flex;align-items:center;gap:36px;background:${t.tint};color:${t.ink};border-radius:28px;padding:30px 34px}
.cta .qr{flex:0 0 190px;height:190px;background:#fff;border-radius:16px;padding:10px}
.cta .qr svg{width:100%;height:100%}
.cta b{display:block;font-family:${t.head};font-size:${isArts ? 46 : 42}px;line-height:1.1;font-weight:800;letter-spacing:${isArts ? "0" : "-1px"}}
.cta span{display:block;font-size:24px;margin-top:10px;opacity:.8}
.cta i{display:block;font-style:normal;font-size:20px;margin-top:14px;font-weight:700;color:${t.mid}}
.foot{margin-top:26px;font-size:21px;color:#ffffffcc;text-align:center}
</style></head><body>
<div class="bg"></div>${f.hero ? '<div class="hero"></div>' : ""}<div class="arc"></div><div class="arc b"></div>
<div class="wrap">
  <div class="top"><img src="${t.logo}" alt=""><div><div class="brand">${t.brand}</div><div class="tag">${t.tagline}</div></div></div>
  <div class="eyebrow">${f.eyebrow}</div>
  <h1>${f.headline}</h1>
  <p class="sub">${f.sub}</p>
  <ul>${f.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
  <div class="cta"><div class="qr">${qrSvg}</div>
    <div><b>${f.cta}</b><span>${f.ctaNote}</span><i>Scan the code to get started →</i></div></div>
  <div class="foot">${CONTACT}</div>
</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const pdfPages = [];
  fs.mkdirSync(path.join(OUT, "html"), { recursive: true });
  for (const f of FLYERS) {
    const qrSvg = await QRCode.toString(f.url, { type: "svg", margin: 0, color: { dark: THEMES[f.theme].deep } });
    const doc = html(f, qrSvg);
    fs.writeFileSync(path.join(OUT, "html", `${f.file}.html`), doc);
    await page.setContent(doc, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `${f.file}.png`) });
    pdfPages.push(doc.replace("</style>", "@page{size:1080px 1350px;margin:0}</style>"));
    console.log("rendered", f.file, "→", f.url);
  }
  // One print-ready PDF per flyer, same 1080x1350 size.
  await page.close();
  const pdfPage = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const parts = [];
  for (const d of pdfPages) {
    await pdfPage.setContent(d, { waitUntil: "networkidle" });
    await pdfPage.evaluate(() => document.fonts.ready);
    parts.push(await pdfPage.pdf({ width: "1080px", height: "1350px", printBackground: true }));
  }
  parts.forEach((buf, i) => fs.writeFileSync(path.join(OUT, `${FLYERS[i].file}.pdf`), buf));
  await browser.close();
})();
