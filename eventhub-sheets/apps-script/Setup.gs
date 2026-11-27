/**
 * Run setupEventHub() once from the Apps Script editor. It is safe to run again:
 * it adds any missing tabs, columns, folders and triggers, and never overwrites
 * rows the team has edited.
 */

var BOOLEAN_COLUMNS = ['Published', 'Featured', 'Late submissions', 'Certificates enabled', 'Auto approve',
  'Allow resubmit', 'Active', 'Consent', 'Revoked'];

var DROPDOWNS = {
  Submissions: { Status: ['pending', 'approved', 'rejected', 'superseded'] },
  Registrations: { Status: ['registered', 'withdrawn', 'disqualified'], 'Certificate override': ['', 'eligible', 'blocked'] },
  Admins: { Role: ['reviewer', 'admin', 'owner'] },
};

function setupEventHub() {
  var ss = spreadsheet_();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  try { ss.setSpreadsheetTimeZone(CONFIG.TIME_ZONE); } catch (err) { /* keep existing */ }

  Object.keys(TABS).forEach(function (k) { ensureTab_(ss, TABS[k]); });
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  HDR_ = {};

  seedSettings_();
  seedCategories_();
  seedGreenImpactChallenge_();
  seedSevenDaysOfKarma_();
  ensureFolders_(props);
  ensureTriggers_();
  clearCaches();
  return 'EventHub is set up.';
}

function ensureTab_(ss, tab) {
  var sh = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
  var lastCol = sh.getLastColumn();
  var have = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var missing = tab.headers.filter(function (h) { return have.indexOf(h) === -1; });
  if (missing.length) {
    sh.getRange(1, have.filter(Boolean).length + 1, 1, missing.length).setValues([missing]);
  }
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.getRange(1, 1, 1, hdr.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  hdr.forEach(function (h, i) {
    var col = sh.getRange(2, i + 1, rows, 1);
    if (TEXT_COLUMNS.indexOf(h) !== -1) col.setNumberFormat('@');
    if (BOOLEAN_COLUMNS.indexOf(h) !== -1) col.insertCheckboxes();
    var dd = DROPDOWNS[tab.name] && DROPDOWNS[tab.name][h];
    if (dd) col.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(dd, true).setAllowInvalid(false).build());
  });
}

function seedSettings_() {
  var have = readRows_(TABS.SETTINGS).map(function (r) { return plain_(r['Setting']); });
  SETTING_DEFAULTS.forEach(function (d) {
    if (have.indexOf(d[0]) === -1) appendRow_(TABS.SETTINGS, { 'Setting': d[0], 'Value': d[1], 'Notes': d[2] });
  });
}

function seedCategories_() {
  if (readRows_(TABS.CATEGORIES).length) return;
  ['Sustainability', 'Innovation', 'Competition', 'Campus Challenges', 'Awareness'].forEach(function (c, i) {
    appendRow_(TABS.CATEGORIES, { 'Category': c, 'Order': i + 1, 'Active': true });
  });
}

/**
 * The first flagship event, created as an unpublished draft. Check the dates and
 * text, add the banner, then publish it from /admin/events or tick Published.
 * Scoring: days 1–6 are worth 10, day 7 is worth 15, each day can earn up to 5 for
 * quality, and a verified pickup adds 10. Maximum 120.
 */
