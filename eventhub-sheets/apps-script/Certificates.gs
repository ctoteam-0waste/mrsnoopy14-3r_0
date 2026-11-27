/**
 * Certificates. The team controls them per event:
 *  - "Certificates enabled" on the Events tab turns downloads on (usually after the event ends);
 *  - "Certificate rule" sets who qualifies, e.g. "minApprovedTasks=5" or
 *    "minApprovedTasks=5; minPoints=60" or "allTasks";
 *  - "Certificate override" on a registration forces "eligible" or "blocked" for one person.
 * One certificate per person per event, enforced under the lock. The PDF is made
 * from HTML in Apps Script, carries a QR code and a public verification link.
 */

function certificatesFolder_() {
  var id = prop_('CERTIFICATES_FOLDER_ID', '');
  if (!id) throw httpError_(503, 'Certificates are not set up yet. Run setupEventHub.');
  return DriveApp.getFolderById(id);
}

function verifyUrl_(certId) {
  return siteUrl_() + '/verify/' + encodeURIComponent(certId);
}

function parseCertificateRule_(rule) {
  var out = { minApprovedTasks: 1, minPoints: 0, allTasks: false };
  String(rule || '').split(/[;,]/).forEach(function (part) {
    var t = part.trim();
    if (!t) return;
    if (/^allTasks$/i.test(t)) { out.allTasks = true; return; }
    var m = t.match(/^(minApprovedTasks|minPoints)\s*[=:]\s*(\d+)$/i);
    if (m) out[m[1].toLowerCase() === 'minpoints' ? 'minPoints' : 'minApprovedTasks'] = Number(m[2]);
  });
  return out;
}

function certificateEligibility_(ev, reg, approvedTasks, totalTasks, points) {
  var rule = parseCertificateRule_(ev.certificateRule);
  var need = rule.allTasks ? totalTasks : rule.minApprovedTasks;
  var requirement = 'Complete ' + (rule.allTasks ? 'all ' + totalTasks : need + ' of ' + totalTasks) + ' tasks' +
    (rule.minPoints ? ' and earn at least ' + rule.minPoints + ' points' : '');
  var override = reg ? plain_(reg['Certificate override']).trim().toLowerCase() : '';
  if (!reg || plain_(reg['Status']) !== 'registered' || override === 'blocked') return { eligible: false, requirement: requirement };
  if (override === 'eligible') return { eligible: true, requirement: requirement };
  return { eligible: approvedTasks >= need && points >= rule.minPoints, requirement: requirement };
}

function completionLabel_(approved, total) {
  return approved >= total ? 'Completed all ' + total + ' tasks' : 'Completed ' + approved + ' of ' + total + ' tasks';
}

/** Facts for one person's certificate, recalculated from the sheet. */
function certificateFacts_(ev, userId) {
  var reg = registrationOf_(ev.id, userId);
  var tasks = tasksOf_(ev.id);
  var subs = mySubmissionsByTask_(ev.id, userId);
  var approved = tasks.filter(function (t) { return subs[t.id] && plain_(subs[t.id]['Status']) === 'approved'; }).length;
  var points = pointsBreakdown_(ledgerOf_(ev.id, userId)).total;
  var elig = certificateEligibility_(ev, reg, approved, tasks.length, points);
  return { reg: reg, approved: approved, total: tasks.length, points: points, eligible: elig.eligible, requirement: elig.requirement };
}

