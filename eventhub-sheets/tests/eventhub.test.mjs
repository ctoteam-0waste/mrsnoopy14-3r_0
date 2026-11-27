import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadScript } from './load.mjs';

const DAY = 24 * 60 * 60 * 1000;
const SLUG = 'green-impact-challenge';
const EVENT_ID = 'E-GIC2026A';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(200).fill(7)]).toString('base64');
const NOT_IMAGE = Buffer.from('<?php echo 1; ?> pretending to be a photo').toString('base64');

let seq = 0;
const makeUser = (over = {}) => {
  seq += 1;
  const id = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') + seq.toString(16).padStart(16, '0');
  return { _id: id, name: `Student${seq} Kumar`, email: `s${seq}@college.test`, phone: '9876543210', referralCode: `KV${seq}CODE`, ...over };
};

let s, profiles, tokens, bookings;
const login = (u) => { const t = `tok_${u._id}`; profiles[t] = u; tokens[u._id] = t; return t; };
const as = (u, action, extra = {}) => s.post({ action, slug: SLUG, token: tokens[u._id] || login(u), ...extra });
const form = (u, over = {}) => ({ name: u.name, email: u.email, phone: '98765 43210', college: 'Delhi University', city: 'Delhi', consent: true, ...over });
const register = (u, over) => as(u, 'register', form(u, over));
const taskId = (day) => `T-GIC${day}D`;
const submit = (u, day, extra) => as(u, 'submission.create', { taskId: taskId(day), ...extra });
const sub = (id) => s.rows('SUBMISSIONS').find((r) => r['Submission ID'] === id);

const ev = (field, value) => s.setCell('Events', (r) => r['Event ID'] === EVENT_ID, field, value);
const makeAdmin = (u, role = 'admin') => s.appendRaw('Admins', { Email: u.email, 'User ID': '', Role: role, Active: true });

/** Publishes the seeded challenge with day 3 open now (started 2.5 days ago). */
const goLive = () => {
  ev('Starts at', new Date(Date.now() - 2.5 * DAY));
  ev('Ends at', new Date(Date.now() + 4.5 * DAY));
  ev('Registration opens', new Date(Date.now() - 10 * DAY));
  ev('Registration closes', new Date(Date.now() + 2 * DAY));
  ev('Published', true);
};

beforeEach(() => {
  profiles = {}; tokens = {}; bookings = {};
  s = loadScript({ profiles, bookings });
  s.ctx.setupEventHub();
  goLive();
});

// ===========================================================================
describe('setup', () => {
  test('creates every tab, the draft challenge with 7 tasks, folders and triggers', () => {
    const names = [...s.g.sheets.keys()].sort();
    assert.deepEqual(names, ['Admins', 'AuditLog', 'Categories', 'Certificates', 'Events', 'Leaderboard', 'MailQueue',
      'PointsLedger', 'Registrations', 'Settings', 'Submissions', 'Tasks']);
    assert.equal(s.rows('TASKS').length, 14); // two seeded drafts, 7 tasks each
    assert.equal(s.rows('CATEGORIES').length, 5);
    for (const k of ['SUBMISSIONS_FOLDER_ID', 'BANNERS_FOLDER_ID', 'CERTIFICATES_FOLDER_ID']) assert.ok(s.g.props.get(k));
    assert.deepEqual(s.g.triggers.map((t) => t.getHandlerFunction()).sort(), ['flushMailQueue', 'onSheetEdit', 'rebuildLeaderboardsIfChanged']);
  });

  test('is safe to run again and keeps team edits', () => {
    ev('Title', 'Edited by team');
    s.ctx.setupEventHub();
    assert.equal(s.rows('EVENTS').length, 2);
    assert.equal(s.rows('TASKS').length, 14);
    assert.equal(s.g.triggers.length, 3);
    assert.equal(s.get({ action: 'events.get', slug: SLUG }).data.title, 'Edited by team');
  });

  test('the challenge scores a maximum of 120: 6x10 + 15 + 7x5 quality + 10 pickup bonus', () => {
    const d = s.get({ action: 'events.get', slug: SLUG }).data;
    assert.equal(d.maxScore, 120);
    assert.equal(d.tasks.length, 7);
    assert.equal(d.tasks[6].points, 15);
    assert.equal(d.tasks[5].bonus, 10);
  });

  test('7 Days of Karma is seeded as a draft worth 15 points, matching the proposal', () => {
    assert.equal(s.get({ action: 'events.get', slug: '7-days-of-karma' }).status, 404); // draft
    s.setCell('Events', (r) => r['Event ID'] === 'E-7DOK2026A', 'Published', true);
    const d = s.get({ action: 'events.get', slug: '7-days-of-karma' }).data;
    assert.equal(d.maxScore, 15);
    assert.deepEqual(d.tasks.map((t) => t.points), [1, 2, 3, 2, 1, 3, 3]);
    assert.equal(d.pickupBonus, 0);
  });
});

