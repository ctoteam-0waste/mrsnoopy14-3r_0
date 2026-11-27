/**
 * KarmaVerse EventHub: Google Sheets + Apps Script backend.
 * One spreadsheet holds every event; each row carries its Event ID.
 *
 * Optional Script Properties (Project Settings > Script properties):
 *   API_BASE   default https://api.karmaverse.earth  (login + pickup verification)
 *   SITE_URL   default https://karmaverse.earth      (links in emails and certificates)
 * Set automatically by setupEventHub(): SPREADSHEET_ID, SUBMISSIONS_FOLDER_ID,
 * BANNERS_FOLDER_ID, CERTIFICATES_FOLDER_ID.
 */

var MB = 1024 * 1024;
var DAY_MS = 24 * 60 * 60 * 1000;

var CONFIG = {
  WRITES_PER_MINUTE: 20,
  AUTH_CACHE_SECONDS: 600,
  EVENTS_CACHE_SECONDS: 60,
  LEADERBOARD_CACHE_SECONDS: 900,
  LEADERBOARD_CACHE_ROWS: 500,
  PAGE_SIZE_MAX: 50,
  TEXT_MAX: 3000,
  TEXT_ONLY_MIN: 30,
  LINK_MAX: 500,
  REASON_MAX: 300,
  ADJUST_MAX: 200,
  IMAGE_MAX_BYTES: 5 * MB,
  BANNER_MAX_BYTES: 5 * MB,
  CERT_BATCH_SECONDS: 240,
  TIME_ZONE: 'Asia/Kolkata',
  SUBMISSION_STATUSES: ['pending', 'approved', 'rejected', 'superseded'],
  ACCEPTS: ['text', 'image', 'link'],
  BONUS_RULES: ['', 'karmaverse_pickup'],
};

/**
 * Tab layouts. The script finds columns by their header text, so the team can
 * widen, colour or move columns, but must not rename the headers or the tabs.
 */
var TABS = {
  SETTINGS: { name: 'Settings', headers: ['Setting', 'Value', 'Notes'] },
  CATEGORIES: { name: 'Categories', headers: ['Category', 'Order', 'Active'] },
  EVENTS: {
    name: 'Events',
    headers: ['Event ID', 'Slug', 'Title', 'Category', 'Published', 'Featured', 'Short description', 'Banner URL',
      'Overview', 'Objectives', 'Eligibility', 'Rules', 'Rewards', 'FAQ', 'Audience', 'Registration fee',
      'Starts at', 'Ends at', 'Registration opens', 'Registration closes', 'Max participants',
      'Late submissions', 'Pickup bonus points', 'Certificates enabled', 'Certificate rule',
      'Created at', 'Updated at'],
  },
  TASKS: {
    name: 'Tasks',
    headers: ['Task ID', 'Event ID', 'Day', 'Title', 'Instructions', 'Accepts', 'Points', 'Quality max',
      'Auto approve', 'Allow resubmit', 'Opens at', 'Closes at', 'Bonus rule', 'Active'],
  },
  REGISTRATIONS: {
    name: 'Registrations',
    headers: ['Registered at', 'Registration ID', 'Event ID', 'User ID', 'Name', 'Email', 'Phone', 'College',
      'City', 'KarmaVerse referral code', 'Referred by code', 'Referred by user ID', 'Consent', 'Status',
      'Certificate override', 'Source'],
  },
  SUBMISSIONS: {
    name: 'Submissions',
    headers: ['Submitted at', 'Submission ID', 'Event ID', 'Task ID', 'Day', 'User ID', 'Name', 'College',
      'Text', 'Link', 'Link type', 'File', 'Drive file ID', 'Status', 'Quality', 'Points', 'Reason',
      'Reviewed by', 'Reviewed at', 'Attempt'],
  },
  LEDGER: {
    name: 'PointsLedger',
    headers: ['Created at', 'Txn ID', 'Event ID', 'User ID', 'Day', 'Source', 'Ref ID', 'Points', 'Earned at',
      'Reason', 'By'],
  },
  LEADERBOARD: {
    name: 'Leaderboard',
    headers: ['Event ID', 'Scope', 'Rank', 'User ID', 'Name', 'College', 'City', 'Points', 'Reached at', 'Updated at'],
  },
  CERTIFICATES: {
    name: 'Certificates',
    headers: ['Issued at', 'Certificate ID', 'Event ID', 'User ID', 'Name', 'Event title', 'Completion', 'Points',
      'Drive file ID', 'Revoked', 'Revoked reason'],
  },
  AUDIT: { name: 'AuditLog', headers: ['At', 'Log ID', 'By', 'Action', 'Entity', 'Entity ID', 'Before', 'After', 'Note'] },
  ADMINS: { name: 'Admins', headers: ['Email', 'User ID', 'Role', 'Active', 'Notes'] },
  MAIL_QUEUE: { name: 'MailQueue', headers: ['Queued at', 'To', 'Subject', 'Body', 'Sent at', 'Error'] },
};

/** Columns that hold IDs or phone numbers: formatted as plain text so Sheets never reformats them. */
var TEXT_COLUMNS = ['Event ID', 'Task ID', 'Registration ID', 'User ID', 'Submission ID', 'Txn ID', 'Ref ID',
  'Certificate ID', 'Phone', 'Drive file ID', 'Log ID', 'Slug'];

function prop_(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v === null || v === undefined || v === '' ? fallback : v;
}

function apiBase_() {
  return String(prop_('API_BASE', 'https://api.karmaverse.earth')).replace(/\/+$/, '');
}

function siteUrl_() {
  return String(prop_('SITE_URL', 'https://karmaverse.earth')).replace(/\/+$/, '');
}
