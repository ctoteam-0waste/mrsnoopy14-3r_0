/**
 * Admin actions for /admin/events. Roles come from the Admins tab:
 *   reviewer: review queue and approve/reject
 *   admin:    everything else (events, tasks, scoring, participants, points, certificates, analytics)
 *   owner:    same as admin
 * Every change is written to the AuditLog tab with before/after values.
 */

function apiAdminMe_(p, user) {
  var role = roleOf_(user);
  if (!role) throw httpError_(403, 'You do not have access to this.');
  return { role: role, name: user.name, email: user.email };
}

// ------------------------------------------------------------------ events

function adminEventView_(ev, counts, now) {
  var card = eventCard_(ev, counts, now);
  card.published = ev.published;
  return card;
}

function apiAdminEvents_(p, user) {
  requireRole_(user, 'reviewer');
  var now = new Date();
  var counts = registrationCounts_();
  return { events: allEvents_().map(function (e) { return adminEventView_(e, counts, now); }), categories: categories_() };
}

/** Full editable event, including drafts. */
function apiAdminEventGet_(p, user) {
  requireRole_(user, 'reviewer');
  var ev = eventById_(p.eventId);
  return {
    event: ev,
    tasks: tasksOf_(ev.id, true),
    maxScore: maxScore_(ev, tasksOf_(ev.id)),
  };
}

function reqDate_(v, label) {
  var d = toDate_(v);
  if (!d) throw httpError_(400, label + ' must be a valid date and time.');
  return d;
}

function optDate_(v, label) {
  if (v === '' || v === null || v === undefined) return '';
  return reqDate_(v, label);
}

function listText_(v, label, maxItems) {
  var arr = Array.isArray(v) ? v : String(v || '').split(/\r?\n/);
  arr = arr.map(function (s) { return String(s).trim(); }).filter(Boolean);
  if (arr.length > maxItems) throw httpError_(400, label + ': at most ' + maxItems + ' items.');
  arr.forEach(function (s) { if (s.length > 500) throw httpError_(400, label + ': each item must be 500 characters or fewer.'); });
  return arr.join('\n');
}

function faqText_(v) {
  var arr = Array.isArray(v) ? v : [];
  if (arr.length > 30) throw httpError_(400, 'FAQ: at most 30 questions.');
  return arr.filter(function (f) { return f && String(f.q || '').trim() && String(f.a || '').trim(); })
    .map(function (f) { return 'Q: ' + String(f.q).trim().slice(0, 300) + '\nA: ' + String(f.a).trim().slice(0, 1500); })
    .join('\n\n');
}

function httpsUrlOrBlank_(v, label) {
  var s = String(v || '').trim();
  if (s && !/^https:\/\/[^\s]+$/i.test(s)) throw httpError_(400, label + ' must start with https://');
  return s.slice(0, 1000);
}

/**
 * POST admin.event.save { event: {...} } creates (no id) or updates an event.
 * Published state is changed only through admin.event.publish.
 */
