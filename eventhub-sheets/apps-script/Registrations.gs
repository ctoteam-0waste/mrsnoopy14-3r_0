/** Registration and the participant's own views (My Events, one event's progress). */

function registrationOf_(eventId, userId) {
  return rowsWhere_(TABS.REGISTRATIONS, 'User ID', userId).filter(function (r) {
    return plain_(r['Event ID']) === eventId;
  })[0] || null;
}

function requireRegistration_(ev, user) {
  var reg = registrationOf_(ev.id, user.id);
  if (!reg) throw httpError_(403, 'Register for this event first.');
  if (plain_(reg['Status']) !== 'registered') throw httpError_(403, 'Your registration for this event is not active. Contact the KarmaVerse team.');
  return reg;
}

function normalisePhone_(v) {
  var digits = String(v || '').replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) throw httpError_(400, 'Enter a valid 10-digit Indian mobile number.');
  return '+91' + digits;
}

function publicRegistration_(r) {
  return {
    id: plain_(r['Registration ID']),
    registeredAt: iso_(r['Registered at']),
    name: plain_(r['Name']),
    college: plain_(r['College']),
    city: plain_(r['City']),
    status: plain_(r['Status']),
    referralCode: plain_(r['KarmaVerse referral code']),
  };
}

/**
 * POST register { slug, name, email, phone, college, city, referralCode?, consent, source? }
 * Once per user per event, enforced under the lock. A repeat returns the existing
 * registration with alreadyRegistered: true.
 */
