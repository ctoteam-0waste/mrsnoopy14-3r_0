# KarmaVerse EventHub on Google Sheets

EventHub runs events and challenges on karmaverse.earth, such as the **7-Day Green Impact Challenge**. All of its data lives in one Google Sheet, so there is no server to host or pay for.

```
karmaverse.earth/events ──► Apps Script web app ──► Google Sheet  (every event's data)
                                   │              └─► Drive folders (proof photos, banners, certificates)
                                   ├─► api.karmaverse.earth (checks who is logged in; checks pickups for the bonus)
                                   └─► Gmail (confirmation and rejection emails)
```

- **The website never touches the sheet directly.** It calls the script. The script checks the KarmaVerse login, applies every rule, calculates points and only then writes.
- **One sheet holds every event.** Each row carries an Event ID, so several events can run at once, each with its own dates, tasks, points and leaderboard.
- **The team works in two places, on the same data:** the web dashboard at **karmaverse.earth/admin/events**, or the sheet itself.
- **Code:** `apps-script/*.gs`. You paste these files into the sheet's script editor.
- **Tests:** `npm test` runs the same code under Node with fake Google services (42 tests).
- **Local preview:** `node scripts/dev-server.mjs` runs the script locally with demo data. See "For developers" below.

---

## Setup (about 30 minutes, once)

Use the **0waste.co.in** Google Workspace account.

### 1. Create the sheet and paste the code
1. Go to **sheets.google.com** (signed in as your @0waste.co.in account). Click **Blank spreadsheet**.
2. Rename it (top left) to **KarmaVerse EventHub**.
3. Open the menu **Extensions → Apps Script**. A new tab opens with a file called `Code.gs`.
4. Click the **gear icon (Project Settings)** on the left. Tick **"Show 'appsscript.json' manifest file in editor"**.
5. Click the **< > (Editor)** icon on the left.
6. Click `appsscript.json`. Select everything, delete it, and paste the contents of `dist/appsscript.json`.
7. Click `Code.gs`, then the **⋮** next to it → **Rename** → `EventHub`.
8. Select everything in `EventHub.gs`, delete it, and paste the whole of **`dist/EventHub.gs`** (one file, about 4,100 lines; it contains every `apps-script/*.gs` file).
9. Press **Ctrl + S** to save.

(Developers: `npm run bundle` rebuilds `dist/` after any change to `apps-script/`.)

### 2. Run setup once
1. In the toolbar's function dropdown (next to **Debug**), choose **setupEventHub**. Click **Run**.
2. A permission window appears. Click **Review permissions** → choose your @0waste.co.in account → **Allow**. It asks for Sheets, Drive, Gmail sending, external requests and triggers; all are needed.
3. Go back to the spreadsheet tab and reload it. You should now see these tabs:
   **Settings, Categories, Events, Tasks, Registrations, Submissions, PointsLedger, Leaderboard, Certificates, AuditLog, Admins, MailQueue**.
4. You should also see an **EventHub** menu, and a Drive folder called **EventHub files (KarmaVerse EventHub)** with three folders inside it.
5. The **Events** tab has one row: the **7-Day Green Impact Challenge**, as an unpublished draft with its 7 tasks on the **Tasks** tab.

### 3. Add the team as admins
On the **Admins** tab, add one row per person:

| Email | User ID | Role | Active |
|---|---|---|---|
| the email they log in to KarmaVerse with | (leave blank) | `owner`, `admin` or `reviewer` | ✔ |

- **reviewer:** can only review submissions.
- **admin / owner:** can do everything: events, tasks, scoring, participants, points, certificates and analytics.

**Share the spreadsheet only with these people**, never with "anyone with the link". It holds students' phone numbers and emails.

### 4. Publish the web app
1. In Apps Script, click **Deploy** (top right) → **New deployment**.
2. Click the gear next to "Select type" → **Web app**.
3. Fill in:
   - Description: `EventHub v1`
   - **Execute as: Me**
   - **Who has access: Anyone**
4. Click **Deploy**, then click **Copy** under **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.
5. Send that URL to the developer. It goes into Netlify as **`EXPO_PUBLIC_EVENTHUB_API`** (Site configuration → Environment variables). It isn't a secret, because the script checks every request itself.

**After any later code change:** go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. Don't create a "New deployment", because that gives you a new URL.