function apiAdminEventSave_(p, user) {
  requireRole_(user, 'admin');
  var e = p.event || {};
  var slug = String(e.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 60) {
    throw httpError_(400, 'The web address (slug) must be 3–60 lowercase letters, numbers and dashes, like green-impact-challenge.');
  }
  if (slug === 'overall') throw httpError_(400, 'The address "overall" is reserved for the combined leaderboard.');
  var category = str_(e.category, 'Category', 1, 60);
  if (categories_().indexOf(category) === -1) throw httpError_(400, 'Choose one of the categories.');
  var start = reqDate_(e.startAt, 'Start');
  var end = reqDate_(e.endAt, 'End');
  if (end <= start) throw httpError_(400, 'The event must end after it starts.');
  var regOpens = optDate_(e.regOpensAt, 'Registration opens');
  var regCloses = optDate_(e.regClosesAt, 'Registration closes');
  if (regOpens && regCloses && regCloses <= regOpens) throw httpError_(400, 'Registration must close after it opens.');
  var maxP = Math.floor(num_(e.maxParticipants, 0));
  if (maxP < 0 || maxP > 1000000) throw httpError_(400, 'Max participants must be 0 (no limit) or more.');
  var bonus = Math.floor(num_(e.pickupBonus, 0));
  if (bonus < 0 || bonus > 1000) throw httpError_(400, 'Pickup bonus must be between 0 and 1000.');
  var rule = String(e.certificateRule || 'minApprovedTasks=1').trim();
  if (!/^(\s*(allTasks|minApprovedTasks\s*[=:]\s*\d+|minPoints\s*[=:]\s*\d+)\s*[;,]?)+$/i.test(rule)) {
    throw httpError_(400, 'Certificate rule must look like "minApprovedTasks=5", "minApprovedTasks=5; minPoints=60" or "allTasks".');
  }

  var row = {
    'Slug': slug,
    'Title': str_(e.title, 'Title', 3, 120),
    'Category': category,
    'Featured': e.featured === true,
    'Short description': str_(e.summary, 'Short description', 10, 300),
    'Banner URL': httpsUrlOrBlank_(e.bannerUrl, 'Banner URL'),
    'Overview': str_(e.overview, 'Overview', 0, 5000),
    'Objectives': listText_(e.objectives, 'Objectives', 20),
    'Eligibility': listText_(e.eligibility, 'Eligibility', 20),
    'Rules': listText_(e.rules, 'Rules', 40),
    'Rewards': listText_(e.rewards, 'Rewards', 20),
    'FAQ': faqText_(e.faq),
    'Audience': str_(e.audience, 'Audience', 0, 200),
    'Registration fee': str_(e.fee || 'Free', 'Registration fee', 1, 60),
    'Starts at': start,
    'Ends at': end,
    'Registration opens': regOpens,
    'Registration closes': regCloses,
    'Max participants': maxP,
    'Late submissions': e.lateSubmissions === true,
    'Pickup bonus points': bonus,
    'Certificates enabled': e.certificatesEnabled === true,
    'Certificate rule': rule,
    'Updated at': new Date(),
  };

  var by = actorOf_(user);
  var saved = withLock_(function () {
    var rows = readRows_(TABS.EVENTS);
    var clash = rows.filter(function (r) { return plain_(r['Slug']).toLowerCase() === slug && plain_(r['Event ID']) !== String(e.id || ''); })[0];
    if (clash) throw httpError_(409, 'Another event already uses the address /events/' + slug + '.');
    if (e.id) {
      var current = rows.filter(function (r) { return plain_(r['Event ID']) === String(e.id); })[0];
      if (!current) throw httpError_(404, 'We could not find that event.');
      var before = eventFromRow_(current);
      updateCells_(TABS.EVENTS, current._row, row);
      audit_(by, 'event.update', 'event', e.id, before, row);
      return String(e.id);
    }
    var id = shortId_('E-', 8);
    row['Event ID'] = id;
    row['Published'] = false;
    row['Created at'] = new Date();
    appendRow_(TABS.EVENTS, row);
    audit_(by, 'event.create', 'event', id, null, row);
    return id;
  });
  clearCaches();
  return apiAdminEventGet_({ eventId: saved }, user);
}

/** POST admin.event.publish { eventId, published: true|false } */
function apiAdminEventPublish_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  var publish = p.published === true;
  if (publish && !tasksOf_(ev.id).length) throw httpError_(400, 'Add at least one active task before publishing.');
  withLock_(function () {
    var row = rowWhere_(TABS.EVENTS, 'Event ID', ev.id);
    updateCells_(TABS.EVENTS, row._row, { 'Published': publish, 'Updated at': new Date() });
    audit_(actorOf_(user), publish ? 'event.publish' : 'event.unpublish', 'event', ev.id, { published: ev.published }, { published: publish });
  });
  clearCaches();
  return { eventId: ev.id, published: publish };
}

// ------------------------------------------------------------------ tasks & scoring

