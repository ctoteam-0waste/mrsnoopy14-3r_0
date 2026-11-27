/**
 * Events and their daily tasks. The team can edit both in the sheet or through
 * /admin/events; the public only ever sees published events.
 */

// ------------------------------------------------------------------ parsing

/** "Q: ...\nA: ...\n\nQ: ..." -> [{ q, a }] */
function parseFaq_(v) {
  var out = [];
  var cur = null;
  plain_(v).split(/\r?\n/).forEach(function (line) {
    var t = line.trim();
    if (!t) return;
    var q = t.match(/^Q[:.)-]\s*(.*)$/i);
    var a = t.match(/^A[:.)-]\s*(.*)$/i);
    if (q) { cur = { q: q[1], a: '' }; out.push(cur); }
    else if (a && cur) cur.a = (cur.a ? cur.a + ' ' : '') + a[1];
    else if (cur) cur.a = (cur.a ? cur.a + ' ' : '') + t;
  });
  return out.filter(function (f) { return f.q && f.a; });
}

function eventFromRow_(r) {
  return {
    id: plain_(r['Event ID']),
    slug: plain_(r['Slug']).trim().toLowerCase(),
    title: plain_(r['Title']),
    category: plain_(r['Category']),
    published: truthy_(r['Published']),
    featured: truthy_(r['Featured']),
    summary: plain_(r['Short description']),
    bannerUrl: plain_(r['Banner URL']),
    overview: plain_(r['Overview']),
    objectives: lines_(r['Objectives']),
    eligibility: lines_(r['Eligibility']),
    rules: lines_(r['Rules']),
    rewards: lines_(r['Rewards']),
    faq: parseFaq_(r['FAQ']),
    audience: plain_(r['Audience']),
    fee: plain_(r['Registration fee']) || 'Free',
    startAt: iso_(r['Starts at']),
    endAt: iso_(r['Ends at']),
    regOpensAt: iso_(r['Registration opens']),
    regClosesAt: iso_(r['Registration closes']),
    maxParticipants: num_(r['Max participants'], 0),
    lateSubmissions: truthy_(r['Late submissions']),
    pickupBonus: num_(r['Pickup bonus points'], 0),
    certificatesEnabled: truthy_(r['Certificates enabled']),
    certificateRule: plain_(r['Certificate rule']) || 'minApprovedTasks=1',
    _row: r._row,
  };
}

function taskFromRow_(r) {
  var accepts = plain_(r['Accepts']).toLowerCase().split(/[,\s|]+/).filter(function (a) {
    return CONFIG.ACCEPTS.indexOf(a) !== -1;
  });
  return {
    id: plain_(r['Task ID']),
    eventId: plain_(r['Event ID']),
    day: num_(r['Day'], 0),
    title: plain_(r['Title']),
    instructions: plain_(r['Instructions']),
    accepts: accepts.length ? accepts : ['text'],
    points: Math.max(0, num_(r['Points'], 0)),
    qualityMax: Math.max(0, num_(r['Quality max'], 0)),
    autoApprove: truthy_(r['Auto approve']),
    allowResubmit: r['Allow resubmit'] === '' ? true : truthy_(r['Allow resubmit']),
    opensAt: iso_(r['Opens at']),
    closesAt: iso_(r['Closes at']),
    bonusRule: plain_(r['Bonus rule']).trim(),
    active: r['Active'] === '' ? true : truthy_(r['Active']),
    _row: r._row,
  };
}

/** Every event row (drafts included), cached for a minute. Rows missing an ID, slug or dates are skipped. */
function allEvents_() {
  var hit = cacheGetJson_('events');
  if (hit) return hit;
  var list = readRows_(TABS.EVENTS).map(eventFromRow_).filter(function (e) {
    return e.id && e.slug && e.title && e.startAt && e.endAt;
  });
  cachePutJson_('events', list, CONFIG.EVENTS_CACHE_SECONDS);
  return list;
}

