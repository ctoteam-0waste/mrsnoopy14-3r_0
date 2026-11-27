/** Team-editable switches on the Settings tab, with safe defaults. */

var SETTING_DEFAULTS = [
  ['emailsEnabled', true, 'Send registration confirmation emails (TRUE/FALSE).'],
  ['rejectionEmails', true, 'Email participants when a submission is rejected, with the reason (TRUE/FALSE).'],
  ['supportEmail', '', 'Shown in emails as the address for questions. Leave blank to hide.'],
  ['certificateOrg', 'KarmaVerse by 3R ZeroWaste', 'Organisation name printed on certificates.'],
  ['certificateSignerName', '', 'Name printed under the signature line on certificates. Leave blank to hide.'],
  ['certificateSignerTitle', '', 'Title printed under the signer name, e.g. "Founder, 3R ZeroWaste".'],
];

function getSettings_() {
  var hit = cacheGetJson_('settings');
  if (hit) return hit;
  var out = {};
  SETTING_DEFAULTS.forEach(function (d) { out[d[0]] = d[1]; });
  readRows_(TABS.SETTINGS).forEach(function (r) {
    var k = plain_(r['Setting']).trim();
    if (!(k in out)) return;
    var v = r['Value'];
    out[k] = typeof out[k] === 'boolean' ? truthy_(v) : plain_(v).trim();
  });
  cachePutJson_('settings', out, CONFIG.EVENTS_CACHE_SECONDS);
  return out;
}
