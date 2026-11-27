import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createGoogle } from './fakes.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps-script');

/** Loads every real .gs file into a fresh sandbox wired to fake Google services. */
export function loadScript(options) {
  const g = createGoogle(options);
  const ctx = vm.createContext({ ...g.globals, Date, JSON, Math, Number, String, Array, Object, RegExp, Error, encodeURIComponent, parseInt, isNaN });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gs')).sort();
  if (process.env.REVERSE_LOAD) files.reverse(); // Apps Script file order must not matter
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });

  const call = (method, payload) => {
    vm.runInContext('HDR_ = {}; SS_ = null;', ctx); // each web request starts fresh, as in Apps Script
    const out = method === 'GET' ? ctx.doGet({ parameter: payload }) : ctx.doPost({ postData: { contents: JSON.stringify(payload) } });
    return JSON.parse(out.content);
  };
  const sheet = (name) => g.sheets.get(name);
  const header = (name) => sheet(name).data[0];
  return {
    ctx,
    g,
    get: (params) => call('GET', params),
    post: (body) => call('POST', body),
    rows: (tab) => { vm.runInContext('HDR_ = {};', ctx); return structuredClone(vm.runInContext(`readRows_(TABS.${tab})`, ctx)); },
    /** Edits one cell the way the team would in the sheet (no trigger), then clears caches. */
    setCell(tabName, match, col, value) {
      const sh = sheet(tabName);
      const hdr = header(tabName);
      const ci = hdr.indexOf(col);
      const ri = sh.data.findIndex((r, i) => i > 0 && match(Object.fromEntries(hdr.map((h, j) => [h, r[j]]))));
      if (ci < 0 || ri < 0) throw new Error(`no cell ${tabName}.${col}`);
      sh.set(ri + 1, ci + 1, value);
      vm.runInContext('HDR_ = {}; clearCaches();', ctx);
      return ri + 1;
    },
    /** Simulates the team editing a cell, including the installable onEdit trigger. */
    editCell(tabName, match, col, value) {
      const sh = sheet(tabName);
      const hdr = header(tabName);
      const ci = hdr.indexOf(col);
      const ri = sh.data.findIndex((r, i) => i > 0 && match(Object.fromEntries(hdr.map((h, j) => [h, r[j]]))));
      const oldValue = sh.data[ri][ci];
      sh.set(ri + 1, ci + 1, value);
      vm.runInContext('HDR_ = {};', ctx);
      ctx.onSheetEdit({ range: sh.getRange(ri + 1, ci + 1), oldValue, value });
    },
    appendRaw(tabName, obj) {
      const hdr = header(tabName);
      sheet(tabName).appendRow(hdr.map((h) => (h in obj ? obj[h] : '')));
      vm.runInContext('HDR_ = {}; clearCaches();', ctx);
    },
    clearCache: () => g.cacheMap.clear(),
  };
}