// ===========================================================================
describe('event listing and details', () => {
  test('drafts are hidden from the public; publishing shows them', () => {
    ev('Published', false);
    assert.equal(s.get({ action: 'events.list' }).data.events.length, 0);
    assert.equal(s.get({ action: 'events.get', slug: SLUG }).status, 404);
    ev('Published', true);
    const list = s.get({ action: 'events.list' }).data;
    assert.equal(list.events.length, 1);
    assert.equal(list.events[0].status, 'live');
    assert.deepEqual(list.categories, ['Sustainability', 'Innovation', 'Competition', 'Campus Challenges', 'Awareness']);
  });

  test('filters by category, status, search text and date', () => {
    const q = (p) => s.get({ action: 'events.list', ...p }).data.events.length;
    assert.equal(q({ category: 'Campus Challenges' }), 1);
    assert.equal(q({ category: 'Innovation' }), 0);
    assert.equal(q({ status: 'live' }), 1);
    assert.equal(q({ status: 'upcoming' }), 0);
    assert.equal(q({ q: 'green impact' }), 1);
    assert.equal(q({ q: 'hackathon' }), 0);
    assert.equal(q({ from: new Date(Date.now() + 30 * DAY).toISOString() }), 0);
  });

  test('status follows the dates: upcoming, live, completed', () => {
    ev('Starts at', new Date(Date.now() + DAY));
    assert.equal(s.get({ action: 'events.list' }).data.events[0].status, 'upcoming');
    ev('Starts at', new Date(Date.now() - 9 * DAY));
    ev('Ends at', new Date(Date.now() - DAY));
    assert.equal(s.get({ action: 'events.list' }).data.events[0].status, 'completed');
  });

  test('details include rules, FAQ and tasks with their open state', () => {
    const d = s.get({ action: 'events.get', slug: SLUG }).data;
    assert.ok(d.rules.length >= 5);
    assert.ok(d.faq.length >= 3 && d.faq[0].q && d.faq[0].a);
    assert.deepEqual(d.tasks.map((t) => t.state), ['open', 'open', 'open', 'locked', 'locked', 'locked', 'locked']);
  });
});

// ===========================================================================
describe('login', () => {
  test('missing or forged tokens are refused; tokens are never accepted in GET URLs', () => {
    assert.equal(s.post({ action: 'register', slug: SLUG }).status, 401);
    assert.equal(s.post({ action: 'register', slug: SLUG, token: 'forged' }).status, 401);
    const u = makeUser();
    assert.equal(s.get({ action: 'me.event', slug: SLUG, token: login(u) }).status, 405);
  });

  test('unknown actions are 404, including prototype names', () => {
    assert.equal(s.get({ action: 'constructor' }).status, 404);
    assert.equal(s.get({ action: 'nope' }).status, 404);
  });
});