function seedGreenImpactChallenge_() {
  var slug = 'green-impact-challenge';
  if (readRows_(TABS.EVENTS).some(function (r) { return plain_(r['Slug']) === slug; })) return;
  var id = 'E-GIC2026A';
  appendRow_(TABS.EVENTS, {
    'Event ID': id,
    'Slug': slug,
    'Title': '7-Day Green Impact Challenge',
    'Category': 'Campus Challenges',
    'Published': false,
    'Featured': true,
    'Short description': 'Seven days, seven simple green actions. Complete a task each day, earn points and get a digital certificate.',
    'Banner URL': siteUrl_() + '/event-banners/green-impact-challenge.jpg', // served by the website (public/event-banners/)
    'Overview': 'The 7-Day Green Impact Challenge is a free week-long challenge for college students across India. Each day brings one practical sustainability task, from taking a green pledge to recycling and sharing your impact story. Submit proof on KarmaVerse, get it reviewed, earn points and climb the leaderboard.',
    'Objectives': ['Build everyday habits that cut waste', 'Learn to segregate, reuse and recycle correctly', 'Spread awareness on campus and online', 'Recognise students who take real action'].join('\n'),
    'Eligibility': ['Students currently enrolled in a college or university in India', 'A KarmaVerse account (free)', 'One registration per person'].join('\n'),
    'Rules': [
      'Each task opens on its day. You can submit a missed task until the challenge ends.',
      'Submit your own original work. Copied or AI-generated photos are rejected.',
      'Points count only after the KarmaVerse team approves a submission.',
      'If a submission is rejected, you will see the reason and can submit again.',
      'Ties on the leaderboard go to whoever reached the score first.',
      'The KarmaVerse team may remove entries or participants that break these rules.',
    ].join('\n'),
    'Rewards': ['Digital certificate for completing at least 5 of the 7 days', 'Top participants are considered for the KarmaVerse Campus Ambassador programme', 'A place on the public leaderboard'].join('\n'),
    'FAQ': [
      'Q: Is it free?', 'A: Yes. Registration is free.', '',
      'Q: Do I need to do every task on its day?', 'A: Each task opens on its day, and you can still submit it until the challenge ends. Earlier submissions win ties.', '',
      'Q: How are points given?', 'A: Each approved day earns 10 points (Day 7 earns 15). Reviewers can add up to 5 quality points per day, and a completed KarmaVerse pickup during the challenge adds 10 bonus points.', '',
      'Q: When do I get my certificate?', 'A: After the challenge ends and reviews are finished. Download it from My Events.',
    ].join('\n'),
    'Audience': 'College students across India',
    'Registration fee': 'Free',
    'Starts at': new Date('2026-12-07T00:00:00+05:30'),
    'Ends at': new Date('2026-12-13T23:59:59+05:30'),
    'Registration opens': new Date('2026-11-27T00:00:00+05:30'),
    'Registration closes': new Date('2026-12-09T23:59:59+05:30'),
    'Max participants': 0,
    'Late submissions': true,
    'Pickup bonus points': 10,
    'Certificates enabled': false,
    'Certificate rule': 'minApprovedTasks=5',
    'Created at': new Date(),
    'Updated at': new Date(),
  });
  var tasks = [
    [1, 'Green Pledge', 'Write your personal sustainability pledge: three specific things you will do differently, starting this week. At least 30 characters.', 'text', 10, true],
    [2, 'Waste Segregation', 'Set up separate dry and wet waste bins at home or in your hostel. Upload a photo showing both bins with waste correctly sorted.', 'image,text', 10, false],
    [3, 'Reuse Challenge', 'Give an item a second life instead of throwing it away. Upload a photo or a short video link showing the item and how you reused it.', 'image,link,text', 10, false],
    [4, 'Plastic-Free Day', 'Spend the day without single-use plastic. Share a photo or link showing what you used instead (cloth bag, steel bottle, tiffin) and a line about how it went.', 'image,link,text', 10, false],
    [5, 'Green Awareness', 'Create a poster, reel or post that teaches others one sustainability habit. Upload the poster or paste the link to your public post or reel.', 'image,link,text', 10, false],
    [6, 'Recycling Action', 'Recycle something properly: hand recyclables to a recycler or scrap dealer, or book a KarmaVerse pickup. Upload a photo or link as proof. A completed KarmaVerse pickup during the challenge earns 10 bonus points automatically.', 'image,link,text', 10, false],
    [7, 'Green Impact Story', 'Write your impact report: what you did across the week, what changed, and what you will keep doing. Add a photo or link if you like. At least 30 characters.', 'text,image,link', 15, false],
  ];
  tasks.forEach(function (t) {
    appendRow_(TABS.TASKS, {
      'Task ID': 'T-GIC' + t[0] + 'D',
      'Event ID': id,
      'Day': t[0],
      'Title': t[1],
      'Instructions': t[2],
      'Accepts': t[3],
      'Points': t[4],
      'Quality max': 5,
      'Auto approve': t[5],
      'Allow resubmit': true,
      'Opens at': '',
      'Closes at': '',
      'Bonus rule': t[0] === 6 ? 'karmaverse_pickup' : '',
      'Active': true,
    });
  });
}