/** POST admin.task.save { task: { id?, eventId, day, title, instructions, accepts[], points, qualityMax, autoApprove, allowResubmit, opensAt?, closesAt?, bonusRule, active } } */
function apiAdminTaskSave_(p, user) {
  requireRole_(user, 'admin');
  var t = p.task || {};
  var ev = eventById_(t.eventId);
  var day = Math.floor(num_(t.day, 0));
  if (day < 1 || day > 366) throw httpError_(400, 'Day must be 1 or more.');
  var accepts = (Array.isArray(t.accepts) ? t.accepts : String(t.accepts || '').split(','))
    .map(function (a) { return String(a).trim().toLowerCase(); })
    .filter(function (a) { return CONFIG.ACCEPTS.indexOf(a) !== -1; });
  if (!accepts.length) throw httpError_(400, 'Choose at least one proof type: text, photo or link.');
  var points = Math.floor(num_(t.points, -1));
  var qmax = Math.floor(num_(t.qualityMax, 0));
  if (points < 0 || points > 1000) throw httpError_(400, 'Points must be between 0 and 1000.');
  if (qmax < 0 || qmax > 100) throw httpError_(400, 'Quality bonus must be between 0 and 100.');
  var bonusRule = String(t.bonusRule || '').trim();
  if (CONFIG.BONUS_RULES.indexOf(bonusRule) === -1) throw httpError_(400, 'Unknown bonus rule.');
  var row = {
    'Event ID': ev.id,
    'Day': day,
    'Title': str_(t.title, 'Task title', 3, 120),
    'Instructions': str_(t.instructions, 'Instructions', 10, 3000),
    'Accepts': accepts.join(','),
    'Points': points,
    'Quality max': qmax,
    'Auto approve': t.autoApprove === true,
    'Allow resubmit': t.allowResubmit !== false,
    'Opens at': optDate_(t.opensAt, 'Opens at'),
    'Closes at': optDate_(t.closesAt, 'Closes at'),
    'Bonus rule': bonusRule,
    'Active': t.active !== false,
  };
  var by = actorOf_(user);
  var id = withLock_(function () {
    if (t.id) {
      var cur = rowWhere_(TABS.TASKS, 'Task ID', String(t.id));
      if (!cur || plain_(cur['Event ID']) !== ev.id) throw httpError_(404, 'We could not find that task.');
      updateCells_(TABS.TASKS, cur._row, row);
      audit_(by, 'task.update', 'task', t.id, taskFromRow_(cur), row);
      return String(t.id);
    }
    var nid = shortId_('T-', 8);
    row['Task ID'] = nid;
    appendRow_(TABS.TASKS, row);
    audit_(by, 'task.create', 'task', nid, null, row);
    return nid;
  });
  clearCaches();
  return { taskId: id, tasks: tasksOf_(ev.id, true), maxScore: maxScore_(ev, tasksOf_(ev.id)) };
}

/** POST admin.categories.save { categories: ["Sustainability", ...] } */
function apiAdminCategoriesSave_(p, user) {
  requireRole_(user, 'admin');
  var list = (Array.isArray(p.categories) ? p.categories : []).map(function (c) { return String(c).trim(); }).filter(Boolean);
  if (!list.length || list.length > 30) throw httpError_(400, 'Give between 1 and 30 categories.');
  list.forEach(function (c) { if (c.length > 60) throw httpError_(400, 'Category names must be 60 characters or fewer.'); });
  var before = categories_();
  withLock_(function () {
    var sh = sheet_(TABS.CATEGORIES);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, TABS.CATEGORIES.headers.length).clearContent();
    sh.getRange(2, 1, list.length, 3).setValues(list.map(function (c, i) { return [safeText_(c), i + 1, true]; }));
    audit_(actorOf_(user), 'categories.save', 'categories', '', before, list);
  });
  clearCaches();
  return { categories: categories_() };
}