// ===========================================================================
describe('registration', () => {
  test('registers once; a repeat returns the same registration and creates no row', () => {
    const u = makeUser();
    const r1 = register(u);
    assert.equal(r1.ok, true, r1.message);
    assert.equal(r1.data.alreadyRegistered, false);
    const r2 = register(u);
    assert.equal(r2.data.alreadyRegistered, true);
    assert.equal(r2.data.registration.id, r1.data.registration.id);
    const rows = s.rows('REGISTRATIONS');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Phone, '+919876543210');
    assert.equal(s.g.mails.length, 1);
    assert.match(s.g.mails[0].subject, /registered/i);
  });

  test('validates every field and requires consent', () => {
    const u = makeUser();
    assert.equal(register(u, { email: 'not-an-email' }).status, 400);
    assert.equal(register(u, { phone: '12345' }).status, 400);
    assert.equal(register(u, { college: '' }).status, 400);
    assert.equal(register(u, { city: 'x'.repeat(61) }).status, 400);
    assert.equal(register(u, { consent: false }).status, 400);
    assert.equal(s.rows('REGISTRATIONS').length, 0);
  });

  test('respects the registration window and capacity', () => {
    ev('Registration closes', new Date(Date.now() - 1000));
    assert.equal(register(makeUser()).status, 409);
    ev('Registration closes', new Date(Date.now() + DAY));
    ev('Max participants', 1);
    assert.equal(register(makeUser()).ok, true);
    const full = register(makeUser());
    assert.equal(full.status, 409);
    assert.match(full.message, /full/);
  });

  test('referral codes must belong to another participant of the same event', () => {
    const a = makeUser();
    const b = makeUser();
    register(a);
    assert.equal(register(b, { referralCode: 'NOSUCH1' }).status, 400);
    assert.equal(register(b, { referralCode: b.referralCode }).status, 400);
    const ok = register(b, { referralCode: a.referralCode.toLowerCase() });
    assert.equal(ok.ok, true, ok.message);
    const row = s.rows('REGISTRATIONS').find((r) => r['User ID'] === b._id);
    assert.equal(row['Referred by user ID'], a._id);
  });

  test('typed text can never become a spreadsheet formula', () => {
    register(makeUser(), { college: '=IMPORTXML("http://evil","//a")', city: '+Delhi' });
    assert.deepEqual(s.g.formulaWrites, []);
    assert.equal(s.rows('REGISTRATIONS')[0].College, '=IMPORTXML("http://evil","//a")');
  });
});

// ===========================================================================
describe('submissions', () => {
  test('only registered participants can submit', () => {
    const u = makeUser();
    assert.equal(submit(u, 2, { imageBase64: JPEG }).status, 403);
  });

  test('tasks open by day; a future day is locked', () => {
    const u = makeUser();
    register(u);
    const r = submit(u, 4, { imageBase64: JPEG });
    assert.equal(r.status, 409);
    assert.match(r.message, /opens on/);
  });

  test('Day 1 pledge is auto-approved and earns 10 points through the ledger', () => {
    const u = makeUser();
    register(u);
    assert.equal(submit(u, 1, { text: 'short' }).status, 400);
    const r = submit(u, 1, { text: 'I will carry a steel bottle, refuse plastic bags and compost at home.' });
    assert.equal(r.ok, true, r.message);
    assert.equal(r.data.submission.status, 'approved');
    const ledger = s.rows('LEDGER');
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].Points, 10);
    assert.equal(ledger[0].Source, 'task');
  });

  test('an upload alone earns nothing: photo tasks start pending with 0 points', () => {
    const u = makeUser();
    register(u);
    const r = submit(u, 2, { imageBase64: JPEG, text: 'Two bins' });
    assert.equal(r.ok, true, r.message);
    assert.equal(r.data.submission.status, 'pending');
    assert.equal(s.rows('LEDGER').length, 0);
    const row = sub(r.data.submission.id);
    assert.ok(row['Drive file ID']);
    assert.equal(s.g.files.get(row['Drive file ID']).sharing, 'PRIVATE');
  });

  test('photo checks: required proof, real image bytes, size limit, links must be https', () => {
    const u = makeUser();
    register(u);
    assert.match(submit(u, 2, { text: 'no photo' }).message, /photo/);
    assert.match(submit(u, 2, { imageBase64: NOT_IMAGE }).message, /JPG, PNG or WEBP/);
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024 + 10)]).toString('base64');
    assert.match(submit(u, 2, { imageBase64: big }).message, /5 MB/);
    assert.match(submit(u, 2, { link: 'https://youtube.com/x' }).message, /does not take links/);
    assert.match(submit(u, 3, { link: 'http://insecure.example' }).message, /https/);
    assert.equal(s.rows('SUBMISSIONS').length, 0);
    assert.equal([...s.g.files.values()].filter((f) => !f.trashed && f.name.includes('_T-')).length, 0);
  });

  test('a link classifies as video or social', () => {
    const u = makeUser();
    register(u);
    const r = submit(u, 3, { link: 'https://www.instagram.com/reel/abc' });
    assert.equal(r.ok, true, r.message);
    assert.equal(sub(r.data.submission.id)['Link type'], 'social');
  });

  test('no duplicate submission for a task while one is pending or approved', () => {
    const u = makeUser();
    register(u);
    assert.equal(submit(u, 2, { imageBase64: JPEG }).ok, true);
    const again = submit(u, 2, { imageBase64: JPEG });
    assert.equal(again.status, 409);
    assert.equal(s.rows('SUBMISSIONS').length, 1);
    // The rejected duplicate's file is not left in Drive.
    assert.equal([...s.g.files.values()].filter((f) => !f.trashed && f.name.includes('_T-GIC2D_')).length, 1);
  });
});

