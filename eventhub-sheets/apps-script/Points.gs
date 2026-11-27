/**
 * Points live only in the PointsLedger tab. Every change is a new row (nothing is
 * edited in place), so the history of every point is visible and auditable.
 *
 * A submission's points are always recalculated on the server from its status and
 * quality score: approved = task points + quality (capped at the task's max);
 * anything else = 0. The ledger gets whatever difference is needed to reach that,
 * so approving, rejecting or re-scoring any number of times stays correct.
 */

function addLedger_(e) {
  appendRow_(TABS.LEDGER, {
    'Created at': new Date(),
    'Txn ID': shortId_('P-', 12),
    'Event ID': e.eventId,
    'User ID': e.userId,
    'Day': e.day === undefined ? '' : e.day,
    'Source': e.source,
    'Ref ID': e.refId || '',
    'Points': e.points,
    'Earned at': e.earnedAt || new Date(),
    'Reason': e.reason || '',
    'By': e.by || 'system',
  });
  CacheService.getScriptCache().put('lb:dirty', '1', 3600);
}

function targetPoints_(status, quality, task) {
  if (status !== 'approved') return { task: 0, quality: 0 };
  var q = Math.max(0, Math.min(task.qualityMax, Math.round(num_(quality, 0))));
  return { task: task.points, quality: q };
}

/** Brings the ledger in line with the submission's current status and quality. Run under the lock. */
function syncSubmissionPoints_(sub, task, by, reason) {
  var subId = plain_(sub['Submission ID']);
  var status = plain_(sub['Status']);
  var target = targetPoints_(status, sub['Quality'], task);
  var current = { task: 0, quality: 0 };
  rowsWhere_(TABS.LEDGER, 'Ref ID', subId).forEach(function (r) {
    var src = plain_(r['Source']);
    if (src === 'task' || src === 'quality') current[src] += num_(r['Points'], 0);
  });
  ['task', 'quality'].forEach(function (src) {
    var delta = target[src] - current[src];
    if (!delta) return;
    addLedger_({
      eventId: plain_(sub['Event ID']), userId: plain_(sub['User ID']), day: num_(sub['Day'], ''),
      source: src, refId: subId, points: delta, earnedAt: toDate_(sub['Submitted at']) || new Date(),
      reason: (reason || status) + (src === 'quality' ? ' (quality)' : ''), by: by,
    });
  });
  updateCells_(TABS.SUBMISSIONS, sub._row, { 'Points': target.task + target.quality });
  return target.task + target.quality;
}

function taskById_(taskId) {
  var t = allTasks_().filter(function (x) { return x.id === taskId; })[0];
  if (!t) throw httpError_(404, 'The task for this submission no longer exists.');
  return t;
}

/**
 * Approve or reject one submission. decision: approved | rejected | pending.
 * A rejection needs a reason, which the participant sees.
 */
function reviewSubmission_(subId, decision, quality, reason, by) {
  if (['approved', 'rejected', 'pending'].indexOf(decision) === -1) throw httpError_(400, 'Choose approve or reject.');
  var cleanReason = String(reason || '').trim().slice(0, CONFIG.REASON_MAX);
  if (decision === 'rejected' && !cleanReason) throw httpError_(400, 'Give a reason for the rejection. The participant will see it.');
  var mailTo = null;
  var out = withLock_(function () {
    var sub = rowWhere_(TABS.SUBMISSIONS, 'Submission ID', subId);
    if (!sub) throw httpError_(404, 'We could not find that submission.');
    if (plain_(sub['Status']) === 'superseded') throw httpError_(409, 'This submission was replaced by a newer one.');
    var task = taskById_(plain_(sub['Task ID']));
    var before = { status: plain_(sub['Status']), quality: sub['Quality'], reason: plain_(sub['Reason']), points: num_(sub['Points'], 0) };
    var q = decision === 'approved' ? Math.max(0, Math.min(task.qualityMax, Math.round(num_(quality, 0)))) : '';
    var changes = {
      'Status': decision,
      'Quality': q,
      'Reason': decision === 'rejected' ? cleanReason : '',
      'Reviewed by': by,
      'Reviewed at': new Date(),
    };
    updateCells_(TABS.SUBMISSIONS, sub._row, changes);
    Object.keys(changes).forEach(function (k) { sub[k] = changes[k]; });
    var points = syncSubmissionPoints_(sub, task, by, decision === 'approved' ? 'Approved' : decision === 'rejected' ? 'Rejected' : 'Reopened');
    audit_(by, 'submission.review', 'submission', subId, before, { status: decision, quality: q, reason: changes['Reason'], points: points });
    if (decision === 'rejected' && before.status !== 'rejected') {
      mailTo = { userId: plain_(sub['User ID']), eventId: plain_(sub['Event ID']), task: task, reason: cleanReason };
    }
    return { id: subId, status: decision, quality: q, points: points };
  });
  if (mailTo) {
    try { sendRejectionEmail_(mailTo); } catch (err) { console.error('Rejection email failed: ' + err); }
  }
  return out;
}

