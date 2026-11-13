// name@domain.tld: no spaces, no empty or doubled dots, and a letters-only ending of
// at least 2 characters, so "name@gmail.c" or "name@gmail..com" are rejected.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

export const isValidEmail = (value: string) => {
  const v = value.trim();
  return v.length <= 254 && !v.includes('..') && EMAIL_RE.test(v);
};