// ===========================================================================
describe('review and points', () => {
  const setupReview = () => {
    const admin = makeUser({ email: 'team@0waste.co.in' });
    makeAdmin(admin, 'reviewer');
    const u = makeUser();
    register(u);
    const r = submit(u, 2, { imageBase64: JPEG });
    return { admin, u, id: r.data.submission.id };
  };
  const review = (admin, id, decision, extra = {}) => as(admin, 'admin.review', { submissionId: id, decision, ...extra });
  const total = (u) => s.rows('LEDGER').filter((r) => r['User ID'] === u._id).reduce((a, r) => a + r.Points, 0);

  test('non-reviewers cannot review', () => {
    const { u, id } = setupReview();
    assert.equal(review(u, id, 'approved').status, 403);
  });

  test('approval awards task points plus quality, capped at the task maximum', () => {
    const { admin, u, id } = setupReview();
    const r = review(admin, id, 'approved', { quality: 9 });
    assert.equal(r.ok, true, r.message);
    assert.equal(r.data.points, 15);
    assert.equal(total(u), 15);
    assert.equal(sub(id).Quality, 5);
    assert.ok(s.rows('AUDIT').some((a) => a.Action === 'submission.review' && a['Entity ID'] === id));
  });

  test('a rejection needs a reason, emails it, and resubmission replaces the old entry', () => {
    const { admin, u, id } = setupReview();
    assert.equal(review(admin, id, 'rejected').status, 400);
    const before = s.g.mails.length;
    assert.equal(review(admin, id, 'rejected', { reason: 'Photo is blurry' }).ok, true);
    assert.equal(s.g.mails.length, before + 1);
    assert.match(s.g.mails.at(-1).htmlBody, /Photo is blurry/);
    const mine = as(u, 'me.event').data.tasks.find((t) => t.day === 2);
    assert.equal(mine.submission.reason, 'Photo is blurry');
    assert.equal(mine.canSubmit, true);
    const again = submit(u, 2, { imageBase64: JPEG });
    assert.equal(again.ok, true, again.message);
    assert.equal(again.data.submission.attempt, 2);
    assert.equal(sub(id).Status, 'superseded');
    assert.equal(review(admin, id, 'approved').status, 409);
  });

  test('changing a decision corrects the ledger instead of double counting', () => {
    const { admin, u, id } = setupReview();
    review(admin, id, 'approved', { quality: 3 });
    review(admin, id, 'approved', { quality: 5 });
    assert.equal(total(u), 15);
    review(admin, id, 'rejected', { reason: 'Copied from the internet' });
    assert.equal(total(u), 0);
    review(admin, id, 'approved', { quality: 0 });
    assert.equal(total(u), 10);
    assert.ok(s.rows('LEDGER').length >= 4); // full history kept
  });

  test('reviewing in the sheet awards points through the same rules', () => {
    const { u, id } = setupReview();
    s.editCell('Submissions', (r) => r['Submission ID'] === id, 'Quality', 4);
    assert.equal(total(u), 0); // still pending: quality alone gives nothing
    s.editCell('Submissions', (r) => r['Submission ID'] === id, 'Status', 'approved');
    assert.equal(total(u), 14);
    assert.equal(sub(id)['Reviewed by'], 'reviewer@0waste.co.in');
    s.editCell('Submissions', (r) => r['Submission ID'] === id, 'Status', 'rejected'); // no reason yet
    assert.equal(sub(id).Status, 'pending');
    assert.equal(total(u), 0);
  });

  test('admins can adjust points with a reason, and it is audited', () => {
    const { u } = setupReview();
    const owner = makeUser();
    makeAdmin(owner, 'admin');
    assert.equal(as(owner, 'admin.points.adjust', { eventId: EVENT_ID, userId: u._id, points: 7 }).status, 400);
    const r = as(owner, 'admin.points.adjust', { eventId: EVENT_ID, userId: u._id, points: 7, reason: 'Best poster on campus' });
    assert.equal(r.ok, true, r.message);
    assert.equal(total(u), 7);
    assert.ok(s.rows('AUDIT').some((a) => a.Action === 'points.adjust' && a.Note === 'Best poster on campus'));
    assert.equal(as(owner, 'admin.points.adjust', { eventId: EVENT_ID, userId: u._id, points: 5000, reason: 'too much' }).status, 400);
  });
});

