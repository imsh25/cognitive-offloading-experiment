/**
 * Google Apps Script back end for the "Writing and Information Processing" experiment.
 *
 * Bound to a Google Spreadsheet (Extensions > Apps Script). Deploy as a Web App:
 *   Execute as: Me      |      Who has access: Anyone
 * Participants never sign in to Google and no credentials are present in the web page.
 *
 * Sheets (created automatically):
 *   Participant Demographics | Experimental Responses | Behavioural Log | Topic and Pointers
 *
 * The page sends JSON as text/plain:
 *   { type: 'register' | 'condition' | 'final', participant: {...}, responses: [...], events: [...], topics: [...] }
 * Rows are UPSERTED by key (participant ID, or participant ID + condition) and events are de-duplicated
 * by Event_ID, so retries after network failures never create duplicates or overwrite another condition.
 */

var SHEET_NAMES = {
  demo: 'Participant Demographics',
  resp: 'Experimental Responses',
  log: 'Behavioural Log',
  topics: 'Topic and Pointers'
};

var HEADERS = {
  demo: [
    'Participant_ID', 'Name', 'Age', 'Gender', 'Educational_Qualification', 'Consent_Status',
    'Experiment_Date', 'Experiment_Start_Time', 'Experiment_End_Time', 'Assigned_Sequence',
    'Completion_Status', 'Assignment_Method', 'Device_Info'
  ],
  resp: [
    'Participant_ID', 'Condition', 'Condition_Order', 'Essay_Topic', 'Initial_Marks', 'Framing_Type',
    'Help_Guide_Opened', 'Help_Guide_Open_Time', 'Help_Guide_Close_Time', 'Help_Guide_Duration_Seconds',
    'Essay_Start_Time', 'Essay_Submission_Time', 'Writing_Duration_Seconds', 'Essay_Response',
    'Word_Count', 'Submission_Status', 'Within_Word_Limit', 'Help_Guide_Open_Count',
    'Tab_Switch_Count', 'Total_Hidden_Seconds', 'Topic_ID'
  ],
  log: ['Participant_ID', 'Condition', 'Event_Type', 'Event_Timestamp', 'Event_Details', 'Event_ID'],
  topics: ['Topic_ID', 'Topic_Name', 'Essay_Instruction', 'Pointer_Number', 'Pointer_Content']
};

/** Run once manually from the editor to create the sheets and authorise the script. */
function setup() {
  Object.keys(SHEET_NAMES).forEach(function (k) { getSheet_(k); });
}

function getSheet_(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAMES[key]);
  if (!sh) sh = ss.insertSheet(SHEET_NAMES[key]);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Prevent spreadsheet formula injection from free text.
function clean_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function rowFrom_(headers, obj) {
  return headers.map(function (h) { return clean_(obj[h]); });
}

function doGet() {
  return json_({ ok: true, message: 'Experiment data endpoint is running.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json_({ ok: false, error: 'Server busy, please retry.' });
  }
  try {
    var data = JSON.parse(e.postData.contents);
    var result = { ok: true };

    if (data.type === 'register') {
      result.sequence = register_(data.participant);
      if (data.topics) writeTopics_(data.topics);
    } else {
      if (data.participant) upsertParticipant_(data.participant);
    }
    (data.responses || []).forEach(upsertResponse_);
    appendEvents_(data.events || []);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Finds the (0-based, data-only) index of the row whose key columns match, or -1. */
function findRow_(sh, headers, keyNames, obj) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var idxs = keyNames.map(function (k) { return headers.indexOf(k); });
  var vals = sh.getRange(2, 1, last - 1, headers.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    var match = true;
    for (var j = 0; j < idxs.length; j++) {
      if (String(vals[i][idxs[j]]) !== String(obj[keyNames[j]])) { match = false; break; }
    }
    if (match) return i;
  }
  return -1;
}

/** Assigns the least-used sequence (1-4) so sequences stay balanced; idempotent per participant. */
function register_(p) {
  var sh = getSheet_('demo');
  var H = HEADERS.demo;
  var existing = findRow_(sh, H, ['Participant_ID'], p);
  if (existing > -1) {
    return Number(sh.getRange(existing + 2, H.indexOf('Assigned_Sequence') + 1).getValue()) || 1;
  }
  var counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  var last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, H.indexOf('Assigned_Sequence') + 1, last - 1, 1).getValues().forEach(function (r) {
      var s = Number(r[0]);
      if (counts[s] !== undefined) counts[s]++;
    });
  }
  var best = 1;
  [1, 2, 3, 4].forEach(function (s) { if (counts[s] < counts[best]) best = s; });
  p.Assigned_Sequence = best;
  sh.appendRow(rowFrom_(H, p));
  return best;
}

function upsertParticipant_(p) {
  var sh = getSheet_('demo');
  var H = HEADERS.demo;
  var idx = findRow_(sh, H, ['Participant_ID'], p);
  if (idx === -1) {
    sh.appendRow(rowFrom_(H, p));
    return;
  }
  var range = sh.getRange(idx + 2, 1, 1, H.length);
  var old = range.getValues()[0];
  var merged = H.map(function (h, i) {
    var nv = p[h];
    var keepOld = (nv === undefined || nv === '' || nv === null) || (h === 'Assigned_Sequence' && old[i] !== '');
    return keepOld ? old[i] : clean_(nv);
  });
  range.setValues([merged]);
}

function upsertResponse_(r) {
  var sh = getSheet_('resp');
  var H = HEADERS.resp;
  var idx = findRow_(sh, H, ['Participant_ID', 'Condition'], r);
  var row = rowFrom_(H, r);
  if (idx === -1) sh.appendRow(row);
  else sh.getRange(idx + 2, 1, 1, H.length).setValues([row]); // identical data on a retry
}

function appendEvents_(events) {
  if (!events.length) return;
  var sh = getSheet_('log');
  var H = HEADERS.log;
  var idCol = H.indexOf('Event_ID') + 1;
  var seen = {};
  var last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, idCol, last - 1, 1).getValues().forEach(function (r) { seen[r[0]] = true; });
  }
  var rows = [];
  events.forEach(function (ev) {
    if (!seen[ev.Event_ID]) { rows.push(rowFrom_(H, ev)); seen[ev.Event_ID] = true; }
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, H.length).setValues(rows);
}

/** Reference list of the exact topics and pointers shown to participants (written once). */
function writeTopics_(topics) {
  var sh = getSheet_('topics');
  if (sh.getLastRow() > 1) return;
  var H = HEADERS.topics;
  var rows = topics.map(function (t) { return rowFrom_(H, t); });
  if (rows.length) sh.getRange(2, 1, rows.length, H.length).setValues(rows);
}
