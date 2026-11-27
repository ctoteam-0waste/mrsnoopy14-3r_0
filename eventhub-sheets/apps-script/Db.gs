/** Thin table layer over the tabs: rows in and out as objects keyed by header. */

function httpError_(status, message) {
  var err = new Error(message);
  err.httpStatus = status;
  return err;
}

var SS_ = null;
function spreadsheet_() {
  if (SS_) return SS_;
  var id = prop_('SPREADSHEET_ID', '');
  SS_ = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  return SS_;
}

function sheet_(tab) {
  var s = spreadsheet_().getSheetByName(tab.name);
  if (!s) throw httpError_(500, 'Missing tab "' + tab.name + '". Run setupEventHub.');
  return s;
}

/** Header row of a tab, read once per request. */
var HDR_ = {};
function headers_(tab) {
  if (HDR_[tab.name]) return HDR_[tab.name];
  var s = sheet_(tab);
  var n = Math.max(s.getLastColumn(), 1);
  HDR_[tab.name] = s.getRange(1, 1, 1, n).getValues()[0].map(String);
  return HDR_[tab.name];
}

function rowObject_(header, values, rowNumber) {
  var o = { _row: rowNumber };
  for (var c = 0; c < header.length; c++) if (header[c]) o[header[c]] = values[c];
  return o;
}

function isBlankRow_(r) {
  return r.every(function (c) { return c === '' || c === null; });
}

/** Reads a whole tab. Each row object also carries `_row` (its sheet row number). */
function readRows_(tab) {
  var values = sheet_(tab).getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0].map(String);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (isBlankRow_(values[i])) continue;
    rows.push(rowObject_(header, values[i], i + 1));
  }
  return rows;
}

/**
 * Rows whose `header` cell equals `value` exactly. Uses the sheet's own search, so a
 * user's few rows are found without reading thousands of others.
 */
function rowsWhere_(tab, header, value) {
  var s = sheet_(tab);
  var hdr = headers_(tab);
  var idx = hdr.indexOf(header);
  if (idx === -1) throw httpError_(500, 'Column "' + header + '" missing in ' + tab.name);
  var last = s.getLastRow();
  if (last < 2 || value === '' || value === null || value === undefined) return [];
  var cells = s.getRange(2, idx + 1, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findAll();
  var rows = [];
  cells.forEach(function (cell) {
    var r = cell.getRow();
    var vals = s.getRange(r, 1, 1, hdr.length).getValues()[0];
    if (String(vals[idx]) === String(value)) rows.push(rowObject_(hdr, vals, r));
  });
  rows.sort(function (a, b) { return a._row - b._row; });
  return rows;
}

function rowWhere_(tab, header, value) {
  return rowsWhere_(tab, header, value)[0] || null;
}

/** One column's values (no header), e.g. to count registrations per event cheaply. */
function columnValues_(tab, header) {
  var s = sheet_(tab);
  var idx = headers_(tab).indexOf(header);
  if (idx === -1) throw httpError_(500, 'Column "' + header + '" missing in ' + tab.name);
  var last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, idx + 1, last - 1, 1).getValues().map(function (r) { return r[0]; });
}

/**
 * Anything a user typed is written as plain text: a caption like "=IMPORTXML(...)"
 * must never become a live formula in the team's spreadsheet.
 */
function safeText_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Reverses safeText_ for values read back from the sheet. */
function plain_(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/^'/, '');
}

function appendRow_(tab, obj) {
  var hdr = headers_(tab);
  sheet_(tab).appendRow(hdr.map(function (h) { return h in obj ? safeText_(obj[h]) : ''; }));
}

function updateCells_(tab, rowNumber, obj) {
  var s = sheet_(tab);
  var hdr = headers_(tab);
  Object.keys(obj).forEach(function (h) {
    var idx = hdr.indexOf(h);
    if (idx === -1) throw httpError_(500, 'Column "' + h + '" missing in ' + tab.name);
    s.getRange(rowNumber, idx + 1).setValue(safeText_(obj[h]));
  });
}

/**
 * Every check-then-write runs inside one script-wide lock, so two taps can never
 * create two registrations, two submissions for one task, or two certificates.
 */
var LOCK_DEPTH_ = 0;
function withLock_(fn) {
  if (LOCK_DEPTH_ > 0) return fn();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw httpError_(503, 'We are very busy right now. Please try again in a moment.');
  LOCK_DEPTH_++;
  try {
    var out = fn();
    SpreadsheetApp.flush();
    return out;
  } finally {
    LOCK_DEPTH_--;
    lock.releaseLock();
  }
}

function toDate_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v === '' || v === null || v === undefined) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function iso_(d) {
  var x = toDate_(d);
  return x ? x.toISOString() : null;
}

function truthy_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v).toLowerCase() === 'yes';
}

function num_(v, fallback) {
  var n = Number(v);
  return v === '' || v === null || v === undefined || isNaN(n) ? fallback : n;
}

function uuid_() {
  return Utilities.getUuid();
}

/** Short, unguessable, unambiguous ID (no 0/O/1/I). */
function shortId_(prefix, len) {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var hex = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var out = '';
  for (var i = 0; i < len; i++) out += alphabet.charAt(parseInt(hex.substr(i * 2, 2), 16) % alphabet.length);
  return prefix + out;
}

/** Splits a multi-line cell into a clean list (one item per line, bullets stripped). */
function lines_(v) {
  return plain_(v).split(/\r?\n/).map(function (s) { return s.replace(/^\s*[-•*]\s*/, '').trim(); }).filter(Boolean);
}

/** Trimmed string, or a 400 if it's not a string within the length limits. */
function str_(v, label, min, max) {
  var s = typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
  if (s.length < min) throw httpError_(400, min <= 1 ? label + ' is required.' : label + ' must be at least ' + min + ' characters.');
  if (s.length > max) throw httpError_(400, label + ' must be ' + max + ' characters or fewer.');
  return s;
}

/** Calendar date in India for daily stats, e.g. "2026-12-07". */
function istDate_(d) {
  return Utilities.formatDate(toDate_(d) || new Date(0), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
}

function cacheGetJson_(key) {
  var hit = CacheService.getScriptCache().get(key);
  return hit ? JSON.parse(hit) : null;
}

function cachePutJson_(key, obj, seconds) {
  var s = JSON.stringify(obj);
  if (s.length < 95000) CacheService.getScriptCache().put(key, s, seconds);
}