/** Creates the certificate row once (under the lock), then makes the PDF if it is missing. */
function issueCertificate_(ev, userId, by) {
  var facts = certificateFacts_(ev, userId);
  if (!facts.eligible) throw httpError_(403, 'Not eligible for a certificate yet. ' + facts.requirement + '.');
  var cert = withLock_(function () {
    var existing = certificateOf_(ev.id, userId);
    if (existing) return existing;
    var row = {
      'Issued at': new Date(),
      'Certificate ID': shortId_('KV-', 10),
      'Event ID': ev.id,
      'User ID': userId,
      'Name': plain_(facts.reg['Name']),
      'Event title': ev.title,
      'Completion': completionLabel_(facts.approved, facts.total),
      'Points': facts.points,
      'Drive file ID': '',
      'Revoked': false,
      'Revoked reason': '',
    };
    appendRow_(TABS.CERTIFICATES, row);
    audit_(by || 'system', 'certificate.issue', 'certificate', row['Certificate ID'], null, { userId: userId, eventId: ev.id });
    return rowWhere_(TABS.CERTIFICATES, 'Certificate ID', row['Certificate ID']);
  });
  var fileId = plain_(cert['Drive file ID']);
  var file = null;
  if (fileId) {
    try { file = DriveApp.getFileById(fileId); } catch (err) { file = null; }
  }
  if (!file) {
    file = certificatesFolder_().createFile(renderCertificatePdf_(cert));
    updateCells_(TABS.CERTIFICATES, cert._row, { 'Drive file ID': file.getId() });
  }
  return { cert: cert, file: file };
}

/** POST certificate.download { slug } -> { certificateId, verifyUrl, fileName, pdfBase64 } */
function apiCertificateDownload_(p, user) {
  var ev = eventBySlug_(p.slug);
  if (!ev.certificatesEnabled) throw httpError_(409, 'Certificates for this event are not available yet.');
  requireRegistration_(ev, user);
  var out = issueCertificate_(ev, user.id, actorOf_(user));
  var id = plain_(out.cert['Certificate ID']);
  return {
    certificateId: id,
    verifyUrl: verifyUrl_(id),
    fileName: 'KarmaVerse-' + ev.slug + '-certificate-' + id + '.pdf',
    pdfBase64: Utilities.base64Encode(out.file.getBlob().getBytes()),
  };
}

/** GET certificate.verify ?id=KV-XXXXXXXXXX  (public) */
function apiCertificateVerify_(p) {
  var id = String(p.id || '').trim().toUpperCase();
  if (!/^KV-[A-Z0-9]{10}$/.test(id)) throw httpError_(404, 'No certificate has this ID.');
  var r = rowWhere_(TABS.CERTIFICATES, 'Certificate ID', id);
  if (!r) throw httpError_(404, 'No certificate has this ID.');
  var revoked = truthy_(r['Revoked']);
  var ev = allEvents_().filter(function (e) { return e.id === plain_(r['Event ID']); })[0];
  return {
    certificateId: id,
    valid: !revoked,
    revoked: revoked,
    name: plain_(r['Name']),
    eventTitle: plain_(r['Event title']),
    eventSlug: ev && ev.published ? ev.slug : '',
    completion: plain_(r['Completion']),
    issuedAt: iso_(r['Issued at']),
  };
}

// ------------------------------------------------------------------ PDF

function esc_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** QR code as an HTML table (the PDF converter renders tables reliably; no images needed). */
function qrTableHtml_(text, cellPx) {
  var m = qrMatrix_(text);
  var quiet = 2;
  var n = m.length + quiet * 2;
  var html = '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff">';
  for (var r = 0; r < n; r++) {
    html += '<tr>';
    for (var c = 0; c < n; c++) {
      var dark = r >= quiet && c >= quiet && r < n - quiet && c < n - quiet && m[r - quiet][c - quiet];
      html += '<td style="width:' + cellPx + 'px;height:' + cellPx + 'px;padding:0;background:' + (dark ? '#0b3b1f' : '#ffffff') + '"></td>';
    }
    html += '</tr>';
  }
  return html + '</table>';
}

