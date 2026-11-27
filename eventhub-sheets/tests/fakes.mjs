// In-memory fakes of the Apps Script services EventHub uses, so the real .gs files
// run under Node. They model what matters here: cell storage (incl. the "'" text
// prefix and formula detection), TextFinder, caches, Drive files and folders,
// MailApp quota, the KarmaVerse profile and bookings APIs, and triggers.
import crypto from 'node:crypto';

export function createGoogle({ profiles = {}, bookings = {} } = {}) {
  const formulaWrites = [];
  const fetchLog = [];
  const mails = [];
  const sheets = new Map();
  let mailQuota = 1500;

  const store = (v) => {
    if (typeof v === 'string') {
      if (v.startsWith("'")) return v.slice(1); // forced text: the apostrophe is not stored
      if (/^[=+\-@]/.test(v) && v.length > 1) formulaWrites.push(v); // would be a live formula in Sheets
    }
    return v;
  };

  class Range {
    constructor(sheet, row, col, nr = 1, nc = 1) { Object.assign(this, { sheet, row, col, nr, nc }); }
    getValues() {
      const out = [];
      for (let r = 0; r < this.nr; r++) {
        const src = this.sheet.data[this.row - 1 + r] || [];
        const line = [];
        for (let c = 0; c < this.nc; c++) { const v = src[this.col - 1 + c]; line.push(v === undefined ? '' : v); }
        out.push(line);
      }
      return out;
    }
    getValue() { return this.getValues()[0][0]; }
    setValues(vals) { vals.forEach((line, r) => line.forEach((v, c) => this.sheet.set(this.row + r, this.col + c, store(v)))); return this; }
    setValue(v) { this.sheet.set(this.row, this.col, store(v)); return this; }
    clearContent() { for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) this.sheet.set(this.row + r, this.col + c, ''); return this; }
    setFontWeight() { return this; }
    setDataValidation() { return this; }
    setNumberFormat() { return this; }
    insertCheckboxes() { return this; }
    getRow() { return this.row; }
    getColumn() { return this.col; }
    getNumRows() { return this.nr; }
    getNumColumns() { return this.nc; }
    getSheet() { return this.sheet; }
    createTextFinder(text) {
      const range = this;
      let entire = false;
      const finder = {
        matchEntireCell(b) { entire = b; return finder; },
        matchCase() { return finder; },
        findAll() {
          const cells = [];
          for (let r = 0; r < range.nr; r++) for (let c = 0; c < range.nc; c++) {
            const v = String(range.sheet.data[range.row - 1 + r]?.[range.col - 1 + c] ?? '');
            if (entire ? v === text : v.includes(text)) cells.push(new Range(range.sheet, range.row + r, range.col + c));
          }
          return cells;
        },
      };
      return finder;
    }
  }

  class Sheet {
    constructor(name) { this.name = name; this.data = []; }
    getName() { return this.name; }
    set(row, col, v) {
      while (this.data.length < row) this.data.push([]);
      const line = this.data[row - 1];
      while (line.length < col) line.push('');
      line[col - 1] = v;
    }
    getLastRow() {
      for (let i = this.data.length; i > 0; i--) if (this.data[i - 1].some((v) => v !== '' && v !== undefined)) return i;
      return 0;
    }
    getLastColumn() {
      let max = 0;
      this.data.forEach((l) => { for (let i = l.length; i > 0; i--) if (l[i - 1] !== '' && l[i - 1] !== undefined) { max = Math.max(max, i); break; } });
      return max;
    }
    getMaxRows() { return Math.max(1000, this.data.length); }
    getDataRange() { return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    appendRow(vals) { const row = this.getLastRow() + 1; vals.forEach((v, i) => this.set(row, i + 1, store(v))); }
    setFrozenRows() {}
  }

  const ss = {
    getId: () => 'sheet-id-1',
    getName: () => 'EventHub',
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = new Sheet(n); sheets.set(n, s); return s; },
    getSheets: () => [...sheets.values()],
    deleteSheet: (s) => sheets.delete(s.name),
    setSpreadsheetTimeZone() {},
  };
  sheets.set('Sheet1', new Sheet('Sheet1'));

  const chain = () => new Proxy({}, { get: (t, k) => (k === 'build' ? () => ({}) : () => chain()) });
  const SpreadsheetApp = { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {}, newDataValidation: () => chain(), getUi: () => chain() };

  const props = new Map();
  const PropertiesService = {
    getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)) }),
  };

  const cacheMap = new Map();
  const CacheService = {
    getScriptCache: () => ({
      get: (k) => (cacheMap.has(k) ? cacheMap.get(k) : null),
      put: (k, v) => cacheMap.set(k, v),
      remove: (k) => cacheMap.delete(k),
      removeAll: (ks) => ks.forEach((k) => cacheMap.delete(k)),
    }),
  };

  let lockHeld = false;
  const LockService = {
    getScriptLock: () => ({
      tryLock: () => { if (lockHeld) throw new Error('re-entrant lock'); lockHeld = true; return true; },
      releaseLock: () => { lockHeld = false; },
    }),
  };

  // ---- blobs, Drive
  const makeBlob = (bytes, ct, name) => {
    const buf = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(bytes.map((b) => b & 0xff));
    const blob = {
      buf, ct, name,
      getBytes: () => [...buf].map((b) => (b > 127 ? b - 256 : b)),
      getContentType: () => blob.ct,
      getDataAsString: () => buf.toString('utf8'),
      setName(n) { blob.name = n; return blob; },
      getAs(type) { return makeBlob('%PDF-FAKE\n' + buf.toString('utf8'), type, blob.name); },
    };
    return blob;
  };
  const files = new Map();
  const folders = new Map();
  const makeFile = (blob, folderId) => {
    const f = {
      id: `file_${crypto.randomUUID()}`, name: blob.name, blob, folderId, trashed: false, sharing: 'PRIVATE',
      getId() { return this.id; }, getName() { return this.name; }, getSize() { return this.blob.buf.length; },
      getMimeType() { return this.blob.ct; }, setTrashed(t) { this.trashed = t; }, getBlob() { return this.blob; },
      getThumbnail() { return makeBlob([1, 2, 3], 'image/png', 'thumb.png'); },
      setSharing(access) { this.sharing = access; },
    };
    files.set(f.id, f);
    return f;
  };
  const makeFolder = (name) => {
    const folder = {
      id: `folder_${crypto.randomUUID()}`, name,
      getId() { return this.id; },
      createFile(blob) { return makeFile(blob, this.id); },
      createFolder: (n) => makeFolder(n),
    };
    folders.set(folder.id, folder);
    return folder;
  };
  const DriveApp = {
    createFolder: makeFolder,
    getFolderById: (id) => { const f = folders.get(id); if (!f) throw new Error('no folder'); return f; },
    getFileById: (id) => { const f = files.get(id); if (!f || f.trashed) throw new Error('no file'); return f; },
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' },
    Permission: { VIEW: 'VIEW', NONE: 'NONE' },
  };

  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body), getAllHeaders: () => ({}) });
  const UrlFetchApp = {
    fetch(url, opts = {}) {
      fetchLog.push({ url, opts });
      const token = String(opts.headers?.Authorization || '').replace('Bearer ', '');
      if (url.endsWith('/api/v1/users/profile')) {
        const p = profiles[token];
        return p ? res(200, { success: true, data: p }) : res(401, { success: false });
      }
      if (url.endsWith('/api/v1/bookings/my-bookings')) {
        const p = profiles[token];
        if (!p) return res(401, { success: false });
        return res(200, { success: true, data: { docs: bookings[p._id] || [] } });
      }
      throw new Error(`unexpected fetch ${url}`);
    },
  };

  const MailApp = {
    getRemainingDailyQuota: () => mailQuota,
    sendEmail: (m) => { mailQuota--; mails.push(m); },
  };

  const triggers = [];
  const ScriptApp = {
    getOAuthToken: () => 'owner-oauth-token',
    getProjectTriggers: () => [...triggers],
    newTrigger: (fn) => {
      const t = { getHandlerFunction: () => fn };
      const b = { timeBased: () => b, everyMinutes: () => b, everyHours: () => b, forSpreadsheet: () => b, onEdit: () => b, create: () => { triggers.push(t); return t; } };
      return b;
    },
  };

  const pad = (n) => String(n).padStart(2, '0');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const Utilities = {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    // Supports the patterns the script uses, in IST (UTC+5:30).
    formatDate: (d, tz, pattern) => {
      const x = new Date(d.getTime() + 330 * 60000);
      const h = x.getUTCHours();
      const map = {
        yyyy: x.getUTCFullYear(), MMMM: MONTHS[x.getUTCMonth()], MMM: MONTHS[x.getUTCMonth()].slice(0, 3), MM: pad(x.getUTCMonth() + 1),
        dd: pad(x.getUTCDate()), d: x.getUTCDate(), h: h % 12 || 12, mm: pad(x.getUTCMinutes()), a: h < 12 ? 'AM' : 'PM',
      };
      return pattern.replace(/yyyy|MMMM|MMM|MM|dd|d|h|mm|a/g, (k) => map[k]);
    },
    base64Decode: (s) => { if (!/^[A-Za-z0-9+/=]*$/.test(s)) throw new Error('bad base64'); return [...Buffer.from(s, 'base64')].map((b) => (b > 127 ? b - 256 : b)); },
    base64Encode: (bytes) => Buffer.from(bytes.map((b) => b & 0xff)).toString('base64'),
    newBlob: makeBlob,
  };

  const ContentService = { MimeType: { JSON: 'application/json' }, createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }) };
  const Session = { getActiveUser: () => ({ getEmail: () => 'reviewer@0waste.co.in' }) };

  return {
    globals: { SpreadsheetApp, PropertiesService, CacheService, LockService, DriveApp, UrlFetchApp, ScriptApp, Utilities, ContentService, MailApp, Session, console: { error() {}, log() {} } },
    sheets, formulaWrites, fetchLog, cacheMap, files, triggers, props, mails,
    setMailQuota: (n) => { mailQuota = n; },
  };
}
