/**
 * Emails go out through the Workspace account's own Gmail (MailApp). Google allows
 * roughly 1,500 recipients a day on Workspace. When the daily allowance runs low,
 * emails wait in the MailQueue tab and an hourly trigger sends them later.
 */

function sendMail_(to, subject, html) {
  if (!to) return 'skipped';
  var remaining = 0;
  try { remaining = MailApp.getRemainingDailyQuota(); } catch (err) { remaining = 0; }
  if (remaining > 20) {
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: 'KarmaVerse EventHub' });
    return 'sent';
  }
  appendRow_(TABS.MAIL_QUEUE, { 'Queued at': new Date(), 'To': to, 'Subject': subject, 'Body': html });
  return 'queued';
}

/** Hourly trigger: sends queued emails while the daily allowance lasts. */
function flushMailQueue() {
  var rows = readRows_(TABS.MAIL_QUEUE).filter(function (r) { return !r['Sent at']; });
  var sent = 0;
  for (var i = 0; i < rows.length; i++) {
    if (MailApp.getRemainingDailyQuota() <= 20) break;
    try {
      MailApp.sendEmail({ to: plain_(rows[i]['To']), subject: plain_(rows[i]['Subject']), htmlBody: plain_(rows[i]['Body']), name: 'KarmaVerse EventHub' });
      updateCells_(TABS.MAIL_QUEUE, rows[i]._row, { 'Sent at': new Date(), 'Error': '' });
      sent++;
    } catch (err) {
      updateCells_(TABS.MAIL_QUEUE, rows[i]._row, { 'Error': String(err).slice(0, 300) });
    }
  }
  return sent;
}

function mailLayout_(heading, bodyHtml) {
  var s = getSettings_();
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#11201a">' +
    '<div style="background:#0b4d26;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0;font-weight:bold;font-size:18px">KarmaVerse EventHub</div>' +
    '<div style="border:1px solid #dbe4dc;border-top:0;padding:22px;border-radius:0 0 10px 10px">' +
    '<h2 style="margin:0 0 12px;font-size:20px;color:#0b4d26">' + esc_(heading) + '</h2>' + bodyHtml +
    (s.supportEmail ? '<p style="color:#55665d;font-size:13px;margin-top:22px">Questions? Write to ' + esc_(s.supportEmail) + '.</p>' : '') +
    '</div></div>';
}

function sendRegistrationEmail_(ev, name, email) {
  if (!getSettings_().emailsEnabled) return 'disabled';
  var start = Utilities.formatDate(new Date(ev.startAt), CONFIG.TIME_ZONE, 'd MMM yyyy');
  var end = Utilities.formatDate(new Date(ev.endAt), CONFIG.TIME_ZONE, 'd MMM yyyy');
  var link = siteUrl_() + '/events/' + ev.slug + '/participate';
  var body = '<p>Hi ' + esc_(String(name).split(' ')[0]) + ',</p>' +
    '<p>You are registered for <b>' + esc_(ev.title) + '</b>, which runs from ' + start + ' to ' + end + '.</p>' +
    '<p>Each task opens on its day. Submit your proof on the event page, and we will review it. Points count once a submission is approved.</p>' +
    '<p><a href="' + esc_(link) + '" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Open my challenge</a></p>' +
    '<p style="color:#55665d;font-size:13px">Or copy this link: ' + esc_(link) + '</p>';
  return sendMail_(email, 'You are registered: ' + ev.title, mailLayout_('Registration confirmed', body));
}

function sendRejectionEmail_(info) {
  var s = getSettings_();
  if (!s.emailsEnabled || !s.rejectionEmails) return 'disabled';
  var ev = eventById_(info.eventId);
  var reg = registrationOf_(info.eventId, info.userId);
  if (!reg) return 'skipped';
  var link = siteUrl_() + '/events/' + ev.slug + '/participate';
  var body = '<p>Hi ' + esc_(plain_(reg['Name']).split(' ')[0]) + ',</p>' +
    '<p>Your submission for <b>Day ' + esc_(info.task.day) + ': ' + esc_(info.task.title) + '</b> in ' + esc_(ev.title) + ' was not approved.</p>' +
    '<p style="background:#fef3c7;padding:10px 12px;border-radius:6px"><b>Reason:</b> ' + esc_(info.reason) + '</p>' +
    (info.task.allowResubmit ? '<p>You can fix this and submit again while the task is open.</p>' : '') +
    '<p><a href="' + esc_(link) + '" style="color:#16a34a;font-weight:bold">Open my challenge</a></p>';
  return sendMail_(plain_(reg['Email']), 'Update on your ' + ev.title + ' submission', mailLayout_('Submission needs changes', body));
}
