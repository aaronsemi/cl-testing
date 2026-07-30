/**
 * Basketball Club Tryouts & Camps — automated updater
 * ---------------------------------------------------
 * Reads the "Club Sources" tab, fetches each club's public website /
 * registration page, scans it for tryout & camp mentions with dates, and
 * appends any NEW candidates to the "Club Tryouts" / "Club Camps" tabs.
 *
 * WHY THIS RUNS IN GOOGLE (not on a scraper you host):
 *   UrlFetchApp runs from Google's servers, which can reach these club
 *   sites directly. It never touches Instagram (that's login-walled) — it
 *   reads the public websites the clubs link in their IG bios.
 *
 * SETUP (one time):
 *   1. Open the Sheet ▸ Extensions ▸ Apps Script.
 *   2. Paste this file in, Save.
 *   3. Run `setupDailyTrigger` once (authorize when prompted).
 *   4. Fill in the Website / Registration URLs on the "Club Sources" tab.
 *
 * WHAT IT DOES / DOESN'T DO:
 *   - It is a best-effort ASSISTANT, not a perfect parser. Every site is
 *     laid out differently, so it flags candidate rows with Status = "REVIEW"
 *     and the source link, for you to confirm. It never overwrites rows you've
 *     edited, and it de-dupes so the same event isn't added twice.
 *   - Tune EXTRACTION keywords/patterns below, or add a per-club override in
 *     CLUB_PARSERS, to sharpen results for a specific site.
 */

// ----- Tab + column config (must match the workbook) -----------------------
const SHEETS = {
  sources: 'Club Sources',
  tryouts: 'Club Tryouts',
  camps: 'Club Camps',
};

// Column order on Club Tryouts (1-indexed): see workbook headers.
const TRYOUT_COLS = {
  club: 1, level: 2, start: 3, end: 4, city: 5, state: 6, venue: 7,
  cost: 8, link: 9, status: 10, notes: 11, updated: 12,
};
const CAMP_COLS = {
  club: 1, name: 2, type: 3, ages: 4, start: 5, end: 6, city: 7, state: 8,
  venue: 9, cost: 10, link: 11, status: 12, notes: 13, updated: 14,
};

// Keywords that mark a passage as a tryout vs a camp.
const TRYOUT_WORDS = /\b(try ?outs?|evaluations?|id session|player id|assessment|combine)\b/i;
const CAMP_WORDS = /\b(camps?|clinics?|skills? (session|academy)|day camp|winter break|spring break|summer program)\b/i;

// ---------------------------------------------------------------------------
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshBasketballUpdates') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshBasketballUpdates')
    .timeBased().everyDays(1).atHour(6).create();
  SpreadsheetApp.getActive().toast('Daily auto-update scheduled for ~6am.');
}

/** Main entry point — run by the daily trigger (or manually to test). */
function refreshBasketballUpdates() {
  const ss = SpreadsheetApp.getActive();
  const sources = readSources_(ss);
  let added = 0;

  sources.forEach(function (src) {
    if (!src.auto || !src.url) return;
    let html;
    try {
      html = UrlFetchApp.fetch(src.url, {
        muteHttpExceptions: true,
        followRedirects: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SheetUpdater/1.0)' },
      }).getContentText();
    } catch (e) {
      Logger.log('Fetch failed for ' + src.club + ' (' + src.url + '): ' + e);
      return;
    }
    const text = htmlToText_(html);
    const events = extractEvents_(text, src);
    events.forEach(function (ev) {
      if (ev.kind === 'camp') added += upsertCamp_(ss, ev);
      else added += upsertTryout_(ss, ev);
    });
  });

  ss.toast(added + ' new tryout/camp candidate row(s) added. Check Status = REVIEW.');
  Logger.log('Done. Added ' + added + ' rows.');
}

// ----- Read the Club Sources tab -------------------------------------------
function readSources_(ss) {
  const sh = ss.getSheetByName(SHEETS.sources);
  const values = sh.getDataRange().getValues();
  // Header is on row 4 (index 3); data starts row 5.
  const out = [];
  for (let r = 4; r < values.length; r++) {
    const row = values[r];
    const club = String(row[0] || '').trim();
    if (!club) continue;
    const website = String(row[1] || '').trim();
    const reg = String(row[2] || '').trim();
    out.push({
      club: club,
      url: reg || website,        // prefer the registration page
      website: website,
      city: String(row[4] || '').trim() || 'Vancouver',
      auto: /^y/i.test(String(row[5] || '')),
    });
  }
  return out;
}

