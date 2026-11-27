import { Platform } from 'react-native';
import { getToken } from '../utils/tokenStore';

// EventHub runs on a Google Sheets + Apps Script backend (eventhub-sheets/). Its web
// app URL is set per build in EXPO_PUBLIC_EVENTHUB_API. Without it, every screen shows
// a clear "not connected" state instead of fake data.
export const EVENTHUB_API = (process.env.EXPO_PUBLIC_EVENTHUB_API || '').trim();
export const eventHubConfigured = () =>
  /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(EVENTHUB_API) ||
  // Local dev server (eventhub-sheets/scripts/dev-server.mjs), development builds only.
  (__DEV__ && /^http:\/\/localhost:\d+\/exec$/.test(EVENTHUB_API));

export class EventHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const isLoginError = (e: unknown) => e instanceof EventHubError && e.status === 401;

async function parse(res: Response) {
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new EventHubError('EventHub sent an unexpected reply. Please try again.', 502);
  }
  if (!json || json.ok !== true) throw new EventHubError(json?.message || 'Something went wrong. Please try again.', json?.status || 500);
  return json.data;
}

function ensureConfigured() {
  if (!eventHubConfigured()) throw new EventHubError('EventHub is not connected yet. Please check back soon.', 503);
}

async function request(init: () => Promise<Response>) {
  ensureConfigured();
  let res: Response;
  try {
    res = await init();
  } catch {
    throw new EventHubError("Couldn't reach EventHub. Check your connection and try again.", 0);
  }
  return parse(res);
}

/** Public read (no login). */
export function ehGet<T = any>(action: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const q = new URLSearchParams({ action });
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  return request(() => fetch(`${EVENTHUB_API}?${q.toString()}`, { method: 'GET' }));
}

/**
 * Logged-in call. The login token goes in the POST body (text/plain avoids a CORS
 * preflight Apps Script can't answer) and never in a URL.
 */
export async function ehPost<T = any>(action: string, body: Record<string, any> = {}): Promise<T> {
  const token = await getToken().catch(() => null);
  if (!token || token === 'undefined' || token === 'null') throw new EventHubError('Please log in to continue.', 401);
  return request(() => fetch(EVENTHUB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, action, token }),
  }));
}

export async function hasLogin() {
  const t = await getToken().catch(() => null);
  return !!t && t !== 'undefined' && t !== 'null';
}

// ── types ────────────────────────────────────────────────────────────────────

export type EventStatus = 'upcoming' | 'live' | 'completed';
export type RegistrationState = 'open' | 'not_yet' | 'closed' | 'full';
export type Accepts = 'text' | 'image' | 'link';

export type EventCard = {
  id: string; slug: string; title: string; category: string; summary: string; bannerUrl: string; featured: boolean;
  startAt: string; endAt: string; durationDays: number; regClosesAt: string; participants: number;
  status: EventStatus; registration: RegistrationState; fee: string; published?: boolean;
};

export type PublicTask = {
  id: string; day: number; title: string; instructions: string; accepts: Accepts[]; points: number; qualityMax: number;
  bonus: number; bonusRule: string; opensAt: string; closesAt: string; state: 'locked' | 'open' | 'closed';
};

export type EventDetail = EventCard & {
  overview: string; objectives: string[]; eligibility: string[]; rules: string[]; rewards: string[];
  faq: { q: string; a: string }[]; audience: string; regOpensAt: string | null; maxParticipants: number;
  lateSubmissions: boolean; pickupBonus: number; certificatesEnabled: boolean; maxScore: number; tasks: PublicTask[]; url: string;
};

export type MySubmission = {
  id: string; submittedAt: string; status: 'pending' | 'approved' | 'rejected'; text: string; link: string;
  hasImage: boolean; reason: string; points: number; attempt: number;
};

export type MyTask = PublicTask & { submission: MySubmission | null; canSubmit: boolean };

export type Points = { total: number; tasks: number; quality: number; bonus: number; adjustments: number };

export type CertificateState = { enabled: boolean; eligible: boolean; requirement: string; issued: boolean; certificateId: string; verifyUrl: string };

export type MyEvent =
  | { registered: false; profile: { name: string; email: string; phone: string; city: string } }
  | {
      registered: boolean; event: EventCard; registration: { id: string; registeredAt: string; name: string; college: string; city: string; status: string; referralCode: string };
      tasks: MyTask[]; points: Points; maxScore: number; approvedTasks: number; pendingTasks: number; totalTasks: number;
      rank: number | null; pickupBonus: { available: boolean; verified: boolean; points: number }; certificate: CertificateState;
    };

export type DashboardItem = {
  event: EventCard; registration: { registeredAt: string; college: string }; points: number; maxScore: number;
  approvedTasks: number; pendingTasks: number; totalTasks: number; rank: number | null;
  openTasks: { id: string; day: number; title: string; closesAt: string }[];
  pendingSubmissions: { day: number; title: string; submittedAt: string }[];
  rejectedSubmissions: { day: number; title: string; reason: string; canResubmit: boolean }[];
  certificate: CertificateState;
};