// ===========================================================================
describe('verified KarmaVerse pickup bonus', () => {
  test('awarded once, only for a completed pickup during the event', () => {
    const u = makeUser();
    register(u);
    bookings[u._id] = [
      { _id: 'b1', status: 'CANCELLED', updatedAt: new Date().toISOString() },
      { _id: 'b2', status: 'COMPLETED', updatedAt: new Date(Date.now() - 30 * DAY).toISOString() },
    ];
    let r = as(u, 'pickup.verify');
    assert.equal(r.data.verified, false);
    bookings[u._id].push({ _id: 'b3', status: 'COMPLETED', updatedAt: new Date(Date.now() - DAY).toISOString() });
    r = as(u, 'pickup.verify');
    assert.equal(r.data.verified, true);
    assert.equal(r.data.points, 10);
    as(u, 'pickup.verify');
    const bonus = s.rows('LEDGER').filter((l) => l.Source === 'bonus');
    assert.equal(bonus.length, 1);
    assert.equal(bonus[0].Points, 10);
  });
});

// ===========================================================================
describe('leaderboard', () => {
  test('ranks by verified points, ties go to who got there first, no private data', () => {
    const admin = makeUser();
    makeAdmin(admin);
    const [a, b, c] = [makeUser({ name: 'Asha Verma' }), makeUser({ name: 'Bilal Khan' }), makeUser({ name: 'Chitra Rao' })];
    [a, b, c].forEach((u) => register(u));
    const pledge = 'I pledge to segregate waste, carry a bottle and avoid plastic.';
    submit(b, 1, { text: pledge }); // b first
    submit(a, 1, { text: pledge });
    const pc = submit(c, 2, { imageBase64: JPEG }); // pending: does not count
    s.ctx.rebuildLeaderboards();
    let lb = s.get({ action: 'leaderboard.get', slug: SLUG }).data;
    assert.deepEqual(lb.rows.map((r) => r.name), ['Bilal K.', 'Asha V.']);
    assert.deepEqual(Object.keys(lb.rows[0]).sort(), ['city', 'college', 'name', 'points', 'rank']);
    as(admin, 'admin.review', { submissionId: pc.data.submission.id, decision: 'approved', quality: 2 });
    s.ctx.rebuildLeaderboards();
    lb = s.get({ action: 'leaderboard.get', slug: SLUG }).data;
    assert.equal(lb.rows[0].name, 'Chitra R.');
    assert.equal(lb.rows[0].points, 12);
    const day1 = s.get({ action: 'leaderboard.get', slug: SLUG, scope: 'day', day: 1 }).data;
    assert.deepEqual(day1.rows.map((r) => r.name), ['Bilal K.', 'Asha V.']);
    const page2 = s.get({ action: 'leaderboard.get', slug: SLUG, pageSize: 2, page: 2 }).data;
    assert.equal(page2.rows.length, 1);
    assert.equal(page2.rows[0].rank, 3);
    assert.equal(as(b, 'me.event').data.rank, 2);
    const overall = s.get({ action: 'leaderboard.get', slug: 'overall' }).data;
    assert.equal(overall.total, 3);
  });

  test('withdrawn participants drop off the leaderboard', () => {
    const admin = makeUser();
    makeAdmin(admin);
    const u = makeUser();
    register(u);
    submit(u, 1, { text: 'I pledge to segregate waste, carry a bottle and avoid plastic.' });
    s.ctx.rebuildLeaderboards();
    assert.equal(s.get({ action: 'leaderboard.get', slug: SLUG }).data.total, 1);
    as(admin, 'admin.participant.update', { eventId: EVENT_ID, userId: u._id, status: 'disqualified' });
    s.ctx.rebuildLeaderboards();
    assert.equal(s.get({ action: 'leaderboard.get', slug: SLUG }).data.total, 0);
  });
});

