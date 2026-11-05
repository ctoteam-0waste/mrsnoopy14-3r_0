# iOS launch — Backend Spec (Sign in with Apple + account deletion)

Both endpoints below are **App Store blockers**. The user app (iOS build) already calls them,
but the live API (`https://api.karmaverse.earth`) currently returns **404** for both:

| Endpoint | Live status | Apple rule |
|---|---|---|
| `POST /api/v1/auth/apple-login` | 404 (google-login / facebook-login return 400, so they exist) | 4.8 — apps offering Google/Facebook login must also offer Sign in with Apple |
| `DELETE /api/v1/users/account` | 404 (other protected routes return 401) | 5.1.1(v) — apps with account creation must let users delete the account in-app |

Android is unaffected: the Apple button is only rendered on iOS.

---

## 1. `POST /api/v1/auth/apple-login`

Mirror `POST /api/v1/auth/google-login` (same response shape, same user/JWT handling).

### Request
```json
{
  "identityToken": "<JWT string from Apple>",
  "authorizationCode": "<short-lived code from Apple>",
  "fullName": "Asha Rao"
}
```
- `identityToken` — always present.
- `authorizationCode` — sent on every sign-in (may be `null` in rare cases). Single-use and
  valid for ~5 minutes. Exchange it for a refresh token (see "Store the refresh token" below).
- `fullName` — **only sent on the user's very first Apple sign-in** (Apple never returns it
  again). Optional; may be `null` or missing. Save it when present.

### Verify the identityToken
1. Fetch Apple's public keys: `GET https://appleid.apple.com/auth/keys` (JWKS, cache it; refresh
   when a `kid` is not found).
2. Verify the JWT signature (RS256) with the key matching the token header's `kid`.
3. Check claims:
   - `iss` == `https://appleid.apple.com`
   - `aud` == `com.karmacredits.app` (the iOS bundle ID)
   - `exp` is in the future
4. Use these claims:
   - `sub` — Apple's stable user ID. **Identify the user by `sub`, not by email.**
   - `email` — may be the user's real email **or** a relay address like
     `xyz@privaterelay.appleid.com` (if they chose "Hide my email"). Only reliably present on
     the first sign-in.
   - `email_verified` — `"true"`/`true` when present.

Node example: `apple-signin-auth` (`verifyIdToken(token, { audience: 'com.karmacredits.app' })`)
or `jose` with `createRemoteJWKSet`.

### User lookup
1. Find user by `appleSub == sub` → log them in.
2. Else, if `email` is present and a user with that email exists → link: set `appleSub` on that
   user, log them in.
3. Else → create a new user with `appleSub`, `email` (if any), `name` = `fullName` (if any).
   Same defaults as a new Google user (wallet, referral code, `isFirstTime`, etc.).

Add to the User model: `appleSub: String (unique, sparse)`, `appleRefreshToken: String`
(store encrypted / never return it in API responses).

### Store the refresh token
If `authorizationCode` is present, exchange it and save the result on the user:
```
POST https://appleid.apple.com/auth/token
Content-Type: application/x-www-form-urlencoded

client_id=com.karmacredits.app
client_secret=<ES256 JWT, see "client_secret" below>
code=<authorizationCode>
grant_type=authorization_code
```
Response contains `refresh_token` → save as `appleRefreshToken`. If the exchange fails, still
log the user in (the identityToken is already verified); just log the error.

### Response
Same shape as `google-login`. The app reads the JWT from any of: `data.token`,
`data.accessToken`, `token`, `accessToken` (see `extractToken` in `src/services/auth.ts`).

```json
{ "success": true, "data": { "token": "<our JWT>", "user": { ... } } }
```

### Errors
- `400` — `identityToken` missing.
- `401` — signature/claims invalid or token expired. Body `{ "message": "..." }` — the app shows
  `message` in the "Apple sign-in failed" alert.

---

## 2. `DELETE /api/v1/users/account`

Authenticated with the normal `Authorization: Bearer <JWT>` header. No body.

1. Delete the user and their related records (or anonymise where records must be kept for
   accounting, e.g. completed bookings / coin ledger).
2. Invalidate all of the user's tokens and stored push tokens.
3. **If the user has `appleRefreshToken`**, revoke it — Apple requires this for accounts created
   with Sign in with Apple:
   ```
   POST https://appleid.apple.com/auth/revoke
   Content-Type: application/x-www-form-urlencoded

   client_id=com.karmacredits.app
   client_secret=<ES256 JWT>
   token=<appleRefreshToken>
   token_type_hint=refresh_token
   ```
4. Return `200` `{ "success": true }`.

---

## `client_secret` (used by /auth/token and /auth/revoke)

An ES256 JWT you generate server-side, signed with a **Sign in with Apple** private key (`.p8`):

| Field | Value |
|---|---|
| header `alg` | `ES256` |
| header `kid` | Key ID of the Sign in with Apple key |
| `iss` | Team ID `CV8MF74KTR` |
| `iat` | now |
| `exp` | now + up to 6 months |
| `aud` | `https://appleid.apple.com` |
| `sub` | `com.karmacredits.app` |

The `.p8` key: Apple Developer → Keys → `+` → enable **Sign in with Apple** → configure with the
`com.karmacredits.app` App ID. Ask the iOS owner for the `.p8` file and its Key ID (this is a
**different** key from the APNs push key). Keep it in server secrets, never in the repo.

---

## Apple account details (for backend config)

| Item | Value |
|---|---|
| Bundle ID / `aud` / `client_id` | `com.karmacredits.app` |
| Team ID | `CV8MF74KTR` |
| Sign in with Apple Key ID (`kid`) | `2B2R7KK7JX` (the `.p8` itself is shared separately, never in the repo) |
| Refresh-token encryption key | Generate on the server (`openssl rand -base64 32`), store as `APPLE_TOKEN_ENCRYPTION_KEY` |
| Token issuer | `https://appleid.apple.com` |
| Public keys | `https://appleid.apple.com/auth/keys` |

## How to test
Apple sign-in can only be tested from the iOS build on a real iPhone (TestFlight). Until then,
verify with a unit test using a captured `identityToken`, and check that:
- first sign-in creates the user and stores `fullName`,
- second sign-in (no `fullName`, possibly no `email`) finds the same user by `sub`,
- `DELETE /api/v1/users/account` removes the user and a later login creates a fresh account.
