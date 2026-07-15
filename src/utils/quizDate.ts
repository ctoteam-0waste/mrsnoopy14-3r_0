// Quiz resets at local midnight (12:00 AM). Every streak read and write must use
// the LOCAL date — mixing local and UTC here silently drops streaks for IST users
// between 00:00 and 05:30, when the local date is a day ahead of UTC.

export function getLocalDateStr(base: Date = new Date()): string {
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

export function getLocalYesterdayStr(base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
}