/** Manual award or deduction, e.g. for a judged competition or a correction. Always audited. */
function adjustPoints_(eventId, userId, points, reason, by) {
  var pts = Math.round(Number(points));
  if (!pts || isNaN(pts) || Math.abs(pts) > CONFIG.ADJUST_MAX) throw httpError_(400, 'Points must be a whole number between -' + CONFIG.ADJUST_MAX + ' and ' + CONFIG.ADJUST_MAX + ', not 0.');
  var why = str_(reason, 'Reason', 3, CONFIG.REASON_MAX);
  return withLock_(function () {
    var reg = registrationOf_(eventId, userId);
    if (!reg) throw httpError_(404, 'That person is not registered for this event.');
    addLedger_({ eventId: eventId, userId: userId, day: '', source: 'adjust', refId: 'adjust:' + uuid_(), points: pts, earnedAt: new Date(), reason: why, by: by });
    audit_(by, 'points.adjust', 'registration', plain_(reg['Registration ID']), null, { userId: userId, points: pts }, why);
    return { userId: userId, points: pts, total: pointsBreakdown_(ledgerOf_(eventId, userId)).total };
  });
}

// ------------------------------------------------------- review in the sheet

/**
 * Installable onEdit trigger (created by setupEventHub). Lets the team review in
 * the spreadsheet itself:
 *  - Submissions: changing Status or Quality recalculates that row's points through
 *    the ledger, stamps the reviewer and time, and is audited. A rejection without a
 *    reason is held as "pending" until a reason is typed.
 *  - Events, Tasks, Settings, Categories: edits are audited and caches cleared so
 *    the website shows them within seconds.
 *  - PointsLedger: direct edits are audited (use admin adjustments instead).
 */
function onSheetEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  var name = sh.getName();
  var by = editorEmail_(e);

  if ([TABS.EVENTS.name, TABS.TASKS.name, TABS.SETTINGS.name, TABS.CATEGORIES.name, TABS.ADMINS.name, TABS.LEDGER.name].indexOf(name) !== -1) {
    clearCaches();
    audit_(by, 'sheet.edit', name, 'R' + e.range.getRow() + 'C' + e.range.getColumn(),
      e.oldValue === undefined ? null : e.oldValue, e.value === undefined ? null : e.value,
      e.range.getNumRows() * e.range.getNumColumns() > 1 ? 'multi-cell edit' : '');
    return;
  }
  if (name !== TABS.SUBMISSIONS.name) return;

  var hdr = headers_(TABS.SUBMISSIONS);
  var watch = ['Status', 'Quality', 'Reason'].map(function (h) { return hdr.indexOf(h) + 1; });
  var c1 = e.range.getColumn();
  var c2 = c1 + e.range.getNumColumns() - 1;
  if (!watch.some(function (c) { return c >= c1 && c <= c2; })) return;

  withLock_(function () {
    for (var row = Math.max(2, e.range.getRow()); row < e.range.getRow() + e.range.getNumRows(); row++) {
      var vals = sh.getRange(row, 1, 1, hdr.length).getValues()[0];
      var sub = rowObject_(hdr, vals, row);
      if (!plain_(sub['Submission ID'])) continue;
      var status = plain_(sub['Status']).trim().toLowerCase();
      if (CONFIG.SUBMISSION_STATUSES.indexOf(status) === -1 || status === 'superseded') {
        // Unknown value (or someone typed "superseded"): undo to pending, award nothing.
        status = 'pending';
      }
      if (status === 'rejected' && !plain_(sub['Reason']).trim()) status = 'pending';
      var task;
      try { task = taskById_(plain_(sub['Task ID'])); } catch (err) { continue; }
      var before = num_(sub['Points'], 0);
      var wasRejected = String(e.oldValue || '').toLowerCase() === 'rejected';
      sub['Status'] = status;
      var changes = { 'Status': status, 'Reviewed by': by, 'Reviewed at': new Date() };
      if (status === 'approved') {
        changes['Quality'] = Math.max(0, Math.min(task.qualityMax, Math.round(num_(sub['Quality'], 0))));
        sub['Quality'] = changes['Quality'];
      }
      updateCells_(TABS.SUBMISSIONS, row, changes);
      var points = syncSubmissionPoints_(sub, task, by, 'Reviewed in sheet');
      audit_(by, 'submission.review.sheet', 'submission', plain_(sub['Submission ID']), { points: before },
        { status: status, quality: sub['Quality'], points: points });
      if (status === 'rejected' && !wasRejected) {
        try {
          sendRejectionEmail_({ userId: plain_(sub['User ID']), eventId: plain_(sub['Event ID']), task: task, reason: plain_(sub['Reason']) });
        } catch (err) { console.error('Rejection email failed: ' + err); }
      }
    }
  });
}

function editorEmail_(e) {
  try {
    if (e && e.user && e.user.getEmail && e.user.getEmail()) return e.user.getEmail();
  } catch (err) { /* not available */ }
  try {
    var em = Session.getActiveUser().getEmail();
    if (em) return em;
  } catch (err2) { /* not available */ }
  return 'sheet';
}