function apiRegister_(p, user) {
  var ev = eventBySlug_(p.slug);
  var name = str_(p.name, 'Name', 2, 80);
  var email = str_(p.email, 'Email', 3, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw httpError_(400, 'Enter a valid email address.');
  var phone = normalisePhone_(p.phone);
  var college = str_(p.college, 'College', 2, 120);
  var city = str_(p.city, 'City', 2, 60);
  var refCode = String(p.referralCode || '').trim().toUpperCase();
  if (refCode && !/^[A-Z0-9]{4,20}$/.test(refCode)) throw httpError_(400, 'Referral codes use only letters and numbers.');
  if (p.consent !== true) throw httpError_(400, 'Please agree to the event terms and to us contacting you about this event.');
  var source = String(p.source || '').replace(/[^\w.\-:]/g, '').slice(0, 60);

  var out = withLock_(function () {
    var existing = registrationOf_(ev.id, user.id);
    if (existing) return { alreadyRegistered: true, registration: publicRegistration_(existing) };

    var count = registrationCounts_()[ev.id] || 0;
    var state = registrationState_(ev, count, new Date());
    if (state === 'not_yet') throw httpError_(409, 'Registration has not opened yet.');
    if (state === 'closed') throw httpError_(409, 'Registration for this event has closed.');
    if (state === 'full') throw httpError_(409, 'This event is full.');

    var referrerId = '';
    if (refCode) {
      if (refCode === user.referralCode) throw httpError_(400, 'You cannot use your own referral code.');
      var referrer = rowsWhere_(TABS.REGISTRATIONS, 'KarmaVerse referral code', refCode).filter(function (r) {
        return plain_(r['Event ID']) === ev.id;
      })[0];
      if (!referrer) throw httpError_(400, 'That referral code does not belong to anyone registered for this event. Check it, or leave it blank.');
      referrerId = plain_(referrer['User ID']);
    }

    var row = {
      'Registered at': new Date(),
      'Registration ID': shortId_('R-', 10),
      'Event ID': ev.id,
      'User ID': user.id,
      'Name': name,
      'Email': email,
      'Phone': phone,
      'College': college,
      'City': city,
      'KarmaVerse referral code': user.referralCode,
      'Referred by code': referrerId ? refCode : '',
      'Referred by user ID': referrerId,
      'Consent': true,
      'Status': 'registered',
      'Certificate override': '',
      'Source': source,
    };
    appendRow_(TABS.REGISTRATIONS, row);
    CacheService.getScriptCache().remove('regcounts');
    return { alreadyRegistered: false, registration: publicRegistration_(row) };
  });

  if (!out.alreadyRegistered) {
    try {
      sendRegistrationEmail_(ev, out.registration.name, email);
      out.emailQueued = true;
    } catch (err) {
      console.error('Registration email failed: ' + err);
      out.emailQueued = false;
    }
  }
  return out;
}

// ------------------------------------------------------------------ progress

/** The latest non-superseded submission per task for one user in one event. */
function mySubmissionsByTask_(eventId, userId) {
  var map = {};
  rowsWhere_(TABS.SUBMISSIONS, 'User ID', userId).forEach(function (r) {
    if (plain_(r['Event ID']) !== eventId || plain_(r['Status']) === 'superseded') return;
    map[plain_(r['Task ID'])] = r;
  });
  return map;
}

function mySubmissionView_(r) {
  if (!r) return null;
  var status = plain_(r['Status']);
  return {
    id: plain_(r['Submission ID']),
    submittedAt: iso_(r['Submitted at']),
    status: status,
    text: plain_(r['Text']),
    link: plain_(r['Link']),
    hasImage: !!plain_(r['Drive file ID']),
    reason: status === 'rejected' ? plain_(r['Reason']) : '',
    points: num_(r['Points'], 0),
    attempt: num_(r['Attempt'], 1),
  };
}

function ledgerOf_(eventId, userId) {
  return rowsWhere_(TABS.LEDGER, 'User ID', userId).filter(function (r) {
    return !eventId || plain_(r['Event ID']) === eventId;
  });
}

function pointsBreakdown_(ledgerRows) {
  var b = { total: 0, tasks: 0, quality: 0, bonus: 0, adjustments: 0 };
  ledgerRows.forEach(function (r) {
    var pts = num_(r['Points'], 0);
    var src = plain_(r['Source']);
    b.total += pts;
    if (src === 'task') b.tasks += pts;
    else if (src === 'quality') b.quality += pts;
    else if (src === 'bonus') b.bonus += pts;
    else b.adjustments += pts;
  });
  return b;
}

function certificateOf_(eventId, userId) {
  return rowsWhere_(TABS.CERTIFICATES, 'User ID', userId).filter(function (r) {
    return plain_(r['Event ID']) === eventId && !truthy_(r['Revoked']);
  })[0] || null;
}

function eventProgress_(ev, user, reg, now) {
  var tasks = tasksOf_(ev.id);
  var subs = mySubmissionsByTask_(ev.id, user.id);
  var ledger = ledgerOf_(ev.id, user.id);
  var points = pointsBreakdown_(ledger);
  var taskViews = tasks.map(function (t) {
    var v = publicTask_(t, ev, now);
    v.submission = mySubmissionView_(subs[t.id]);
    v.canSubmit = v.state === 'open' && (!v.submission || (v.submission.status === 'rejected' && t.allowResubmit));
    return v;
  });
  var approved = taskViews.filter(function (t) { return t.submission && t.submission.status === 'approved'; }).length;
  var pending = taskViews.filter(function (t) { return t.submission && t.submission.status === 'pending'; }).length;
  var cert = certificateOf_(ev.id, user.id);
  var elig = certificateEligibility_(ev, reg, approved, tasks.length, points.total);
  var pickup = ledger.filter(function (r) { return plain_(r['Source']) === 'bonus' && plain_(r['Ref ID']).indexOf('pickup:') === 0; }).length > 0;
  return {
    event: eventCard_(ev, registrationCounts_(), now),
    registration: publicRegistration_(reg),
    tasks: taskViews,
    points: points,
    maxScore: maxScore_(ev, tasks),
    approvedTasks: approved,
    pendingTasks: pending,
    totalTasks: tasks.length,
    rank: rankOf_(ev.id, 'event', user.id),
    pickupBonus: { available: ev.pickupBonus > 0, verified: pickup, points: ev.pickupBonus },
    certificate: {
      enabled: ev.certificatesEnabled,
      eligible: elig.eligible,
      requirement: elig.requirement,
      issued: !!cert,
      certificateId: cert ? plain_(cert['Certificate ID']) : '',
      verifyUrl: cert ? verifyUrl_(plain_(cert['Certificate ID'])) : '',
    },
  };
}

/** POST me.event { slug } -> registration (or null) and full progress for one event. */
function apiMeEvent_(p, user) {
  var ev = eventBySlug_(p.slug);
  var reg = registrationOf_(ev.id, user.id);
  if (!reg) {
    return {
      registered: false,
      profile: { name: user.name, email: user.email, phone: user.phone, city: user.city },
    };
  }
  var out = eventProgress_(ev, user, reg, new Date());
  out.registered = plain_(reg['Status']) === 'registered';
  return out;
}

/** POST me.dashboard -> every event the user registered for, with totals. */
function apiMeDashboard_(p, user) {
  var now = new Date();
  var regs = rowsWhere_(TABS.REGISTRATIONS, 'User ID', user.id);
  var events = allEvents_();
  var items = [];
  regs.forEach(function (reg) {
    var ev = events.filter(function (e) { return e.id === plain_(reg['Event ID']); })[0];
    if (!ev || !ev.published) return;
    var prog = eventProgress_(ev, user, reg, now);
    items.push({
      event: prog.event,
      registration: prog.registration,
      points: prog.points.total,
      maxScore: prog.maxScore,
      approvedTasks: prog.approvedTasks,
      pendingTasks: prog.pendingTasks,
      totalTasks: prog.totalTasks,
      rank: prog.rank,
      openTasks: prog.tasks.filter(function (t) { return t.canSubmit; }).map(function (t) { return { id: t.id, day: t.day, title: t.title, closesAt: t.closesAt }; }),
      pendingSubmissions: prog.tasks.filter(function (t) { return t.submission && t.submission.status === 'pending'; })
        .map(function (t) { return { day: t.day, title: t.title, submittedAt: t.submission.submittedAt }; }),
      rejectedSubmissions: prog.tasks.filter(function (t) { return t.submission && t.submission.status === 'rejected'; })
        .map(function (t) { return { day: t.day, title: t.title, reason: t.submission.reason, canResubmit: t.canSubmit }; }),
      certificate: prog.certificate,
    });
  });
  items.sort(function (a, b) { return new Date(b.event.startAt) - new Date(a.event.startAt); });
  var total = items.reduce(function (s, i) { return s + i.points; }, 0);
  return {
    totals: {
      events: items.length,
      points: total,
      approvedTasks: items.reduce(function (s, i) { return s + i.approvedTasks; }, 0),
      pendingSubmissions: items.reduce(function (s, i) { return s + i.pendingTasks; }, 0),
      certificates: items.filter(function (i) { return i.certificate.issued; }).length,
      overallRank: rankOf_('', 'overall', user.id),
    },
    active: items.filter(function (i) { return i.event.status !== 'completed'; }),
    history: items.filter(function (i) { return i.event.status === 'completed'; }),
  };
}
