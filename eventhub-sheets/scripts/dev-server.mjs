// Local development server: runs the real apps-script/*.gs code against the in-memory
// fake Google services, so the website's EventHub pages can be tried without a
// deployed Apps Script. Data lives only in memory and resets on restart.
//
//   node scripts/dev-server.mjs            -> http://localhost:8787/exec
//   EXPO_PUBLIC_EVENTHUB_API=http://localhost:8787/exec npx expo start --web
//
// Any login token is accepted here as a local demo user ("Demo Student", an admin),
// because the real KarmaVerse login cannot be checked offline. Never deploy this.
import http from 'node:http';
import { loadScript } from '../tests/load.mjs';

const PORT = Number(process.env.PORT || 8787);
const DAY = 86400000;
// Tokens "demo-1", "demo-2", ... are separate demo users; anything else is demo-1.
const NAMES = ['Demo Student', 'Second Student', 'Ananya Rao', 'Kabir Mehta', 'Isha Nair'];
const demoProfile = (token) => {
  const n = Math.max(1, Number(String(token).match(/^demo-(\d+)$/)?.[1] || 1));
  return {
    _id: '6500000000000000000000' + String(n).padStart(2, '0'),
    name: NAMES[n - 1] || `Student ${n}`,
    email: n === 1 ? 'demo@example.test' : `student${n}@example.test`,
    phone: '+919876543210',
    referralCode: `DEMO${n}`,
    address: { city: 'Gurugram' },
  };
};
const profiles = new Proxy({}, { get: (t, k) => (typeof k === 'string' ? demoProfile(k) : undefined) });
const bookings = {};
const s = loadScript({ profiles, bookings });
s.ctx.setupEventHub();

// Local demo state: the seeded challenge is live on day 3, plus an upcoming event.
const ev = (f, v) => s.setCell('Events', (r) => r['Event ID'] === 'E-GIC2026A', f, v);
ev('Starts at', new Date(Date.now() - 2.4 * DAY));
ev('Ends at', new Date(Date.now() + 4.6 * DAY));
ev('Registration opens', new Date(Date.now() - 10 * DAY));
ev('Registration closes', new Date(Date.now() + 2 * DAY));
ev('Published', true);
ev('Certificates enabled', true);
// 7 Days of Karma keeps its real seeded dates (starts 28 Nov) and is the featured launch event.
const ev7 = (f, v) => s.setCell('Events', (r) => r['Event ID'] === 'E-7DOK2026A', f, v);
ev('Featured', false);
ev('Banner URL', 'http://localhost:8081/event-banners/green-impact-challenge.jpg');
ev7('Banner URL', 'http://localhost:8081/event-banners/7-days-of-karma.jpg'); // the site serves public/ locally too
ev7('Published', true);
s.appendRaw('Admins', { Email: 'demo@example.test', Role: 'owner', Active: true });
const admin = (action, body) => s.post({ action, token: 'demo-1', ...body });
const created = admin('admin.event.save', { event: {
  slug: 'green-creator-challenge', title: 'Green Creator Challenge (local demo)', category: 'Awareness',
  summary: 'Local demo event: make one short reel that teaches a sustainability habit.', overview: 'Local demo data.',
  startAt: new Date(Date.now() + 12 * DAY).toISOString(), endAt: new Date(Date.now() + 19 * DAY).toISOString(),
  rules: ['Original work only'], faq: [{ q: 'Is this real?', a: 'No, it only exists on the local dev server.' }],
} }).data;
admin('admin.task.save', { task: { eventId: created.event.id, day: 1, title: 'Make a reel', instructions: 'Post a 30-second reel and paste the link.', accepts: ['link'], points: 30, qualityMax: 10 } });
admin('admin.event.publish', { eventId: created.event.id, published: true });
// A second demo participant with an approved Day 1, so the leaderboard has a row.
s.post({ action: 'register', slug: 'green-impact-challenge', token: 'demo-2', name: 'Second Student', email: 'second@example.test', phone: '9876543210', college: 'Demo College', city: 'Pune', consent: true });
s.post({ action: 'submission.create', slug: 'green-impact-challenge', token: 'demo-2', taskId: 'T-GIC1D', text: 'Local demo pledge: carry a bottle, refuse bags, compost at home.' });
s.ctx.rebuildLeaderboards();

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') return send(res, 204, '');
  // Minimal stand-in for api.karmaverse.earth so the rest of the app tolerates a demo token.
  if (url.pathname === '/api/v1/users/profile') return send(res, 200, { success: true, data: demoProfile('demo-1') });
  if (url.pathname.startsWith('/api/v1/')) return send(res, 200, { success: true, data: [] });
  if (url.pathname !== '/exec') return send(res, 404, { ok: false, status: 404, message: 'Not found' });
  if (req.method === 'GET') return send(res, 200, s.get(Object.fromEntries(url.searchParams)));
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 12 * 1024 * 1024) req.destroy(); });
  req.on('end', () => {
    try {
      const out = s.ctx.doPost({ postData: { contents: body } });
      send(res, 200, out.content);
    } catch (e) {
      send(res, 500, { ok: false, status: 500, message: String(e) });
    }
  });
}).listen(PORT, () => console.log(`EventHub dev server on http://localhost:${PORT}/exec (in-memory demo data)`));