// ----- Very small HTML → text ----------------------------------------------
function htmlToText_(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#39;|&rsquo;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ----- Find tryout/camp passages that contain a date -----------------------
// Recognizes: "March 5, 2026", "Mar 5", "2026-03-05", "03/05/2026", "Mar 30 – Jun 15".
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_RE = new RegExp(
  '(' + MONTH + '\\.?\\s+\\d{1,2}(?:\\s*[–-]\\s*(?:' + MONTH + '\\s+)?\\d{1,2})?(?:,?\\s*\\d{4})?' +
  '|\\d{4}-\\d{2}-\\d{2}' +
  '|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})', 'i');

function extractEvents_(text, src) {
  const events = [];
  // Split into sentence-ish chunks so a date stays near its context.
  const chunks = text.split(/(?<=[.!?])\s+|(?=\b(?:try ?out|evaluation|camp|clinic|id session)\b)/i);
  const seen = {};
  chunks.forEach(function (chunk) {
    const dateM = chunk.match(DATE_RE);
    if (!dateM) return;
    const isTry = TRYOUT_WORDS.test(chunk);
    const isCamp = CAMP_WORDS.test(chunk);
    if (!isTry && !isCamp) return;
    const kind = isCamp && !isTry ? 'camp' : 'tryout';
    const date = normalizeDate_(dateM[1]);
    const key = kind + '|' + date;
    if (seen[key]) return;
    seen[key] = true;
    events.push({
      kind: kind,
      club: src.club,
      city: src.city,
      start: date,
      link: src.url,
      notes: 'Auto-found: "' + chunk.slice(0, 140).trim() + '"',
    });
  });
  return events;
}

function normalizeDate_(s) {
  s = s.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  return s; // keep human-readable form; a person confirms it on REVIEW.
}

// ----- Upsert helpers (de-dupe by club + start date) -----------------------
function upsertTryout_(ss, ev) {
  const sh = ss.getSheetByName(SHEETS.tryouts);
  if (rowExists_(sh, TRYOUT_COLS.club, TRYOUT_COLS.start, ev.club, ev.start)) return 0;
  const row = firstEmptyRow_(sh, 4);
  sh.getRange(row, TRYOUT_COLS.club).setValue(ev.club);
  sh.getRange(row, TRYOUT_COLS.start).setValue(ev.start);
  sh.getRange(row, TRYOUT_COLS.city).setValue(ev.city);
  sh.getRange(row, TRYOUT_COLS.state).setValue('BC');
  sh.getRange(row, TRYOUT_COLS.link).setValue(ev.link);
  sh.getRange(row, TRYOUT_COLS.status).setValue('REVIEW');
  sh.getRange(row, TRYOUT_COLS.notes).setValue(ev.notes);
  sh.getRange(row, TRYOUT_COLS.updated).setValue(new Date());
  return 1;
}

function upsertCamp_(ss, ev) {
  const sh = ss.getSheetByName(SHEETS.camps);
  if (rowExists_(sh, CAMP_COLS.club, CAMP_COLS.start, ev.club, ev.start)) return 0;
  const row = firstEmptyRow_(sh, 4);
  sh.getRange(row, CAMP_COLS.club).setValue(ev.club);
  sh.getRange(row, CAMP_COLS.start).setValue(ev.start);
  sh.getRange(row, CAMP_COLS.city).setValue(ev.city);
  sh.getRange(row, CAMP_COLS.state).setValue('BC');
  sh.getRange(row, CAMP_COLS.link).setValue(ev.link);
  sh.getRange(row, CAMP_COLS.status).setValue('REVIEW');
  sh.getRange(row, CAMP_COLS.notes).setValue(ev.notes);
  sh.getRange(row, CAMP_COLS.updated).setValue(new Date());
  return 1;
}

function rowExists_(sh, clubCol, startCol, club, start) {
  const values = sh.getDataRange().getValues();
  for (let r = 3; r < values.length; r++) {
    if (String(values[r][clubCol - 1]).trim() === club &&
        String(values[r][startCol - 1]).trim() === String(start).trim()) return true;
  }
  return false;
}

function firstEmptyRow_(sh, headerRow) {
  const values = sh.getDataRange().getValues();
  for (let r = headerRow; r < values.length; r++) {
    if (!String(values[r][0]).trim()) return r + 1;
  }
  return values.length + 1;
}