export type Dashboard = {
  totals: { events: number; points: number; approvedTasks: number; pendingSubmissions: number; certificates: number; overallRank: number | null };
  active: DashboardItem[]; history: DashboardItem[];
};

export type LeaderboardPage = {
  event: { slug: string; title: string; days: number[] } | null; scope: string; page: number; pageSize: number;
  total: number; pages: number; rows: { rank: number; name: string; college: string; city: string; points: number }[]; updatedAt: string;
};

// ── API ──────────────────────────────────────────────────────────────────────

export const eventHub = {
  list: () => ehGet<{ events: EventCard[]; categories: string[] }>('events.list'),
  get: (slug: string) => ehGet<EventDetail>('events.get', { slug }),
  leaderboard: (slug: string, scope: 'event' | 'day' | 'overall', day?: number, page = 1) =>
    ehGet<LeaderboardPage>('leaderboard.get', { slug: scope === 'overall' ? 'overall' : slug, scope: scope === 'day' ? 'day' : 'event', day, page, pageSize: 20 }),
  verify: (id: string) => ehGet<{ certificateId: string; valid: boolean; revoked: boolean; name: string; eventTitle: string; eventSlug: string; completion: string; issuedAt: string }>('certificate.verify', { id }),
  me: (slug: string) => ehPost<MyEvent>('me.event', { slug }),
  dashboard: () => ehPost<Dashboard>('me.dashboard'),
  register: (slug: string, form: { name: string; email: string; phone: string; college: string; city: string; referralCode?: string; consent: boolean; source?: string }) =>
    ehPost<{ alreadyRegistered: boolean; emailQueued?: boolean; registration: { id: string } }>('register', { slug, ...form }),
  submit: (slug: string, taskId: string, data: { text?: string; link?: string; imageBase64?: string }) =>
    ehPost<{ submission: MySubmission; pickupBonus?: { verified: boolean; points: number; message?: string } }>('submission.create', { slug, taskId, ...data }),
  verifyPickup: (slug: string) => ehPost<{ verified: boolean; points: number; message?: string; already?: boolean }>('pickup.verify', { slug }),
  certificate: (slug: string) => ehPost<{ certificateId: string; verifyUrl: string; fileName: string; pdfBase64: string }>('certificate.download', { slug }),
};

// ── admin ────────────────────────────────────────────────────────────────────
// Every admin action is checked on the server against the Admins tab of the sheet;
// hiding a button here is only a convenience.

export type AdminEvent = {
  id: string; slug: string; title: string; category: string; published: boolean; featured: boolean; summary: string; bannerUrl: string;
  overview: string; objectives: string[]; eligibility: string[]; rules: string[]; rewards: string[]; faq: { q: string; a: string }[];
  audience: string; fee: string; startAt: string; endAt: string; regOpensAt: string | null; regClosesAt: string | null;
  maxParticipants: number; lateSubmissions: boolean; pickupBonus: number; certificatesEnabled: boolean; certificateRule: string;
};

export type AdminTask = {
  id?: string; eventId: string; day: number; title: string; instructions: string; accepts: Accepts[]; points: number; qualityMax: number;
  autoApprove: boolean; allowResubmit: boolean; opensAt: string | null; closesAt: string | null; bonusRule: string; active: boolean;
};

export type QueueItem = {
  id: string; submittedAt: string; day: number; taskTitle: string; qualityMax: number; points: number; name: string; college: string;
  text: string; link: string; linkType: string; fileUrl: string; thumbnail: string; status: string; quality: number | null; reason: string; attempt: number;
};

export type Participant = {
  registrationId: string; userId: string; registeredAt: string; name: string; email: string; phone: string; college: string; city: string;
  referredByCode: string; status: string; certificateOverride: string; points: number;
};

export type Analytics = {
  event: { id: string; title: string; status: EventStatus };
  totals: { registrations: number; activeParticipants: number; submissions: number; pending: number; approved: number; rejected: number;
    approvalRate: number | null; completionRate: number | null; completedAllTasks: number; metCertificateRule: number; referredRegistrations: number };
  dailyRegistrations: { date: string; count: number }[];
  taskCompletion: { day: number; title: string; submitted: number; approved: number; rejected: number; pending: number }[];
  colleges: { college: string; registrations: number; active: number }[];
  referrals: { referrer: string; code: string; registrations: number; active: number }[];
};