// ===========================================================================
describe('certificates', () => {
  const finishTasks = (u, admin, n) => {
    for (let day = 1; day <= n; day++) {
      const r = day === 1
        ? submit(u, 1, { text: 'I pledge to segregate waste, carry a bottle and avoid plastic.' })
        : submit(u, day, { imageBase64: JPEG, text: 'Impact story text that is long enough to pass.' });
      assert.equal(r.ok, true, r.message);
      if (day > 1) as(admin, 'admin.review', { submissionId: r.data.submission.id, decision: 'approved', quality: 5 });
    }
  };

  test('admin-controlled, eligibility checked, one certificate per person, verifiable', () => {
    const admin = makeUser();
    makeAdmin(admin);
    const u = makeUser({ name: 'Meera Iyer' });
    register(u);
    ev('Starts at', new Date(Date.now() - 6.5 * DAY)); // all 7 days open
    s.ctx.clearCaches();
    assert.equal(as(u, 'certificate.download').status, 409); // not enabled yet
    ev('Certificates enabled', true);
    finishTasks(u, admin, 4);
    const no = as(u, 'certificate.download');
    assert.equal(no.status, 403);
    assert.match(no.message, /5 of 7/);
    const r5 = submit(u, 5, { imageBase64: JPEG });
    as(admin, 'admin.review', { submissionId: r5.data.submission.id, decision: 'approved' });
    const c1 = as(u, 'certificate.download');
    assert.equal(c1.ok, true, c1.message);
    assert.match(c1.data.certificateId, /^KV-[A-Z0-9]{10}$/);
    const pdf = Buffer.from(c1.data.pdfBase64, 'base64').toString('utf8');
    assert.match(pdf, /^%PDF/);
    assert.match(pdf, /Meera Iyer/);
    assert.match(pdf, /Completed 5 of 7 tasks/);
    assert.match(pdf, /<table cellpadding="0"/); // QR code
    const c2 = as(u, 'certificate.download');
    assert.equal(c2.data.certificateId, c1.data.certificateId);
    assert.equal(s.rows('CERTIFICATES').length, 1);

    const v = s.get({ action: 'certificate.verify', id: c1.data.certificateId }).data;
    assert.equal(v.valid, true);
    assert.equal(v.name, 'Meera Iyer');
    assert.equal(s.get({ action: 'certificate.verify', id: 'KV-AAAAAAAAAA' }).status, 404);
    as(admin, 'admin.certificate.revoke', { certificateId: c1.data.certificateId, reason: 'Duplicate account' });
    assert.equal(s.get({ action: 'certificate.verify', id: c1.data.certificateId }).data.valid, false);
  });

  test('override can block or allow one person', () => {
    const admin = makeUser();
    makeAdmin(admin);
    const u = makeUser();
    register(u);
    ev('Certificates enabled', true);
    as(admin, 'admin.participant.update', { eventId: EVENT_ID, userId: u._id, certificateOverride: 'eligible' });
    assert.equal(as(u, 'certificate.download').ok, true);
  });

  test('admin bulk issue makes certificates for everyone eligible', () => {
    const admin = makeUser();
    makeAdmin(admin);
    const u1 = makeUser(); const u2 = makeUser();
    register(u1); register(u2);
    ev('Certificates enabled', true);
    ev('Certificate rule', 'minApprovedTasks=1');
    submit(u1, 1, { text: 'I pledge to segregate waste, carry a bottle and avoid plastic.' });
    const out = as(admin, 'admin.certificates.issue', { eventId: EVENT_ID }).data;
    assert.deepEqual({ issued: out.issued, notEligible: out.notEligible }, { issued: 1, notEligible: 1 });
    assert.equal(as(admin, 'admin.certificates.issue', { eventId: EVENT_ID }).data.issued, 0);
  });
});

