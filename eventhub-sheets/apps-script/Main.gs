/**
 * Web app entry points. Deploy > New deployment > Web app:
 *   Execute as: Me (the 0waste.co.in account)   Who has access: Anyone
 *
 * Calling convention (the browser can't send custom headers to Apps Script without
 * a CORS preflight it doesn't support):
 *   GET  <webapp>?action=events.list&category=...
 *   POST <webapp>   body (Content-Type: text/plain): {"action":"register","token":"<login token>", ...}
 * Every response is JSON: { ok, status, data } or { ok:false, status, message }.
 * Tokens are accepted only in POST bodies, never in URLs.
 */

/**
 * Built on first use: Apps Script runs files in order, so a table built at load
 * time could reference functions from files that have not loaded yet.
 */
var ROUTES_ = null;
function routes_() {
  if (ROUTES_) return ROUTES_;
  ROUTES_ = {
  // public
  'events.list': { fn: apiEventsList_ },
  'events.get': { fn: apiEventGet_ },
  'leaderboard.get': { fn: apiLeaderboard_ },
  'certificate.verify': { fn: apiCertificateVerify_ },
  // logged in
  'register': { fn: apiRegister_, auth: true, write: true },
  'me.dashboard': { fn: apiMeDashboard_, auth: true },
  'me.event': { fn: apiMeEvent_, auth: true },
  'submission.create': { fn: apiSubmit_, auth: true, write: true },
  'submission.status': { fn: apiSubmissionStatus_, auth: true },
  'pickup.verify': { fn: apiPickupVerify_, auth: true, write: true },
  'certificate.download': { fn: apiCertificateDownload_, auth: true, write: true },
  // admin (role checked inside each action)
  'admin.me': { fn: apiAdminMe_, auth: true },
  'admin.events': { fn: apiAdminEvents_, auth: true },
  'admin.event.get': { fn: apiAdminEventGet_, auth: true },
  'admin.event.save': { fn: apiAdminEventSave_, auth: true, write: true },
  'admin.event.publish': { fn: apiAdminEventPublish_, auth: true, write: true },
  'admin.task.save': { fn: apiAdminTaskSave_, auth: true, write: true },
  'admin.categories.save': { fn: apiAdminCategoriesSave_, auth: true, write: true },
  'admin.banner.upload': { fn: apiAdminBannerUpload_, auth: true, write: true },
  'admin.participants': { fn: apiAdminParticipants_, auth: true },
  'admin.participant.update': { fn: apiAdminParticipantUpdate_, auth: true, write: true },
  'admin.export': { fn: apiAdminExport_, auth: true },
  'admin.queue': { fn: apiAdminQueue_, auth: true },
  'admin.review': { fn: apiAdminReview_, auth: true },
  'admin.review.bulk': { fn: apiAdminReviewBulk_, auth: true },
  'admin.points.adjust': { fn: apiAdminPointsAdjust_, auth: true, write: true },
  'admin.ledger': { fn: apiAdminLedger_, auth: true },
  'admin.leaderboard.rebuild': { fn: apiAdminLeaderboardRebuild_, auth: true, write: true },
  'admin.certificates.issue': { fn: apiAdminCertificatesIssue_, auth: true, write: true },
  'admin.certificate.revoke': { fn: apiAdminCertificateRevoke_, auth: true, write: true },
  'admin.audit': { fn: apiAdminAudit_, auth: true },
  'admin.analytics': { fn: apiAdminAnalytics_, auth: true },
  };
  return ROUTES_;
}

function doGet(e) {
  return respond_(handle_((e && e.parameter) || {}, 'GET'));
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return respond_({ ok: false, status: 400, message: 'Malformed request.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond_({ ok: false, status: 400, message: 'Malformed request.' });
  return respond_(handle_(body, 'POST'));
}

function handle_(p, method) {
  try {
    var route = Object.prototype.hasOwnProperty.call(routes_(), p.action) ? routes_()[p.action] : null;
    if (!route) throw httpError_(404, 'Unknown action.');
    var user = null;
    if (route.auth) {
      if (method !== 'POST') throw httpError_(405, 'Use POST for this action.');
      user = authUser_(p.token);
      user.token = p.token; // kept for this request only (pickup check); never stored
    }
    if (route.write) rateLimit_(user.id);
    return { ok: true, status: 200, data: route.fn(p, user) };
  } catch (err) {
    if (err && err.httpStatus) return { ok: false, status: err.httpStatus, message: err.message };
    console.error((err && err.stack) || err);
    return { ok: false, status: 500, message: 'Something went wrong. Please try again.' };
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Adds an "EventHub" menu to the spreadsheet for the team. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('EventHub')
    .addItem('Refresh leaderboards now', 'rebuildLeaderboards')
    .addItem('Clear caches (after editing tabs)', 'clearCaches')
    .addItem('Send queued emails now', 'flushMailQueue')
    .addSeparator()
    .addItem('Run setup / repair tabs', 'setupEventHub')
    .addToUi();
}
