/**
 * Leaderboards are calculated from the PointsLedger only (verified points).
 * Scopes: "event" (one event), "day-N" (points from that event's day N tasks) and
 * "overall" (every event). Ties go to whoever reached the total first, using the
 * time the work was submitted, not the time a reviewer got to it.
 *
 * rebuildLeaderboards() runs every 5 minutes (time trigger), writes every ranking
 * to the Leaderboard tab and caches the top rows for the website.
 */

function standingsFromLedger_(ledger, regs, filter) {
  var people = {};
  regs.forEach(function (r) {
    if (plain_(r['Status']) !== 'registered') return;
    var id = plain_(r['User ID']);
    // For "overall", the latest registration's college and city are shown.
    people[id] = { userId: id, name: plain_(r['Name']), college: plain_(r['College']), city: plain_(r['City']), points: 0, reachedAt: 0 };
  });
  ledger.forEach(function (r) {
    if (!filter(r)) return;
    var u = people[plain_(r['User ID'])];
    if (!u) return;
    var pts = num_(r['Points'], 0);
    u.points += pts;
    var t = (toDate_(r['Earned at']) || toDate_(r['Created at']) || new Date(0)).getTime();
    if (pts > 0 && t > u.reachedAt) u.reachedAt = t;
  });
  return Object.keys(people)
    .map(function (k) { return people[k]; })
    .filter(function (u) { return u.points > 0; })
    .sort(function (a, b) { return b.points - a.points || a.reachedAt - b.reachedAt || (a.userId < b.userId ? -1 : 1); });
}

/** Every ranking, keyed "<eventId>|<scope>" (overall uses eventId ""). */
function computeAllStandings_() {
  var ledger = readRows_(TABS.LEDGER);
  var regs = readRows_(TABS.REGISTRATIONS);
  var out = {};
  allEvents_().filter(function (e) { return e.published; }).forEach(function (ev) {
    var evRegs = regs.filter(function (r) { return plain_(r['Event ID']) === ev.id; });
    out[ev.id + '|event'] = standingsFromLedger_(ledger, evRegs, function (r) { return plain_(r['Event ID']) === ev.id; });
    var days = {};
    tasksOf_(ev.id).forEach(function (t) { days[t.day] = true; });
    Object.keys(days).forEach(function (d) {
      out[ev.id + '|day-' + d] = standingsFromLedger_(ledger, evRegs, function (r) {
        return plain_(r['Event ID']) === ev.id && String(r['Day']) === String(d);
      });
    });
  });
  var published = {};
  allEvents_().forEach(function (e) { if (e.published) published[e.id] = true; });
  out['|overall'] = standingsFromLedger_(ledger, regs, function (r) { return published[plain_(r['Event ID'])]; });
  return out;
}

function publicRow_(u, i) {
  return { rank: i + 1, name: displayName_(u.name), college: u.college, city: u.city, points: u.points };
}

/** Time-trigger entry point (also in the EventHub menu). */
function rebuildLeaderboards() {
  var all = computeAllStandings_();
  var now = new Date();
  var values = [];
  var cache = CacheService.getScriptCache();
  Object.keys(all).forEach(function (key) {
    var parts = key.split('|');
    var rows = all[key];
    rows.forEach(function (u, i) {
      values.push([parts[0], parts[1], i + 1, u.userId, u.name, u.college, u.city, u.points, new Date(u.reachedAt), now]);
    });
    cachePutJson_('lb:' + key, {
      total: rows.length,
      rows: rows.slice(0, CONFIG.LEADERBOARD_CACHE_ROWS).map(publicRow_),
      updatedAt: now.toISOString(),
    }, CONFIG.LEADERBOARD_CACHE_SECONDS);
  });
  var sh = sheet_(TABS.LEADERBOARD);
  var width = TABS.LEADERBOARD.headers.length;
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, width).clearContent();
  if (values.length) sh.getRange(2, 1, values.length, width).setValues(values.map(function (v) { return v.map(safeText_); }));
  cache.remove('lb:dirty');
  return Object.keys(all).length;
}

function leaderboardData_(eventId, scope) {
  var key = eventId + '|' + scope;
  var hit = cacheGetJson_('lb:' + key);
  if (hit) return hit;
  var all = computeAllStandings_();
  var rows = all[key] || [];
  var data = { total: rows.length, rows: rows.slice(0, CONFIG.LEADERBOARD_CACHE_ROWS).map(publicRow_), updatedAt: new Date().toISOString(), full: rows };
  cachePutJson_('lb:' + key, { total: data.total, rows: data.rows, updatedAt: data.updatedAt }, CONFIG.LEADERBOARD_CACHE_SECONDS);
  return data;
}

/**
 * GET leaderboard.get ?slug=<event>|overall &scope=event|day &day=N &page=1 &pageSize=20
 * Public: display name ("Priya S."), college, city and points only.
 */
function apiLeaderboard_(p) {
  var overall = !p.slug || String(p.slug) === 'overall';
  var ev = overall ? null : eventBySlug_(p.slug);
  var scope = overall ? 'overall' : (String(p.scope || 'event') === 'day' ? 'day-' + Math.max(1, Math.floor(num_(p.day, 1))) : 'event');
  var pageSize = Math.max(1, Math.min(CONFIG.PAGE_SIZE_MAX, Math.floor(num_(p.pageSize, 20))));
  var page = Math.max(1, Math.floor(num_(p.page, 1)));
  var data = leaderboardData_(ev ? ev.id : '', scope);
  var start = (page - 1) * pageSize;
  var rows;
  if (start + pageSize <= data.rows.length || data.total <= data.rows.length) {
    rows = data.rows.slice(start, start + pageSize);
  } else {
    // Deep pages beyond the cached top rows come from the Leaderboard tab.
    var full = data.full || leaderboardTabRows_(ev ? ev.id : '', scope);
    rows = full.slice(start, start + pageSize).map(function (u, i) { return publicRow_(u, start + i); });
  }
  return {
    event: ev ? { slug: ev.slug, title: ev.title, days: tasksOf_(ev.id).map(function (t) { return t.day; }) } : null,
    scope: scope,
    page: page,
    pageSize: pageSize,
    total: data.total,
    pages: Math.max(1, Math.ceil(data.total / pageSize)),
    rows: rows,
    updatedAt: data.updatedAt,
  };
}

function leaderboardTabRows_(eventId, scope) {
  return readRows_(TABS.LEADERBOARD)
    .filter(function (r) { return plain_(r['Event ID']) === eventId && plain_(r['Scope']) === scope; })
    .sort(function (a, b) { return num_(a['Rank'], 0) - num_(b['Rank'], 0); })
    .map(function (r) { return { userId: plain_(r['User ID']), name: plain_(r['Name']), college: plain_(r['College']), city: plain_(r['City']), points: num_(r['Points'], 0) }; });
}

/** A participant's rank, from the last rebuild (null when they have no points yet). */
function rankOf_(eventId, scope, userId) {
  var row = rowsWhere_(TABS.LEADERBOARD, 'User ID', userId).filter(function (r) {
    return plain_(r['Event ID']) === eventId && plain_(r['Scope']) === scope;
  })[0];
  return row ? num_(row['Rank'], null) : null;
}

/** Runs every 5 minutes; skips the work when no points changed since the last rebuild. */
function rebuildLeaderboardsIfChanged() {
  if (!CacheService.getScriptCache().get('lb:dirty') && sheet_(TABS.LEADERBOARD).getLastRow() > 1) return 0;
  return rebuildLeaderboards();
}