// ===========================================================================
describe('admin', () => {
  const newEvent = (over = {}) => ({
    slug: 'campus-green-action', title: 'Campus Green Action', category: 'Sustainability',
    summary: 'A month of green action on your campus.', overview: 'Overview text',
    startAt: new Date(Date.now() + 10 * DAY).toISOString(), endAt: new Date(Date.now() + 40 * DAY).toISOString(),
    rules: ['Be kind'], faq: [{ q: 'Free?', a: 'Yes' }], certificateRule: 'minApprovedTasks=1', ...over,
  });

  test('only admins manage events; reviewers can only review', () => {
    const rev = makeUser();
    makeAdmin(rev, 'reviewer');
    const nobody = makeUser();
    assert.equal(as(nobody, 'admin.events').status, 403);
    assert.equal(as(rev, 'admin.events').ok, true);
    assert.equal(as(rev, 'admin.event.save', { event: newEvent() }).status, 403);
    assert.equal(as(nobody, 'admin.export', { eventId: EVENT_ID }).status, 403);
    assert.equal(as(nobody, 'admin.analytics', { eventId: EVENT_ID }).status, 403);
  });

  test('create, validate, add a task, publish: a second event runs with its own leaderboard', () => {
    const admin = makeUser();
    makeAdmin(admin);
    assert.equal(as(admin, 'admin.event.save', { event: newEvent({ slug: 'Bad Slug!' }) }).status, 400);
    assert.equal(as(admin, 'admin.event.save', { event: newEvent({ slug: SLUG }) }).status, 409);
    assert.equal(as(admin, 'admin.event.save', { event: newEvent({ endAt: new Date().toISOString() }) }).status, 400);
    assert.equal(as(admin, 'admin.event.save', { event: newEvent({ category: 'Nope' }) }).status, 400);
    const created = as(admin, 'admin.event.save', { event: newEvent() });
    assert.equal(created.ok, true, created.message);
    const id = created.data.event.id;
    assert.equal(created.data.event.published, false);
    assert.equal(as(admin, 'admin.event.publish', { eventId: id, published: true }).status, 400); // no tasks yet
    const t = as(admin, 'admin.task.save', { task: { eventId: id, day: 1, title: 'Plant a tree', instructions: 'Plant a sapling and share a photo.', accepts: ['image'], points: 20, qualityMax: 0 } });
    assert.equal(t.ok, true, t.message);
    assert.equal(t.data.maxScore, 20);
    assert.equal(as(admin, 'admin.event.publish', { eventId: id, published: true }).ok, true);
    assert.equal(s.get({ action: 'events.list' }).data.events.length, 2);
    assert.equal(s.get({ action: 'leaderboard.get', slug: 'campus-green-action' }).data.total, 0);
    const actions = s.rows('AUDIT').map((a) => a.Action);
    for (const a of ['event.create', 'task.create', 'event.publish']) assert.ok(actions.includes(a), a);
  });

  test('CSV export protects against formulas', () => {
    const admin = makeUser();
    makeAdmin(admin);
    register(makeUser(), { college: '=HYPERLINK("http://x")' });
    const out = as(admin, 'admin.export', { eventId: EVENT_ID, kind: 'registrations' }).data;
    assert.equal(out.rows, 1);
    assert.match(out.csv, /"'=HYPERLINK\(""http:\/\/x""\)"/);
  });

  test('analytics count registrations, approvals, colleges and referrals', () => {
    const admin = makeUser();
    makeAdmin(admin);
    const a = makeUser(); const b = makeUser();
    register(a, { college: 'IIT Delhi' });
    register(b, { college: 'IIT Delhi', referralCode: a.referralCode });
    submit(a, 1, { text: 'I pledge to segregate waste, carry a bottle and avoid plastic.' });
    const r = submit(b, 2, { imageBase64: JPEG });
    as(admin, 'admin.review', { submissionId: r.data.submission.id, decision: 'rejected', reason: 'Not sorted' });
    const an = as(admin, 'admin.analytics', { eventId: EVENT_ID }).data;
    assert.equal(an.totals.registrations, 2);
    assert.equal(an.totals.activeParticipants, 2);
    assert.equal(an.totals.approvalRate, 50);
    assert.equal(an.colleges[0].college, 'IIT Delhi');
    assert.equal(an.colleges[0].registrations, 2);
    assert.equal(an.referrals[0].registrations, 1);
    assert.equal(an.dailyRegistrations.reduce((x, d) => x + d.count, 0), 2);
    assert.equal(an.taskCompletion.find((d) => d.day === 1).approved, 1);
  });

  test('the review queue returns pending work with thumbnails', () => {
    const rev = makeUser();
    makeAdmin(rev, 'reviewer');
    const u = makeUser();
    register(u);
    submit(u, 2, { imageBase64: JPEG });
    const q = as(rev, 'admin.queue', { eventId: EVENT_ID }).data;
    assert.equal(q.total, 1);
    assert.match(q.rows[0].thumbnail, /^data:image\/png;base64,/);
    const bulk = as(rev, 'admin.review.bulk', { submissionIds: [q.rows[0].id] }).data;
    assert.equal(bulk.approved, 1);
  });
});