### 5. Check it works
1. Open `<web app URL>?action=events.list` in your browser. You should see `"ok":true` and `"events":[]`, because the challenge is still a draft.
2. Log in to karmaverse.earth with an admin email, then open **karmaverse.earth/admin/events**. You should see the challenge.
3. In **Event settings**, check the dates, upload a banner, then click **Publish**. Open **karmaverse.earth/events** in a private window. The challenge should appear.
4. **Before announcing:** register with a test account, submit Day 1 and a photo task, and approve the photo from **Review**. Check that the points appear on **My events** and that the confirmation email arrived.

---

## Day-to-day for the team

| I want to… | On the web (/admin/events) | Or in the sheet |
|---|---|---|
| Create an event | **New event** → fill in → **Create event** → **Tasks & scoring** → add tasks → **Publish** | Add a row on **Events** (unique Event ID and Slug) and rows on **Tasks** |
| Change dates, text, rules, FAQ | **Event settings** | **Events** tab (FAQ: `Q: …` line, then `A: …` line) |
| Change scoring | **Tasks & scoring**: Points, Quality bonus max, pickup bonus | **Tasks** tab: `Points`, `Quality max`. **Events** tab: `Pickup bonus points` |
| Review a submission | **Review** → pick quality → **Approve**, or write a reason → **Reject** | **Submissions** tab: set **Quality**, then **Status** to `approved`. To reject, type a **Reason** first, then set `rejected`. |
| Approve many at once | **Review** → **Select page** → **Approve selected** (no quality points) | Fill Status down a column |
| Give or remove points | **Participants** → open a person → **Adjust points** (a reason is required) | Don't edit **PointsLedger** by hand; use the web dashboard |
| Remove someone | **Participants** → status **disqualified** | **Registrations** → Status `disqualified` |
| Export | **Participants** → **Registrations CSV** / **Submissions CSV** | File → Download → CSV |
| Certificates | Event settings → tick **Certificates enabled** and set **Who qualifies**. Optional: **Certificates** → **Issue to everyone eligible**. | Same columns on **Events** |
| Override one certificate | **Participants** → Certificate **Always eligible** / **Blocked** | **Registrations** → `Certificate override` |
| Refresh the leaderboard now | **Certificates** tab → **Refresh now** | Menu **EventHub → Refresh leaderboards now** |
| See sheet edits on the site immediately | (automatic) | Menu **EventHub → Clear caches** (otherwise they show within a minute) |

**Don't rename the header row or the tabs.** The script finds columns by their header text. You can add columns, add colours and filters, or move columns around.

### The 7-Day Green Impact Challenge scoring

