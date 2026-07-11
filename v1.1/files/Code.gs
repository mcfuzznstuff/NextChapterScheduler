/**
 * NextChapter Schedule Builder — Apps Script backend
 * ---------------------------------------------------
 * Deploy this as a Web App (Deploy > New deployment > Web app,
 * execute as "Me", access "Anyone"). Paste the resulting URL into
 * CONFIG.APPS_SCRIPT_URL near the top of app.js.
 *
 * ONE-TIME SETUP (see README.md for full steps):
 * 1. Create a Google Sheet. Add two tabs named exactly: Classes, SavedSchedules
 * 2. Extensions > Apps Script, paste this file in as Code.gs
 * 3. Project Settings > Script Properties > add STAFF_PASSWORD = <your shared password>
 * 4. Deploy as a Web App, copy the URL into app.js
 *
 * No student names or identifying info are ever written to this sheet.
 * SavedSchedules rows are keyed by a random fun code, not a person.
 */

const CLASSES_SHEET = 'Classes';
const SAVED_SHEET = 'SavedSchedules';
const CLASS_FIELDS = ['id','title','tags','day','startTime','endTime','format','intensity','location','instructor','notes','skipDates','canceled'];

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'classes') {
      return jsonOut({ ok: true, classes: readClasses() });
    }
    if (action === 'getSchedule') {
      const code = (e.parameter.code || '').trim();
      const row = findSavedRow(code);
      if (!row) return jsonOut({ ok: false, error: 'No saved schedule found for that code.' });
      return jsonOut({ ok: true, docUrl: row.docUrl, sheetUrl: row.sheetUrl, createdAt: row.createdAt });
    }
    return jsonOut({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'verifyPassword') {
      return jsonOut({ ok: checkPassword(body.password) });
    }

    if (action === 'saveClasses') {
      if (!checkPassword(body.password)) {
        return jsonOut({ ok: false, error: 'Incorrect staff password.' });
      }
      writeClasses(body.classes || []);
      return jsonOut({ ok: true });
    }

    if (action === 'createExport') {
      const result = createExport(body);
      return jsonOut({ ok: true, code: result.code, docUrl: result.docUrl, sheetUrl: result.sheetUrl });
    }

    return jsonOut({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function checkPassword(pw) {
  const stored = PropertiesService.getScriptProperties().getProperty('STAFF_PASSWORD');
  return !!stored && pw === stored;
}

/* ---------------- Classes sheet read/write ---------------- */

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function readClasses() {
  const sh = getSheet(CLASSES_SHEET);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  return values.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = r[i]; });
    obj.tags = obj.tags ? String(obj.tags).split(',').map(t => t.trim()).filter(Boolean) : [];
    obj.canceled = obj.canceled === true || obj.canceled === 'TRUE';
    return obj;
  });
}

function writeClasses(list) {
  const sh = getSheet(CLASSES_SHEET);
  sh.clear();
  sh.appendRow(CLASS_FIELDS);
  const rows = list.map(w => CLASS_FIELDS.map(f => {
    if (f === 'tags') return (w.tags || []).join(',');
    return w[f] !== undefined ? w[f] : '';
  }));
  if (rows.length) sh.getRange(2, 1, rows.length, CLASS_FIELDS.length).setValues(rows);
}

/* ---------------- Saved schedules (fun codes) ---------------- */

function findSavedRow(code) {
  const sh = getSheet(SAVED_SHEET);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === code) {
      return { code: values[i][0], createdAt: values[i][1], docUrl: values[i][2], sheetUrl: values[i][3] };
    }
  }
  return null;
}

function saveRow(code, docUrl, sheetUrl) {
  const sh = getSheet(SAVED_SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(['code', 'createdAt', 'docUrl', 'sheetUrl']);
  sh.appendRow([code, new Date().toISOString(), docUrl || '', sheetUrl || '']);
}

function generateFunCode() {
  const emojis = ['🦊','🌻','🐢','🦋','🌈','🐨','🦉','🐬','🌸','⭐','🍀','🌙','🐝','🦜','🌊'];
  const adjectives = ['Bold','Sunny','Swift','Gentle','Bright','Calm','Cheerful','Brave','Clever','Kind','Merry','Cozy','Lively','Radiant','Breezy'];
  const animals = ['Otter','Fox','Falcon','Panda','Dolphin','Heron','Rabbit','Badger','Sparrow','Turtle','Koala','Lynx','Robin','Wren','Seal'];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${pick(emojis)} ${pick(adjectives)}-${pick(animals)}-${num}`;
}

/* ---------------- Export creation (Doc + Sheet) ---------------- */

function createExport(body) {
  // body: { weeks: [{ label, items: [{day,date,start,end,title,formatLoc,note}] }], wantDoc, wantSheet, existingCode }
  const code = body.existingCode || generateFunCode();
  let docUrl = '', sheetUrl = '';

  if (body.wantDoc) {
    const doc = DocumentApp.create('NextChapter Schedule — ' + code);
    const body_ = doc.getBody();
    body_.appendParagraph('My NextChapter Schedule').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body_.appendParagraph('Code: ' + code).setItalic(true);
    (body.weeks || []).forEach(week => {
      body_.appendParagraph(week.label).setHeading(DocumentApp.ParagraphHeading.HEADING2);
      week.items.forEach(item => {
        const line = `${item.day}, ${item.date} | ${item.start}–${item.end} | ${item.title} (${item.formatLoc})${item.note ? ' — ' + item.note : ''}`;
        body_.appendListItem(line).setGlyphType(DocumentApp.GlyphType.BULLET);
      });
    });
    doc.saveAndClose();
    DriveApp.getFileById(doc.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    docUrl = doc.getUrl();
  }

  if (body.wantSheet) {
    const ss = SpreadsheetApp.create('NextChapter Schedule — ' + code);
    const sheet = ss.getActiveSheet();
    sheet.appendRow(['Week', 'Day', 'Date', 'Start', 'End', 'Class', 'Location/Format', 'Note', 'Attended?']);
    let r = 2;
    (body.weeks || []).forEach(week => {
      week.items.forEach(item => {
        sheet.appendRow([week.label, item.day, item.date, item.start, item.end, item.title, item.formatLoc, item.note || '', false]);
        r++;
      });
    });
    if (r > 2) sheet.getRange(2, 9, r - 2, 1).insertCheckboxes();
    sheet.autoResizeColumns(1, 9);
    DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    sheetUrl = ss.getUrl();
  }

  saveRow(code, docUrl, sheetUrl);
  return { code, docUrl, sheetUrl };
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