/** POST admin.banner.upload { imageBase64 } -> { url } (the banner file is public, read-only) */
function apiAdminBannerUpload_(p, user) {
  requireRole_(user, 'admin');
  var img = decodeImage_(p.imageBase64, CONFIG.BANNER_MAX_BYTES);
  var id = prop_('BANNERS_FOLDER_ID', '');
  if (!id) throw httpError_(503, 'Banner uploads are not set up yet. Run setupEventHub.');
  var file = DriveApp.getFolderById(id).createFile(Utilities.newBlob(img.bytes, img.kind.mime, 'banner_' + uuid_() + '.' + img.kind.ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var url = 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1600';
  audit_(actorOf_(user), 'banner.upload', 'file', file.getId(), null, { url: url });
  return { url: url };
}

// ------------------------------------------------------------------ participants

function adminRegistrationView_(r) {
  return {
    registrationId: plain_(r['Registration ID']),
    userId: plain_(r['User ID']),
    registeredAt: iso_(r['Registered at']),
    name: plain_(r['Name']),
    email: plain_(r['Email']),
    phone: plain_(r['Phone']),
    college: plain_(r['College']),
    city: plain_(r['City']),
    referredByCode: plain_(r['Referred by code']),
    status: plain_(r['Status']),
    certificateOverride: plain_(r['Certificate override']),
  };
}

/** POST admin.participants { eventId, q?, page?, pageSize? } */
function apiAdminParticipants_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  var q = String(p.q || '').trim().toLowerCase();
  var points = {};
  readRows_(TABS.LEDGER).forEach(function (r) {
    if (plain_(r['Event ID']) === ev.id) points[plain_(r['User ID'])] = (points[plain_(r['User ID'])] || 0) + num_(r['Points'], 0);
  });
  var list = readRows_(TABS.REGISTRATIONS)
    .filter(function (r) { return plain_(r['Event ID']) === ev.id; })
    .map(function (r) { var v = adminRegistrationView_(r); v.points = points[v.userId] || 0; return v; })
    .filter(function (v) { return !q || (v.name + ' ' + v.email + ' ' + v.phone + ' ' + v.college + ' ' + v.city).toLowerCase().indexOf(q) !== -1; })
    .reverse();
  var pageSize = Math.max(1, Math.min(100, Math.floor(num_(p.pageSize, 25))));
  var page = Math.max(1, Math.floor(num_(p.page, 1)));
  return { total: list.length, page: page, pages: Math.max(1, Math.ceil(list.length / pageSize)), rows: list.slice((page - 1) * pageSize, page * pageSize) };
}

/** POST admin.participant.update { eventId, userId, status?, certificateOverride? } */
function apiAdminParticipantUpdate_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  var changes = {};
  if (p.status !== undefined) {
    if (['registered', 'withdrawn', 'disqualified'].indexOf(p.status) === -1) throw httpError_(400, 'Unknown status.');
    changes['Status'] = p.status;
  }
  if (p.certificateOverride !== undefined) {
    if (['', 'eligible', 'blocked'].indexOf(p.certificateOverride) === -1) throw httpError_(400, 'Certificate override must be blank, eligible or blocked.');
    changes['Certificate override'] = p.certificateOverride;
  }
  if (!Object.keys(changes).length) throw httpError_(400, 'Nothing to change.');
  return withLock_(function () {
    var reg = registrationOf_(ev.id, String(p.userId || ''));
    if (!reg) throw httpError_(404, 'That person is not registered for this event.');
    var before = adminRegistrationView_(reg);
    updateCells_(TABS.REGISTRATIONS, reg._row, changes);
    audit_(actorOf_(user), 'participant.update', 'registration', before.registrationId, { status: before.status, certificateOverride: before.certificateOverride }, changes, String(p.note || '').slice(0, 200));
    CacheService.getScriptCache().remove('regcounts');
    CacheService.getScriptCache().put('lb:dirty', '1', 3600);
    return adminRegistrationView_(registrationOf_(ev.id, before.userId));
  });
}