// ===========================================================================
describe('My Events dashboard', () => {
  test('shows registered events, open tasks, pending work and totals', () => {
    const u = makeUser();
    register(u);
    submit(u, 1, { text: 'I pledge to segregate waste, carry a bottle and avoid plastic.' });
    submit(u, 2, { imageBase64: JPEG });
    const d = as(u, 'me.dashboard').data;
    assert.equal(d.totals.events, 1);
    assert.equal(d.totals.points, 10);
    assert.equal(d.totals.pendingSubmissions, 1);
    assert.equal(d.active[0].openTasks.map((t) => t.day).join(','), '3');
    assert.equal(d.active[0].pendingSubmissions[0].day, 2);
    assert.equal(d.history.length, 0);
  });

  test('me.event before registering offers profile details to prefill the form', () => {
    const u = makeUser();
    const r = as(u, 'me.event').data;
    assert.equal(r.registered, false);
    assert.equal(r.profile.email, u.email);
  });
});

// ===========================================================================
describe('limits', () => {
  test('write rate limit per user', () => {
    const u = makeUser();
    let last;
    for (let i = 0; i < 22; i++) last = register(u);
    assert.equal(last.status, 429);
  });

  test('emails wait in the queue when the daily allowance runs out', () => {
    s.g.setMailQuota(5);
    register(makeUser());
    assert.equal(s.g.mails.length, 0);
    assert.equal(s.rows('MAIL_QUEUE').length, 1);
    s.g.setMailQuota(500);
    assert.equal(s.ctx.flushMailQueue(), 1);
    assert.equal(s.g.mails.length, 1);
  });
});