/**
 * "7 Days of Karma" (from the 7-Day Campaign Proposal), also an unpublished draft.
 * Points follow the proposal's table: 1, 2, 3, 2, 1, 3, 3 = 15. No quality bonus.
 * Day 3 is a self-assessment: KarmaVerse has no Carbon Footprint feature yet, so the
 * task doesn't claim one. Rewards don't promise anything beyond a certificate and recognition.
 */
function seedSevenDaysOfKarma_() {
  var slug = '7-days-of-karma';
  if (readRows_(TABS.EVENTS).some(function (r) { return plain_(r['Slug']) === slug; })) return;
  var id = 'E-7DOK2026A';
  appendRow_(TABS.EVENTS, {
    'Event ID': id,
    'Slug': slug,
    'Title': '7 Days of Karma',
    'Category': 'Awareness',
    'Published': false,
    'Featured': true, // the launch campaign: shown first on /events
    'Short description': 'Small actions. Real impact. One positive action or KarmaVerse activity a day for seven days. Free to join.',
    // Served by the website itself (public/event-banners/), so no upload is needed.
    'Banner URL': siteUrl_() + '/event-banners/7-days-of-karma.jpg',
    'Overview': '7 Days of Karma is a free seven-day challenge from KarmaVerse by 3R ZeroWaste. Each day brings one small positive action, from a quick habit check to the Eco Quiz, a good-habit challenge and inviting a friend. Submit each day on KarmaVerse, get it reviewed, collect campaign points and climb the leaderboard.',
    'Objectives': ['Turn small positive actions into a daily habit', 'Learn how your everyday choices affect the planet', 'Discover KarmaVerse activities like the Eco Quiz', 'Bring friends along on a positive-impact journey'].join('\n'),
    'Eligibility': ['Open to everyone in India; students especially welcome', 'A free KarmaVerse account', 'One registration per person'].join('\n'),
    'Rules': [
      'Each day opens on its date. You can submit a missed day until the challenge ends.',
      'Submit your own original work. Copied or edited screenshots are rejected.',
      'Points count only after the KarmaVerse team approves a submission.',
      'If a submission is rejected, you will see the reason and can submit again.',
      'The Day 6 referral counts only when your friend registers for 7 Days of Karma with your referral code.',
      'Ties on the leaderboard go to whoever reached the score first.',
    ].join('\n'),
    'Rewards': ['Digital certificate for completing at least 5 of the 7 days', 'Top participants featured on KarmaVerse channels', 'A place on the public leaderboard'].join('\n'),
    'FAQ': [
      'Q: Is it free?', 'A: Yes.', '',
      'Q: How are points given?', 'A: Each day has its own points (1 to 3), 15 in total. They count once the KarmaVerse team approves your submission.', '',
      'Q: Can I join late?', 'A: Yes, while registration is open. Missed days stay open until the challenge ends.', '',
      'Q: Where do I find my referral code?', 'A: In the KarmaVerse app or website under Referral. Share it with a friend, who enters it when registering for this challenge.',
    ].join('\n'),
    'Audience': 'Students and young people across India',
    'Registration fee': 'Free',
    'Starts at': new Date('2026-11-28T00:00:00+05:30'),
    'Ends at': new Date('2026-12-04T23:59:59+05:30'),
    'Registration opens': new Date('2026-11-27T00:00:00+05:30'),
    'Registration closes': new Date('2026-12-01T23:59:59+05:30'),
    'Max participants': 0,
    'Late submissions': true,
    'Pickup bonus points': 0,
    'Certificates enabled': false,
    'Certificate rule': 'minApprovedTasks=5',
    'Created at': new Date(),
    'Updated at': new Date(),
  });
  var tasks = [
    [1, 'Discover Your Karma', 'How much good do you already do? Write the three positive habits you already have (recycling, avoiding food waste, reusable bags, walking or cycling, helping your community) and the one new habit you will start this week.', 'text', 1, true],
    [2, 'Eco Quiz Challenge', 'How eco-smart are you? Play today\'s Eco Quiz in KarmaVerse and upload a screenshot of your result.', 'image,text', 2, false],
    [3, 'Calculate Your Impact', 'Make your footprint visible. Think about how you travel, what you eat, your electricity and water use, and the waste you throw away. Write which of these makes up most of your footprint and one specific change you will make to reduce it.', 'text', 3, false],
    [4, 'Your Karma Streak', 'Pick one good habit and do it today: carry a reusable bottle, avoid food waste, walk a short trip, segregate your waste, save electricity or care for a plant. Upload a photo or a link to your post showing it.', 'image,link,text', 2, false],
    [5, 'Earn Karma, Make It Count', 'Good actions deserve recognition. Share the 7 Days of Karma campaign post on your story or feed, then paste the link or upload a screenshot.', 'image,link', 1, false],
    [6, 'The Referral Ripple', 'Good actions are better together. Invite a friend to register for 7 Days of Karma with your KarmaVerse referral code. Write your friend\'s first name, and add a screenshot or link of your invite. Points are approved once their registration shows your code.', 'text,image,link', 3, false],
    [7, 'KarmaVerse Challenge Finale', 'Your journey starts today. Choose one positive action, complete it, share it and tag KarmaVerse. Upload a photo or the link to your post, with a line about what you did and who you invited to join.', 'image,link,text', 3, false],
  ];
  tasks.forEach(function (t) {
    appendRow_(TABS.TASKS, {
      'Task ID': 'T-7DOK' + t[0] + 'D',
      'Event ID': id,
      'Day': t[0],
      'Title': t[1],
      'Instructions': t[2],
      'Accepts': t[3],
      'Points': t[4],
      'Quality max': 0,
      'Auto approve': t[5],
      'Allow resubmit': true,
      'Opens at': '',
      'Closes at': '',
      'Bonus rule': '',
      'Active': true,
    });
  });
}