| | Points |
|---|---|
| Days 1–6, each approved | 10 (60) |
| Day 7 Green Impact Story, approved | 15 |
| Quality bonus, set by the reviewer, up to 5 per day × 7 | up to 35 |
| A **completed** KarmaVerse pickup during the challenge (checked automatically against the participant's real bookings) | 10 |
| **Maximum** | **120** |

Day 1 (the pledge) is **auto-approved**, because it is text only. Untick **Auto approve** on the Tasks tab if you want to review pledges too. Every other day needs a reviewer.

---

## Rules the script enforces
- **Login:** every logged-in action sends the user's KarmaVerse token, which the script checks with `api.karmaverse.earth`. The check is cached for 10 minutes. Tokens are accepted only in POST bodies, never in URLs. No account is ever created here.
- **Roles:** admin actions check the Admins tab on every call. Hiding a button on the website is not the protection.
- **One at a time:** every check-and-write runs under a script-wide lock. That's what keeps registrations, task submissions and certificates to one per person, even with repeated taps.
- **Registration:** name, email, a valid Indian mobile number, college, city and consent are required. Registration respects the open/close dates and Max participants. A referral code counts only if it belongs to someone already registered for the same event, and never your own.
- **Tasks:** a task opens on its day (start date + day − 1). With **Late submissions** on, it stays open until the event ends; otherwise it closes after a day. One active submission per task. After a rejection, the participant can submit again if **Allow resubmit** is ticked; the old row is kept as `superseded`.
- **Uploads:** photos only, up to 5 MB. The website shrinks them to about 0.5 MB first. The script checks the file's real bytes (JPEG, PNG or WEBP), not just its name. Files are stored privately in Drive, named after the uploader. Videos and social posts are submitted as https links.
- **Points:** never sent by the browser. Uploading earns nothing. Points come only from an approval (task points plus quality, capped at the task's maximum), the verified pickup check, or an admin adjustment with a reason. Every change is a new PointsLedger row, so changing a decision corrects the total and never double counts.
- **Leaderboards:** event, daily and overall, from verified points only. Ties go to whoever submitted the work that reached the total first. Public lists show "Priya S.", college and city only, never email, phone or full name. Rankings refresh every 5 minutes.
- **Certificates:** one per person per event. The PDF has the name, event, completion, points, issue date, a certificate ID and a QR code linking to `karmaverse.earth/verify/<ID>`. Revoking one makes the verify page say so.
- **Audit:** every approval, rejection, point adjustment, event or task change, export, certificate action and sheet edit on the key tabs is written to **AuditLog**.
- **No formula injection:** anything a user types is stored as plain text, and CSV exports are protected the same way.
- **Rate limit:** 20 writes per minute per user.

## Limits
| Limit | What it means |
|---|---|
| Writes go one at a time | About 3–5 per second. A rush of a few hundred people in the last hour of a day is fine. Thousands in the same minute would get "We are very busy, try again". |
| 30 requests processed at once | Busy moments show a "try again" message instead of failing silently. Public pages are cached. |
| 10 million cells per spreadsheet | Room for well over 100,000 submissions. Start a fresh copy of the spreadsheet each year. |
| Gmail sends about 1,500 recipients a day | Above that, emails wait on the **MailQueue** tab and go out hourly. |
| Leaderboard every 5 minutes | Not live to the second. |
| Login cache of 10 minutes | Someone who logs out can still act for up to 10 minutes. |
| Photo uploads need a browser | In the mobile app, the photo step links to the website. Text and link tasks work in the app too. |

Above about 20,000 participants in one event, move the backend to a database. The website screens don't need to change.

## What isn't verified yet
- **Pickup bonus:** this reads `GET /api/v1/bookings/my-bookings` with the participant's token. It counts a booking with `status: COMPLETED` whose `completedAt` (or `updatedAt`, `pickupDate` or `scheduledDate`) falls within the event. The response shape is handled flexibly, but **confirm it with one real completed pickup** before launch. If it doesn't match, reviewers can still give the bonus by hand with **Adjust points**.
- **Certificate PDF look:** the PDF is made from HTML by Google's converter. Download one test certificate and check it before enabling certificates for everyone.

---

## For developers
- `npm test` runs the real `.gs` files under Node (`tests/fakes.mjs` fakes Sheets, Drive, Cache, Lock, Mail and the KarmaVerse API). Setting `REVERSE_LOAD=1` loads the files in reverse order, to prove file order doesn't matter, as in Apps Script.
- `node scripts/dev-server.mjs` serves the script at `http://localhost:8787/exec` with in-memory demo data. Any token is treated as a demo admin. Then run the website with `EXPO_PUBLIC_EVENTHUB_API=http://localhost:8787/exec npx expo start --web`. Localhost URLs are accepted only in development builds.
- `npm run build:qr` regenerates `apps-script/Qr.gs` from the MIT-licensed QR encoder vendored in `node_modules/qrcode-terminal`.
- Website code: `src/services/eventhub.ts`, `src/screens/events/`, `src/components/events/EventUI.tsx`. Routes: `EVENTHUB_LINKS` in `src/navigation/RootNavigator.tsx`, plus the matching redirects in `netlify.toml`.

### API
Every response is `{ ok, status, data }` or `{ ok: false, status, message }`. Logged-in calls are POSTs with a `text/plain` JSON body that includes `token`.

| Who | Actions |
|---|---|
| Anyone (GET) | `events.list`, `events.get`, `leaderboard.get` (`slug`, or `overall`; `scope=event\|day`, `day`, `page`, `pageSize`), `certificate.verify` (`id`) |
| Logged in | `register`, `me.dashboard`, `me.event`, `submission.create`, `submission.status`, `pickup.verify`, `certificate.download` |
| Reviewer | `admin.me`, `admin.events`, `admin.event.get`, `admin.queue`, `admin.review`, `admin.review.bulk` |
| Admin / owner | `admin.event.save`, `admin.event.publish`, `admin.task.save`, `admin.categories.save`, `admin.banner.upload`, `admin.participants`, `admin.participant.update`, `admin.export`, `admin.points.adjust`, `admin.ledger`, `admin.leaderboard.rebuild`, `admin.certificates.issue`, `admin.certificate.revoke`, `admin.analytics`, `admin.audit` |
