// Minimal base64url decoder for JWT payloads — avoids relying on atob/Buffer, which
// aren't guaranteed to exist in the Hermes JS engine.
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input: string): string {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of str) {
    if (char === '=') break;
    const idx = BASE64_CHARS.indexOf(char);
    if (idx === -1) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

// Derives a stable per-user AsyncStorage key suffix from the JWT's embedded Mongo
// _id, rather than slicing the raw token — the token rotates on refresh/re-login,
// which silently resets any local state (quiz streak, one-time popups) keyed off it.
export function getStableUserSuffix(token: string | null): string {
  if (!token) return 'default';
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return token.slice(-8);
    const payload = JSON.parse(base64Decode(payloadPart));
    const id = payload._id || payload.id;
    return id ? String(id).slice(-8) : token.slice(-8);
  } catch {
    return token.slice(-8);
  }
}