function allTasks_() {
  var hit = cacheGetJson_('tasks');
  if (hit) return hit;
  var list = readRows_(TABS.TASKS).map(taskFromRow_).filter(function (t) { return t.id && t.eventId && t.day > 0; });
  list.sort(function (a, b) { return a.day - b.day || (a._row - b._row); });
  cachePutJson_('tasks', list, CONFIG.EVENTS_CACHE_SECONDS);
  return list;
}

function tasksOf_(eventId, includeInactive) {
  return allTasks_().filter(function (t) { return t.eventId === eventId && (includeInactive || t.active); });
}

function clearCaches() {
  CacheService.getScriptCache().removeAll(['events', 'tasks', 'settings', 'categories', 'regcounts']);
}

/** Published event by slug (admins may also open drafts). 404 otherwise. */
function eventBySlug_(slug, allowDraft) {
  var s = String(slug || '').trim().toLowerCase();
  var ev = allEvents_().filter(function (e) { return e.slug === s; })[0];
  if (!ev || (!ev.published && !allowDraft)) throw httpError_(404, 'We could not find that event.');
  return ev;
}

function eventById_(id) {
  var ev = allEvents_().filter(function (e) { return e.id === String(id || ''); })[0];
  if (!ev) throw httpError_(404, 'We could not find that event.');
  return ev;
}

// ------------------------------------------------------------------ state

function phase_(ev, now) {
  var t = (now || new Date()).getTime();
  if (t < new Date(ev.startAt).getTime()) return 'upcoming';
  if (t > new Date(ev.endAt).getTime()) return 'completed';
  return 'live';
}

/** open | not_yet | closed | full */
function registrationState_(ev, count, now) {
  var t = (now || new Date()).getTime();
  var opens = ev.regOpensAt ? new Date(ev.regOpensAt).getTime() : 0;
  var closes = ev.regClosesAt ? new Date(ev.regClosesAt).getTime() : new Date(ev.endAt).getTime();
  if (t < opens) return 'not_yet';
  if (t > closes) return 'closed';
  if (ev.maxParticipants > 0 && count >= ev.maxParticipants) return 'full';
  return 'open';
}

/**
 * A task opens on its day (start + day-1 days) unless the sheet gives a date. It
 * closes at the end of the event when late submissions are on, otherwise a day
 * after it opens.
 */
function taskWindow_(task, ev) {
  var start = new Date(ev.startAt).getTime();
  var end = new Date(ev.endAt).getTime();
  var opens = task.opensAt ? new Date(task.opensAt).getTime() : start + (task.day - 1) * DAY_MS;
  var closes = task.closesAt ? new Date(task.closesAt).getTime() : (ev.lateSubmissions ? end : opens + DAY_MS);
  return { opensAt: new Date(opens), closesAt: new Date(Math.min(closes, end)) };
}

function taskState_(task, ev, now) {
  var w = taskWindow_(task, ev);
  var t = (now || new Date()).getTime();
  if (t < w.opensAt.getTime()) return 'locked';
  if (t > w.closesAt.getTime()) return 'closed';
  return 'open';
}

/** Registrations per event ID (registered status only), cached for a minute. */
function registrationCounts_() {
  var hit = cacheGetJson_('regcounts');
  if (hit) return hit;
  var ids = columnValues_(TABS.REGISTRATIONS, 'Event ID');
  var statuses = columnValues_(TABS.REGISTRATIONS, 'Status');
  var out = {};
  ids.forEach(function (id, i) {
    var k = plain_(id);
    if (!k || plain_(statuses[i]) !== 'registered') return;
    out[k] = (out[k] || 0) + 1;
  });
  cachePutJson_('regcounts', out, CONFIG.EVENTS_CACHE_SECONDS);
  return out;
}

function maxScore_(ev, tasks) {
  return tasks.reduce(function (sum, t) { return sum + t.points + t.qualityMax; }, 0) + (ev.pickupBonus || 0);
}