export const eventHubAdmin = {
  me: () => ehPost<{ role: 'reviewer' | 'admin' | 'owner'; name: string; email: string }>('admin.me'),
  events: () => ehPost<{ events: (EventCard & { published: boolean })[]; categories: string[] }>('admin.events'),
  event: (eventId: string) => ehPost<{ event: AdminEvent; tasks: AdminTask[]; maxScore: number }>('admin.event.get', { eventId }),
  saveEvent: (event: Partial<AdminEvent>) => ehPost<{ event: AdminEvent; tasks: AdminTask[]; maxScore: number }>('admin.event.save', { event }),
  publish: (eventId: string, published: boolean) => ehPost('admin.event.publish', { eventId, published }),
  saveTask: (task: AdminTask) => ehPost<{ taskId: string; tasks: AdminTask[]; maxScore: number }>('admin.task.save', { task }),
  saveCategories: (categories: string[]) => ehPost<{ categories: string[] }>('admin.categories.save', { categories }),
  uploadBanner: (imageBase64: string) => ehPost<{ url: string }>('admin.banner.upload', { imageBase64 }),
  queue: (eventId: string, status: string, day: number, page: number) => ehPost<{ total: number; page: number; pages: number; rows: QueueItem[] }>('admin.queue', { eventId, status, day: day || undefined, page }),
  review: (submissionId: string, decision: 'approved' | 'rejected' | 'pending', quality?: number, reason?: string) => ehPost('admin.review', { submissionId, decision, quality, reason }),
  bulkApprove: (submissionIds: string[]) => ehPost<{ approved: number; failed: { id: string; message: string }[] }>('admin.review.bulk', { submissionIds }),
  participants: (eventId: string, q: string, page: number) => ehPost<{ total: number; page: number; pages: number; rows: Participant[] }>('admin.participants', { eventId, q, page }),
  updateParticipant: (eventId: string, userId: string, changes: { status?: string; certificateOverride?: string }) => ehPost<Participant>('admin.participant.update', { eventId, userId, ...changes }),
  exportCsv: (eventId: string, kind: 'registrations' | 'submissions') => ehPost<{ fileName: string; csv: string; rows: number }>('admin.export', { eventId, kind }),
  adjust: (eventId: string, userId: string, points: number, reason: string) => ehPost<{ total: number }>('admin.points.adjust', { eventId, userId, points, reason }),
  ledger: (eventId: string, userId: string) => ehPost<{ total: number; rows: { at: string; source: string; points: number; day: number | string; reason: string; by: string }[] }>('admin.ledger', { eventId, userId }),
  rebuildLeaderboard: () => ehPost<{ scopes: number }>('admin.leaderboard.rebuild'),
  issueCertificates: (eventId: string) => ehPost<{ issued: number; notEligible: number; remaining: number; alreadyIssued: number }>('admin.certificates.issue', { eventId }),
  revokeCertificate: (certificateId: string, reason: string) => ehPost('admin.certificate.revoke', { certificateId, reason }),
  analytics: (eventId: string) => ehPost<Analytics>('admin.analytics', { eventId }),
  audit: () => ehPost<{ at: string; by: string; action: string; entity: string; entityId: string; note: string }[]>('admin.audit'),
};

// ── files (web) ──────────────────────────────────────────────────────────────

/** Opens the browser's file picker for one image. Resolves null if cancelled. */
export function pickImageFile(): Promise<File | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

/**
 * Shrinks a photo in the browser to at most 1600px on its longest side and re-encodes
 * it as JPEG (about 0.3–0.6 MB), so uploads are quick and Drive storage stays small.
 * Returns base64 without the data: prefix, plus a preview URL.
 */
export async function compressImage(file: File, maxSide = 1600): Promise<{ base64: string; previewUrl: string; bytes: number }> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new EventHubError('Choose a JPG, PNG or WEBP photo.', 400);
  if (file.size > 25 * 1024 * 1024) throw new EventHubError('That photo is too large. Choose one under 25 MB.', 400);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new EventHubError('That file could not be opened as a photo.', 400));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new EventHubError('Your browser could not prepare the photo.', 400);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length * 0.75 > 1.5 * 1024 * 1024 && quality > 0.5) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    const base64 = dataUrl.split(',')[1] || '';
    return { base64, previewUrl: dataUrl, bytes: Math.round(base64.length * 0.75) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Saves a file the backend returned as base64 (certificate PDFs, CSV exports). Web only. */
export function downloadBase64(fileName: string, mime: string, base64: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return downloadBlob(fileName, new Blob([bytes], { type: mime }));
}

export function downloadText(fileName: string, mime: string, text: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  return downloadBlob(fileName, new Blob([text], { type: mime }));
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// ── formatting ───────────────────────────────────────────────────────────────

const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };

export function fmtDate(iso?: string | null, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { ...IST, day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) });
}

export function fmtRange(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  return `${left} – ${fmtDate(end)}`;
}

export const STATUS_LABEL: Record<EventStatus, string> = { live: 'Live now', upcoming: 'Upcoming', completed: 'Completed' };