function ensureFolders_(props) {
  var parentId = prop_('PARENT_FOLDER_ID', '');
  var parent = null;
  if (parentId) { try { parent = DriveApp.getFolderById(parentId); } catch (err) { parent = null; } }
  if (!parent) {
    parent = DriveApp.createFolder('EventHub files (' + spreadsheet_().getName() + ')');
    props.setProperty('PARENT_FOLDER_ID', parent.getId());
  }
  [['SUBMISSIONS_FOLDER_ID', 'Submissions (private)'], ['BANNERS_FOLDER_ID', 'Banners (public)'], ['CERTIFICATES_FOLDER_ID', 'Certificates (private)']]
    .forEach(function (f) {
      var id = prop_(f[0], '');
      if (id) { try { DriveApp.getFolderById(id); return; } catch (err) { /* recreate */ } }
      props.setProperty(f[0], parent.createFolder(f[1]).getId());
    });
}

function ensureTriggers_() {
  var have = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (have.indexOf('rebuildLeaderboardsIfChanged') === -1) ScriptApp.newTrigger('rebuildLeaderboardsIfChanged').timeBased().everyMinutes(5).create();
  if (have.indexOf('onSheetEdit') === -1) ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(spreadsheet_()).onEdit().create();
  if (have.indexOf('flushMailQueue') === -1) ScriptApp.newTrigger('flushMailQueue').timeBased().everyHours(1).create();
}