function categories_() {
  var hit = cacheGetJson_('categories');
  if (hit) return hit;
  var list = readRows_(TABS.CATEGORIES)
    .filter(function (r) { return plain_(r['Category']).trim() && (r['Active'] === '' || truthy_(r['Active'])); })
    .sort(function (a, b) { return num_(a['Order'], 99) - num_(b['Order'], 99); })
    .map(function (r) { return plain_(r['Category']).trim(); });
  cachePutJson_('categories', list, CONFIG.EVENTS_CACHE_SECONDS);
  return list;
}

// ------------------------------------------------------------------ public views

function durationDays_(ev) {
  return Math.max(1, Math.round((new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime()) / DAY_MS));
}

function eventCard_(ev, counts, now) {
  var count = counts[ev.id] || 0;
  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    category: ev.category,
    summary: ev.summary,
    bannerUrl: ev.bannerUrl,
    featured: ev.featured,
    startAt: ev.startAt,
    endAt: ev.endAt,
    durationDays: durationDays_(ev),
    regClosesAt: ev.regClosesAt || ev.endAt,
    participants: count,
    status: phase_(ev, now),
    registration: registrationState_(ev, count, now),
    fee: ev.fee,
  };
}

function publicTask_(task, ev, now) {
  var w = taskWindow_(task, ev);
  return {
    id: task.id,
    day: task.day,
    title: task.title,
    instructions: task.instructions,
    accepts: task.accepts,
    points: task.points,
    qualityMax: task.qualityMax,
    bonus: task.bonusRule === 'karmaverse_pickup' ? ev.pickupBonus : 0,
    bonusRule: task.bonusRule,
    opensAt: w.opensAt.toISOString(),
    closesAt: w.closesAt.toISOString(),
    state: taskState_(task, ev, now),
  };
}

/** GET events.list ?q= &category= &status=upcoming|live|completed &from= &to= (ISO dates) */
function apiEventsList_(p) {
  var now = new Date();
  var counts = registrationCounts_();
  var q = String(p.q || '').trim().toLowerCase().slice(0, 80);
  var category = String(p.category || '').trim();
  var status = String(p.status || '').trim();
  var from = toDate_(p.from);
  var to = toDate_(p.to);
  var list = allEvents_()
    .filter(function (e) { return e.published; })
    .map(function (e) { return eventCard_(e, counts, now); })
    .filter(function (c) {
      if (category && c.category !== category) return false;
      if (status && c.status !== status) return false;
      if (from && new Date(c.endAt) < from) return false;
      if (to && new Date(c.startAt) > to) return false;
      if (q && (c.title + ' ' + c.summary + ' ' + c.category).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  var order = { live: 0, upcoming: 1, completed: 2 };
  list.sort(function (a, b) {
    return order[a.status] - order[b.status] ||
      (a.status === 'completed' ? new Date(b.endAt) - new Date(a.endAt) : new Date(a.startAt) - new Date(b.startAt));
  });
  return { events: list.slice(0, 100), categories: categories_() };
}

function eventDetail_(ev, now) {
  var counts = registrationCounts_();
  var tasks = tasksOf_(ev.id);
  var card = eventCard_(ev, counts, now);
  card.overview = ev.overview;
  card.objectives = ev.objectives;
  card.eligibility = ev.eligibility;
  card.rules = ev.rules;
  card.rewards = ev.rewards;
  card.faq = ev.faq;
  card.audience = ev.audience;
  card.regOpensAt = ev.regOpensAt;
  card.maxParticipants = ev.maxParticipants;
  card.lateSubmissions = ev.lateSubmissions;
  card.pickupBonus = ev.pickupBonus;
  card.certificatesEnabled = ev.certificatesEnabled;
  card.maxScore = maxScore_(ev, tasks);
  card.tasks = tasks.map(function (t) { return publicTask_(t, ev, now); });
  card.url = siteUrl_() + '/events/' + ev.slug;
  return card;
}

/** GET events.get ?slug= */
function apiEventGet_(p) {
  return eventDetail_(eventBySlug_(p.slug), new Date());
}