function csvCell_(v) {
  var s = v instanceof Date ? v.toISOString() : String(v === null || v === undefined ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stops spreadsheet apps running it as a formula
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** POST admin.export { eventId, kind: registrations|submissions } -> { fileName, csv } */
function apiAdminExport_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  var kind = p.kind === 'submissions' ? 'submissions' : 'registrations';
  var tab = kind === 'submissions' ? TABS.SUBMISSIONS : TABS.REGISTRATIONS;
  var headers = tab.headers;
  var rows = readRows_(tab).filter(function (r) { return plain_(r['Event ID']) === ev.id; });
  var csv = [headers.map(csvCell_).join(',')].concat(rows.map(function (r) {
    return headers.map(function (h) { return csvCell_(plain_(r[h] instanceof Date ? r[h].toISOString() : r[h])); }).join(',');
  })).join('\r\n');
  audit_(actorOf_(user), 'export', kind, ev.id, null, { rows: rows.length });
  return { fileName: ev.slug + '-' + kind + '-' + istDate_(new Date()) + '.csv', csv: csv, rows: rows.length };
}

// ------------------------------------------------------------------ review

function thumbnailDataUri_(fileId) {
  if (!fileId) return '';
  try {
    var blob = DriveApp.getFileById(fileId).getThumbnail();
    if (!blob) return '';
    return 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (err) {
    return '';
  }
}

/** POST admin.queue { eventId, status?=pending, day?, page? } with photo thumbnails for the reviewer. */
function apiAdminQueue_(p, user) {
  requireRole_(user, 'reviewer');
  var ev = eventById_(p.eventId);
  var status = ['pending', 'approved', 'rejected'].indexOf(p.status) !== -1 ? p.status : 'pending';
  var day = p.day ? Math.floor(num_(p.day, 0)) : 0;
  var tasks = {};
  tasksOf_(ev.id, true).forEach(function (t) { tasks[t.id] = t; });
  var list = readRows_(TABS.SUBMISSIONS).filter(function (r) {
    return plain_(r['Event ID']) === ev.id && plain_(r['Status']) === status && (!day || num_(r['Day'], 0) === day);
  });
  if (status !== 'pending') list.reverse(); // pending: oldest first, so nobody waits longest
  var pageSize = 12;
  var page = Math.max(1, Math.floor(num_(p.page, 1)));
  var slice = list.slice((page - 1) * pageSize, page * pageSize);
  return {
    total: list.length,
    page: page,
    pages: Math.max(1, Math.ceil(list.length / pageSize)),
    rows: slice.map(function (r) {
      var t = tasks[plain_(r['Task ID'])] || {};
      return {
        id: plain_(r['Submission ID']),
        submittedAt: iso_(r['Submitted at']),
        day: num_(r['Day'], 0),
        taskTitle: t.title || '',
        qualityMax: t.qualityMax || 0,
        points: t.points || 0,
        name: plain_(r['Name']),
        college: plain_(r['College']),
        text: plain_(r['Text']),
        link: plain_(r['Link']),
        linkType: plain_(r['Link type']),
        fileUrl: plain_(r['File']),
        thumbnail: thumbnailDataUri_(plain_(r['Drive file ID'])),
        status: plain_(r['Status']),
        quality: r['Quality'] === '' ? null : num_(r['Quality'], 0),
        reason: plain_(r['Reason']),
        attempt: num_(r['Attempt'], 1),
      };
    }),
  };
}

/** POST admin.review { submissionId, decision: approved|rejected|pending, quality?, reason? } */
function apiAdminReview_(p, user) {
  requireRole_(user, 'reviewer');
  return reviewSubmission_(String(p.submissionId || ''), String(p.decision || ''), p.quality, p.reason, actorOf_(user));
}

/** POST admin.review.bulk { submissionIds: [...], quality? } approves several at once. */
function apiAdminReviewBulk_(p, user) {
  requireRole_(user, 'reviewer');
  var ids = Array.isArray(p.submissionIds) ? p.submissionIds.slice(0, 50) : [];
  if (!ids.length) throw httpError_(400, 'Select at least one submission.');
  var done = [], failed = [];
  ids.forEach(function (id) {
    try { done.push(reviewSubmission_(String(id), 'approved', p.quality, '', actorOf_(user))); }
    catch (err) { failed.push({ id: String(id), message: err.message }); }
  });
  return { approved: done.length, failed: failed };
}

// ------------------------------------------------------------------ points, leaderboard, certificates

/** POST admin.points.adjust { eventId, userId, points, reason } */
function apiAdminPointsAdjust_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  return adjustPoints_(ev.id, String(p.userId || ''), p.points, p.reason, actorOf_(user));
}

/** POST admin.ledger { eventId, userId } -> that person's point history in the event */
function apiAdminLedger_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  var rows = ledgerOf_(ev.id, String(p.userId || ''));
  return {
    total: pointsBreakdown_(rows).total,
    rows: rows.reverse().map(function (r) {
      return { at: iso_(r['Created at']), source: plain_(r['Source']), points: num_(r['Points'], 0), day: r['Day'], reason: plain_(r['Reason']), by: plain_(r['By']) };
    }),
  };
}

function apiAdminLeaderboardRebuild_(p, user) {
  requireRole_(user, 'admin');
  var n = rebuildLeaderboards();
  audit_(actorOf_(user), 'leaderboard.rebuild', 'leaderboard', '', null, { scopes: n });
  return { scopes: n };
}

/** POST admin.certificates.issue { eventId } (run again until remaining is 0) */
function apiAdminCertificatesIssue_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  if (!ev.certificatesEnabled) throw httpError_(409, 'Turn on "Certificates enabled" for this event first.');
  var out = issueCertificatesForEvent_(ev, actorOf_(user));
  audit_(actorOf_(user), 'certificates.issue', 'event', ev.id, null, out);
  return out;
}

/** POST admin.certificate.revoke { certificateId, reason } */
function apiAdminCertificateRevoke_(p, user) {
  requireRole_(user, 'admin');
  var why = str_(p.reason, 'Reason', 3, CONFIG.REASON_MAX);
  return withLock_(function () {
    var r = rowWhere_(TABS.CERTIFICATES, 'Certificate ID', String(p.certificateId || '').toUpperCase());
    if (!r) throw httpError_(404, 'No certificate has this ID.');
    updateCells_(TABS.CERTIFICATES, r._row, { 'Revoked': true, 'Revoked reason': why });
    audit_(actorOf_(user), 'certificate.revoke', 'certificate', plain_(r['Certificate ID']), null, null, why);
    return { certificateId: plain_(r['Certificate ID']), revoked: true };
  });
}