function certificateHtml_(c) {
  var s = getSettings_();
  var url = verifyUrl_(c.id);
  var signer = s.certificateSignerName
    ? '<div style="margin-top:34px;width:220px;border-top:1px solid #9bb5a3;padding-top:6px;font-size:12px;color:#1f3b2a">' +
      esc_(s.certificateSignerName) + (s.certificateSignerTitle ? '<br><span style="color:#5b7363">' + esc_(s.certificateSignerTitle) + '</span>' : '') + '</div>'
    : '';
  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4 landscape;margin:0}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#11201a}' +
    '</style></head><body>' +
    '<div style="margin:28px;border:3px solid #16a34a;padding:6px">' +
    '<div style="border:1px solid #b7dcc2;padding:40px 54px;background:#f7fbf6">' +
    '<div style="font-size:13px;letter-spacing:3px;color:#16a34a;font-weight:bold">' + esc_(s.certificateOrg).toUpperCase() + '</div>' +
    '<div style="font-size:40px;font-weight:bold;margin-top:18px;color:#0b4d26">Certificate of Participation</div>' +
    '<div style="font-size:15px;margin-top:26px;color:#3d5446">This certifies that</div>' +
    '<div style="font-size:34px;font-weight:bold;margin-top:8px;border-bottom:2px solid #16a34a;display:inline-block;padding-bottom:4px">' + esc_(c.name) + '</div>' +
    '<div style="font-size:15px;margin-top:22px;color:#3d5446">took part in</div>' +
    '<div style="font-size:24px;font-weight:bold;margin-top:6px;color:#0b4d26">' + esc_(c.eventTitle) + '</div>' +
    '<div style="font-size:15px;margin-top:10px;color:#3d5446">' + esc_(c.completion) + ' · ' + esc_(c.points) + ' verified points</div>' +
    '<table style="width:100%;margin-top:30px;border-collapse:collapse"><tr>' +
    '<td style="vertical-align:bottom;font-size:12px;color:#3d5446">' +
    'Issued on ' + esc_(c.issuedOn) + '<br>Certificate ID: <b>' + esc_(c.id) + '</b><br>Verify at ' + esc_(url) + signer + '</td>' +
    '<td style="vertical-align:bottom;text-align:right;width:160px">' + qrTableHtml_(url, 3) + '</td>' +
    '</tr></table>' +
    '</div></div></body></html>';
}

function renderCertificatePdf_(row) {
  var c = {
    id: plain_(row['Certificate ID']),
    name: plain_(row['Name']),
    eventTitle: plain_(row['Event title']),
    completion: plain_(row['Completion']),
    points: num_(row['Points'], 0),
    issuedOn: Utilities.formatDate(toDate_(row['Issued at']) || new Date(), CONFIG.TIME_ZONE, 'd MMMM yyyy'),
  };
  var html = certificateHtml_(c);
  return Utilities.newBlob(html, 'text/html', c.id + '.html').getAs('application/pdf').setName('Certificate-' + c.id + '.pdf');
}

/**
 * Admin: issue certificates for everyone eligible in an event, in batches that fit
 * inside Apps Script's time limit. Run again until remaining is 0.
 */
function issueCertificatesForEvent_(ev, by) {
  var started = Date.now();
  var regs = readRows_(TABS.REGISTRATIONS).filter(function (r) { return plain_(r['Event ID']) === ev.id && plain_(r['Status']) === 'registered'; });
  var have = {};
  readRows_(TABS.CERTIFICATES).forEach(function (r) {
    if (plain_(r['Event ID']) === ev.id && plain_(r['Drive file ID'])) have[plain_(r['User ID'])] = true;
  });
  var issued = 0, skipped = 0, remaining = 0;
  regs.forEach(function (r) {
    var uid = plain_(r['User ID']);
    if (have[uid]) return;
    if ((Date.now() - started) / 1000 > CONFIG.CERT_BATCH_SECONDS) { remaining++; return; }
    if (!certificateFacts_(ev, uid).eligible) { skipped++; return; }
    issueCertificate_(ev, uid, by);
    issued++;
  });
  return { issued: issued, notEligible: skipped, remaining: remaining, alreadyIssued: Object.keys(have).length };
}
