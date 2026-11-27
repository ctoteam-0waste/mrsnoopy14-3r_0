/**
 * Task submissions: text, one photo, and/or a link (video or social post).
 * Photos arrive base64 in the request (the website shrinks them to about 0.5 MB
 * first). The script checks the real bytes (JPEG, PNG or WEBP signature and size),
 * stores the file privately in Drive and names it after the uploader.
 * Uploading never earns points: points come only from an approval.
 */

function submissionsFolder_() {
  var id = prop_('SUBMISSIONS_FOLDER_ID', '');
  if (!id) throw httpError_(503, 'Uploads are not set up yet. Run setupEventHub.');
  return DriveApp.getFolderById(id);
}

/** Detects the image type from its first bytes. Never trusts the declared type. */
function sniffImage_(bytes) {
  var b = function (i) { return bytes[i] & 0xff; };
  if (bytes.length > 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (bytes.length > 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return { mime: 'image/png', ext: 'png' };
  if (bytes.length > 12 && b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
      b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

/** Decodes and validates a base64 image. Returns { bytes, kind } or throws a 400. */
function decodeImage_(dataBase64, maxBytes) {
  var b64 = String(dataBase64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!b64) throw httpError_(400, 'The photo is empty.');
  if (Math.floor((b64.length * 3) / 4) > maxBytes + 4) throw httpError_(400, 'Photos must be ' + maxBytes / MB + ' MB or smaller.');
  var bytes;
  try { bytes = Utilities.base64Decode(b64); } catch (err) { throw httpError_(400, 'The photo could not be read.'); }
  if (!bytes.length) throw httpError_(400, 'The photo is empty.');
  if (bytes.length > maxBytes) throw httpError_(400, 'Photos must be ' + maxBytes / MB + ' MB or smaller.');
  var kind = sniffImage_(bytes);
  if (!kind) throw httpError_(400, 'Only JPG, PNG or WEBP photos are allowed.');
  return { bytes: bytes, kind: kind };
}

/** https links only. Returns { url, type } where type is video | social | other. */
function cleanLink_(v) {
  var s = String(v || '').trim();
  if (!s) return null;
  if (s.length > CONFIG.LINK_MAX) throw httpError_(400, 'The link is too long.');
  var m = s.match(/^https:\/\/([^\/?#\s]+)[^\s]*$/i);
  if (!m) throw httpError_(400, 'Links must start with https://');
  var host = m[1].toLowerCase().replace(/^www\.|^m\./, '');
  var type = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host) ? 'video'
    : /(^|\.)(instagram\.com|facebook\.com|fb\.watch|linkedin\.com|x\.com|twitter\.com|threads\.net|snapchat\.com|moj\.app|sharechat\.com|josh\.app)$/.test(host) ? 'social'
    : 'other';
  return { url: s, type: type };
}

function findTask_(ev, taskId) {
  var task = tasksOf_(ev.id).filter(function (t) { return t.id === String(taskId || ''); })[0];
  if (!task) throw httpError_(404, 'We could not find that task.');
  return task;
}

/**
 * POST submission.create { slug, taskId, text?, link?, imageBase64? }
 * A task has one active submission per person. After a rejection, a new one may
 * replace it (if the task allows resubmission); the old row is kept as "superseded".
 */
function apiSubmit_(p, user) {
  var ev = eventBySlug_(p.slug);
  var task = findTask_(ev, p.taskId);
  var now = new Date();
  var state = taskState_(task, ev, now);
  if (state === 'locked') throw httpError_(409, 'This task opens on ' + formatDay_(taskWindow_(task, ev).opensAt) + '.');
  if (state === 'closed') throw httpError_(409, 'This task has closed.');

  var text = typeof p.text === 'string' ? p.text.trim() : '';
  if (text.length > CONFIG.TEXT_MAX) throw httpError_(400, 'Your text must be ' + CONFIG.TEXT_MAX + ' characters or fewer.');
  var link = cleanLink_(p.link);
  var hasImage = !!p.imageBase64;

  if (text && task.accepts.indexOf('text') === -1) text = text.slice(0, 500); // a short caption is always fine
  if (link && task.accepts.indexOf('link') === -1) throw httpError_(400, 'This task does not take links.');
  if (hasImage && task.accepts.indexOf('image') === -1) throw httpError_(400, 'This task does not take photos.');
  var proofTypes = task.accepts.filter(function (a) { return a !== 'text'; });
  if (proofTypes.length) {
    if (!link && !hasImage) {
      throw httpError_(400, proofTypes.length === 2 ? 'Add a photo or a link as proof.' : proofTypes[0] === 'image' ? 'Add a photo as proof.' : 'Add a link as proof.');
    }
  } else if (text.length < CONFIG.TEXT_ONLY_MIN) {
    throw httpError_(400, 'Please write at least ' + CONFIG.TEXT_ONLY_MIN + ' characters.');
  }

  // Cheap checks before touching Drive.
  var reg = requireRegistration_(ev, user);
  var prior = mySubmissionsByTask_(ev.id, user.id)[task.id];
  assertCanSubmit_(prior, task);

  var image = hasImage ? decodeImage_(p.imageBase64, CONFIG.IMAGE_MAX_BYTES) : null;
  var file = null;
  if (image) {
    file = submissionsFolder_().createFile(
      Utilities.newBlob(image.bytes, image.kind.mime, user.id + '_' + task.id + '_' + uuid_() + '.' + image.kind.ext)
    );
  }

  var result;
  try {
    result = withLock_(function () {
      // Re-check under the lock: two quick taps must not create two submissions.
      var current = mySubmissionsByTask_(ev.id, user.id)[task.id];
      assertCanSubmit_(current, task);
      if (current) updateCells_(TABS.SUBMISSIONS, current._row, { 'Status': 'superseded' });
      var row = {
        'Submitted at': now,
        'Submission ID': shortId_('S-', 12),
        'Event ID': ev.id,
        'Task ID': task.id,
        'Day': task.day,
        'User ID': user.id,
        'Name': plain_(reg['Name']),
        'College': plain_(reg['College']),
        'Text': text,
        'Link': link ? link.url : '',
        'Link type': link ? link.type : '',
        'File': file ? 'https://drive.google.com/file/d/' + file.getId() + '/view' : '',
        'Drive file ID': file ? file.getId() : '',
        'Status': task.autoApprove ? 'approved' : 'pending',
        'Quality': '',
        'Points': 0,
        'Reason': '',
        'Reviewed by': task.autoApprove ? 'auto' : '',
        'Reviewed at': task.autoApprove ? now : '',
        'Attempt': current ? num_(current['Attempt'], 1) + 1 : 1,
      };
      appendRow_(TABS.SUBMISSIONS, row);
      if (task.autoApprove) {
        var saved = rowWhere_(TABS.SUBMISSIONS, 'Submission ID', row['Submission ID']);
        syncSubmissionPoints_(saved, task, 'auto', 'Auto-approved');
        row['Points'] = task.points;
      }
      return mySubmissionView_(row);
    });
  } catch (err) {
    if (file) file.setTrashed(true);
    throw err;
  }

  var out = { submission: result };
  if (task.bonusRule === 'karmaverse_pickup' && ev.pickupBonus > 0) {
    try { out.pickupBonus = verifyPickup_(ev, user); } catch (err) { console.error('Pickup check failed: ' + err); }
  }
  return out;
}

function assertCanSubmit_(prior, task) {
  if (!prior) return;
  var status = plain_(prior['Status']);
  if (status === 'pending') throw httpError_(409, 'You have already submitted this task. It is waiting for review.');
  if (status === 'approved') throw httpError_(409, 'You have already completed this task.');
  if (status === 'rejected' && !task.allowResubmit) throw httpError_(409, 'This task does not allow resubmission.');
}

/** POST submission.status { slug } -> my submissions for the event, newest first (including replaced ones). */
function apiSubmissionStatus_(p, user) {
  var ev = eventBySlug_(p.slug);
  var tasks = {};
  tasksOf_(ev.id, true).forEach(function (t) { tasks[t.id] = t; });
  return rowsWhere_(TABS.SUBMISSIONS, 'User ID', user.id)
    .filter(function (r) { return plain_(r['Event ID']) === ev.id; })
    .reverse()
    .map(function (r) {
      var v = mySubmissionView_(r);
      var t = tasks[plain_(r['Task ID'])];
      v.day = num_(r['Day'], 0);
      v.taskTitle = t ? t.title : '';
      return v;
    });
}

// ------------------------------------------------------------------ pickup bonus

/** The bookings list has come back in several shapes from the backend; find the array. */
function extractList_(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  var keys = ['data', 'bookings', 'docs', 'items', 'results'];
  for (var i = 0; i < keys.length; i++) {
    var v = json[keys[i]];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      var inner = extractList_(v);
      if (inner.length) return inner;
    }
  }
  return [];
}

/**
 * Verified KarmaVerse activity: a pickup with status COMPLETED, dated within the
 * event, found in the participant's own bookings (read with their login token).
 * Awarded once per event. Never based on anything the participant typed.
 */
function verifyPickup_(ev, user) {
  if (!(ev.pickupBonus > 0)) return { verified: false, points: 0, message: 'This event has no pickup bonus.' };
  var refId = 'pickup:' + ev.id + ':' + user.id;
  var already = rowsWhere_(TABS.LEDGER, 'Ref ID', refId).length > 0;
  if (already) return { verified: true, points: ev.pickupBonus, already: true };
  if (!user.token) throw httpError_(401, 'Please log in again.');

  var res = UrlFetchApp.fetch(apiBase_() + '/api/v1/bookings/my-bookings', {
    method: 'get',
    headers: { Authorization: 'Bearer ' + user.token },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() === 401) throw httpError_(401, 'Your session has expired. Please log in again.');
  if (res.getResponseCode() !== 200) throw httpError_(503, 'Could not check your pickups right now. Please try again later.');
  var start = new Date(ev.startAt).getTime();
  var end = new Date(ev.endAt).getTime();
  var match = extractList_(JSON.parse(res.getContentText() || '{}')).filter(function (b) {
    if (String(b && b.status || '').toUpperCase() !== 'COMPLETED') return false;
    var when = toDate_(b.completedAt || b.pickedUpAt || b.updatedAt || b.pickupDate || b.scheduledDate);
    return when && when.getTime() >= start && when.getTime() <= end;
  })[0];
  if (!match) {
    return { verified: false, points: 0, message: 'We could not find a completed KarmaVerse pickup during this event yet. Once your pickup is completed, check again.' };
  }

  return withLock_(function () {
    if (rowsWhere_(TABS.LEDGER, 'Ref ID', refId).length) return { verified: true, points: ev.pickupBonus, already: true };
    addLedger_({
      eventId: ev.id, userId: user.id, day: '', source: 'bonus', refId: refId, points: ev.pickupBonus,
      earnedAt: toDate_(match.completedAt || match.updatedAt || match.pickupDate) || new Date(),
      reason: 'Verified KarmaVerse pickup ' + String(match._id || match.id || '').slice(0, 40), by: 'auto',
    });
    return { verified: true, points: ev.pickupBonus };
  });
}

/** POST pickup.verify { slug } */
function apiPickupVerify_(p, user) {
  var ev = eventBySlug_(p.slug);
  requireRegistration_(ev, user);
  if (phase_(ev, new Date()) === 'upcoming') throw httpError_(409, 'This event has not started yet.');
  return verifyPickup_(ev, user);
}

function formatDay_(d) {
  return Utilities.formatDate(toDate_(d), CONFIG.TIME_ZONE, 'd MMM yyyy, h:mm a');
}
