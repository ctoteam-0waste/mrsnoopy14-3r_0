/**
 * Who is calling? The website sends the user's existing KarmaVerse login token.
 * We ask the KarmaVerse API who that is (GET /api/v1/users/profile): a valid token
 * returns the user, anything else is refused. EventHub never creates accounts.
 * Results are cached for 10 minutes per token to spare the API.
 */
function authUser_(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) {
    throw httpError_(401, 'Please log in to continue.');
  }
  var cache = CacheService.getScriptCache();
  var key = 'auth:' + sha256Hex_(token);
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  var res = UrlFetchApp.fetch(apiBase_() + '/api/v1/users/profile', {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code === 401 || code === 403 || code === 404) {
    throw httpError_(401, 'Your session has expired. Please log in again.');
  }
  if (code !== 200) throw httpError_(503, 'Could not verify your login. Please try again.');

  var u = (JSON.parse(res.getContentText()) || {}).data || {};
  if (u.user && u.user._id) u = u.user;
  if (!u._id) throw httpError_(401, 'Please log in to continue.');
  var user = {
    id: String(u._id),
    name: String(u.name || ''),
    email: String(u.email || '').toLowerCase(),
    phone: String(u.phone || ''),
    city: String((u.address && u.address.city) || u.city || ''),
    referralCode: String(u.referralCode || '').toUpperCase(),
  };
  cache.put(key, JSON.stringify(user), CONFIG.AUTH_CACHE_SECONDS);
  return user;
}

function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/** Per-user write limit (register, submit, review...). */
function rateLimit_(userId) {
  var cache = CacheService.getScriptCache();
  var key = 'rl:' + userId + ':' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  if (n > CONFIG.WRITES_PER_MINUTE) throw httpError_(429, 'Too many requests. Please wait a minute and try again.');
}

/** "Priya Sharma" -> "Priya S." Public lists never show emails, phones or full names. */
function displayName_(name) {
  var parts = plain_(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'KarmaVerse member';
  var first = parts[0].slice(0, 20);
  return parts.length > 1 ? first + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.' : first;
}

// ------------------------------------------------------------------ roles

var ROLE_RANK = { reviewer: 1, admin: 2, owner: 3 };

/**
 * Role from the Admins tab (matched by KarmaVerse user ID or email). Only people
 * with edit access to the spreadsheet can change that tab.
 */
function roleOf_(user) {
  if (!user) return '';
  var best = '';
  readRows_(TABS.ADMINS).forEach(function (r) {
    if (!truthy_(r['Active'])) return;
    var id = plain_(r['User ID']).trim();
    var email = plain_(r['Email']).trim().toLowerCase();
    var matches = (id && id === user.id) || (email && user.email && email === user.email);
    var role = plain_(r['Role']).trim().toLowerCase();
    if (matches && ROLE_RANK[role] && (!best || ROLE_RANK[role] > ROLE_RANK[best])) best = role;
  });
  return best;
}

function requireRole_(user, minRole) {
  var role = roleOf_(user);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) throw httpError_(403, 'You do not have access to this.');
  return role;
}

/** Append-only record of every administrative change. */
function audit_(by, action, entity, entityId, before, after, note) {
  appendRow_(TABS.AUDIT, {
    'At': new Date(),
    'Log ID': uuid_(),
    'By': String(by || 'system'),
    'Action': action,
    'Entity': entity,
    'Entity ID': String(entityId || ''),
    'Before': before === undefined || before === null ? '' : JSON.stringify(before).slice(0, 45000),
    'After': after === undefined || after === null ? '' : JSON.stringify(after).slice(0, 45000),
    'Note': note || '',
  });
}

function actorOf_(user) {
  return user ? (user.email || user.id) : 'system';
}