function apiAdminAudit_(p, user) {
  requireRole_(user, 'admin');
  var rows = readRows_(TABS.AUDIT).reverse().slice(0, 200);
  return rows.map(function (r) {
    return { at: iso_(r['At']), by: plain_(r['By']), action: plain_(r['Action']), entity: plain_(r['Entity']), entityId: plain_(r['Entity ID']), note: plain_(r['Note']) };
  });
}

// ------------------------------------------------------------------ analytics

/** POST admin.analytics { eventId } */
function apiAdminAnalytics_(p, user) {
  requireRole_(user, 'admin');
  var ev = eventById_(p.eventId);
  var tasks = tasksOf_(ev.id);
  var regs = readRows_(TABS.REGISTRATIONS).filter(function (r) { return plain_(r['Event ID']) === ev.id && plain_(r['Status']) === 'registered'; });
  var subs = readRows_(TABS.SUBMISSIONS).filter(function (r) { return plain_(r['Event ID']) === ev.id && plain_(r['Status']) !== 'superseded'; });

  var daily = {};
  regs.forEach(function (r) { var d = istDate_(r['Registered at']); daily[d] = (daily[d] || 0) + 1; });

  var active = {};
  var approvedByUser = {};
  var counts = { pending: 0, approved: 0, rejected: 0 };
  var byDay = {};
  tasks.forEach(function (t) { byDay[t.day] = { day: t.day, title: t.title, submitted: 0, approved: 0, rejected: 0, pending: 0 }; });
  subs.forEach(function (r) {
    var uid = plain_(r['User ID']);
    var st = plain_(r['Status']);
    active[uid] = true;
    if (counts[st] !== undefined) counts[st]++;
    var d = byDay[num_(r['Day'], 0)];
    if (d) { d.submitted++; if (d[st] !== undefined) d[st]++; }
    if (st === 'approved') approvedByUser[uid] = (approvedByUser[uid] || 0) + 1;
  });

  var rule = parseCertificateRule_(ev.certificateRule);
  var need = rule.allTasks ? tasks.length : rule.minApprovedTasks;
  var completed = Object.keys(approvedByUser).filter(function (u) { return approvedByUser[u] >= need; }).length;
  var allDone = Object.keys(approvedByUser).filter(function (u) { return approvedByUser[u] >= tasks.length; }).length;

  var colleges = {};
  regs.forEach(function (r) {
    var c = plain_(r['College']).trim() || 'Not given';
    var key = c.toLowerCase();
    if (!colleges[key]) colleges[key] = { college: c, registrations: 0, active: 0 };
    colleges[key].registrations++;
    if (active[plain_(r['User ID'])]) colleges[key].active++;
  });

  var refs = {};
  var nameOf = {};
  regs.forEach(function (r) { nameOf[plain_(r['User ID'])] = displayName_(r['Name']); });
  regs.forEach(function (r) {
    var by = plain_(r['Referred by user ID']);
    if (!by) return;
    if (!refs[by]) refs[by] = { referrer: nameOf[by] || 'Unknown', code: plain_(r['Referred by code']), registrations: 0, active: 0 };
    refs[by].registrations++;
    if (active[plain_(r['User ID'])]) refs[by].active++;
  });

  var reviewed = counts.approved + counts.rejected;
  return {
    event: { id: ev.id, title: ev.title, status: phase_(ev, new Date()) },
    totals: {
      registrations: regs.length,
      activeParticipants: Object.keys(active).length,
      submissions: subs.length,
      pending: counts.pending,
      approved: counts.approved,
      rejected: counts.rejected,
      approvalRate: reviewed ? Math.round((counts.approved / reviewed) * 1000) / 10 : null,
      completionRate: regs.length ? Math.round((completed / regs.length) * 1000) / 10 : null,
      completedAllTasks: allDone,
      metCertificateRule: completed,
      referredRegistrations: regs.filter(function (r) { return plain_(r['Referred by user ID']); }).length,
    },
    dailyRegistrations: Object.keys(daily).sort().map(function (d) { return { date: d, count: daily[d] }; }),
    taskCompletion: Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.day - b.day; }),
    colleges: Object.keys(colleges).map(function (k) { return colleges[k]; }).sort(function (a, b) { return b.registrations - a.registrations; }).slice(0, 25),
    referrals: Object.keys(refs).map(function (k) { return refs[k]; }).sort(function (a, b) { return b.registrations - a.registrations; }).slice(0, 25),
  };
}
