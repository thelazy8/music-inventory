/**
 * Code.gs - Google Apps Script Backend with 2-Tier PIN Auth & Volunteer Attribution
 */

const TAB_ROSTER = 'Roster';
const TAB_INSTRUMENTS = 'Instruments';
const TAB_SCAN_LOG = 'Scan_Log';
const TAB_SETTINGS = 'Settings';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎺 Music Inventory Admin')
    .addItem('🛠️ Initialize / Verify Tabs, PINs & Columns', 'setupDatabaseTabs')
    .addSeparator()
    .addItem('📦 Archive Current School Year / Semester', 'archiveSchoolYearPrompt')
    .addToUi();
}

function setupDatabaseTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Verify Roster Tab
  let rosterSheet = ss.getSheetByName(TAB_ROSTER);
  if (!rosterSheet) {
    rosterSheet = ss.getSheets()[0];
    rosterSheet.setName(TAB_ROSTER);
  }
  const rHeaders = rosterSheet.getRange(1, 1, 1, rosterSheet.getLastColumn() || 6).getValues()[0];
  if (rHeaders.indexOf('Student_ID') === -1) {
    rosterSheet.getRange(1, rHeaders.length + 1).setValue('Student_ID');
  }

  // 2. Verify Instruments Tab
  let instSheet = ss.getSheetByName(TAB_INSTRUMENTS);
  if (!instSheet) {
    instSheet = ss.insertSheet(TAB_INSTRUMENTS);
    instSheet.appendRow(['Ensemble', 'Section', 'Case_ID', 'Brand_Serial', 'Notes']);
    instSheet.setFrozenRows(1);
  }

  // 3. Verify Scan_Log Tab (includes Scanned_By column)
  let logSheet = ss.getSheetByName(TAB_SCAN_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(TAB_SCAN_LOG);
    logSheet.appendRow([
      'Timestamp',
      'Ensemble',
      'Line_Number',
      'Student_Name',
      'Section',
      'Case_ID',
      'Action',
      'Status_Flag',
      'Volunteer_Note',
      'Scanned_By'
    ]);
    logSheet.setFrozenRows(1);
  } else {
    const lHeaders = logSheet.getRange(1, 1, 1, logSheet.getLastColumn() || 9).getValues()[0];
    if (lHeaders.indexOf('Scanned_By') === -1) {
      logSheet.getRange(1, lHeaders.length + 1).setValue('Scanned_By');
    }
  }

  // 4. Verify Settings Tab (Stores Volunteer_PIN, Admin_PIN, and Default School Tag Text)
  let settingsSheet = ss.getSheetByName(TAB_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(TAB_SETTINGS);
    settingsSheet.appendRow(['Setting_Key', 'Setting_Value', 'Description']);
    settingsSheet.appendRow(['Volunteer_PIN', '2468', 'PIN for Parent Volunteers (Scan & Search access)']);
    settingsSheet.appendRow(['Admin_PIN', '9988', 'PIN for Band/Orchestra Director (Full access + QR Generator)']);
    settingsSheet.appendRow(['School_Header', 'MS MUSIC PROGRAM', 'Top header printed on 2x2 Avery 60506 QR labels']);
    settingsSheet.appendRow(['Return_Info', 'If found, return to Band/Orchestra Room', 'Return line printed on 2x2 QR labels']);
    settingsSheet.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert(
    '✅ Database verified!\n\nDefault PINs in the "Settings" tab:\n• Volunteer PIN: 2468\n• Director Admin PIN: 9988\n\nYou can change these PINs in the Settings tab anytime.'
  );
}

/**
 * Reads the Settings tab and validates the user's PIN.
 */
function verifyPinAndGetConfig(submittedPin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = ss.getSheetByName(TAB_SETTINGS);
  if (!settingsSheet) {
    setupDatabaseTabs();
    settingsSheet = ss.getSheetByName(TAB_SETTINGS);
  }

  const rows = settingsSheet.getDataRange().getValues();
  const config = {
    Volunteer_PIN: '2468',
    Admin_PIN: '9988',
    School_Header: 'MS MUSIC PROGRAM',
    Return_Info: 'If found, return to Music Room'
  };

  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || '').trim();
    const val = String(rows[i][1] || '').trim();
    if (key) config[key] = val;
  }

  const cleanPin = String(submittedPin || '').trim();
  let role = null;
  if (cleanPin && cleanPin === config.Admin_PIN) {
    role = 'ADMIN';
  } else if (cleanPin && cleanPin === config.Volunteer_PIN) {
    role = 'VOLUNTEER';
  }

  return {
    authorized: role !== null,
    role: role,
    schoolHeader: config.School_Header,
    returnInfo: config.Return_Info
  };
}

function archiveSchoolYearPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Archive School Year / Semester',
    'Enter a label for this archive (e.g., "2026-2027" or "Fall_2026"):\n\nThis duplicates Roster and Scan_Log into archive tabs and clears the active Scan_Log.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;
  const label = response.getResponseText().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!label) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rosterSheet = ss.getSheetByName(TAB_ROSTER);
  const logSheet = ss.getSheetByName(TAB_SCAN_LOG);

  if (rosterSheet) {
    rosterSheet.copyTo(ss).setName(`Archive_${label}_Roster`);
  }
  if (logSheet) {
    logSheet.copyTo(ss).setName(`Archive_${label}_Log`);
    if (logSheet.getLastRow() > 1) {
      logSheet.deleteRows(2, logSheet.getLastRow() - 1);
    }
  }

  ui.alert(`📦 Archived to "Archive_${label}_Roster" and "Archive_${label}_Log"!`);
}

function doGet(e) {
  const pin = e && e.parameter ? e.parameter.pin : '';
  const auth = verifyPinAndGetConfig(pin);

  if (!auth.authorized) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'UNAUTHORIZED', message: 'Invalid Access PIN.' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const payload = {
    status: 'OK',
    role: auth.role,
    schoolHeader: auth.schoolHeader,
    returnInfo: auth.returnInfo,
    timestamp: new Date().toISOString(),
    roster: sheetToObjects(ss.getSheetByName(TAB_ROSTER)),
    instruments: sheetToObjects(ss.getSheetByName(TAB_INSTRUMENTS)),
    logs: sheetToObjects(ss.getSheetByName(TAB_SCAN_LOG))
  };

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const auth = verifyPinAndGetConfig(data.Auth_PIN);

    if (!auth.authorized) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'UNAUTHORIZED', message: 'Invalid PIN' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Case 1: Link School ID Barcode to Student Row
    if (data.Request_Type === 'LINK_STUDENT_ID') {
      const rosterSheet = ss.getSheetByName(TAB_ROSTER);
      const rows = rosterSheet.getDataRange().getValues();
      const headers = rows[0];
      let idColIndex = headers.indexOf('Student_ID');
      if (idColIndex === -1) {
        idColIndex = headers.length;
        rosterSheet.getRange(1, idColIndex + 1).setValue('Student_ID');
      }
      const ensIdx = headers.indexOf('Ensemble');
      const lineIdx = headers.indexOf('Line_Number');

      for (let r = 1; r < rows.length; r++) {
        if (
          String(rows[r][ensIdx]).trim().toUpperCase() === String(data.Ensemble).trim().toUpperCase() &&
          Number(rows[r][lineIdx]) === Number(data.Line_Number)
        ) {
          rosterSheet.getRange(r + 1, idColIndex + 1).setValue(String(data.Student_ID).trim());
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'ID_LINKED' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Case 2: Append Scan Transaction with Volunteer Name
    let logSheet = ss.getSheetByName(TAB_SCAN_LOG);
    if (!logSheet) {
      setupDatabaseTabs();
      logSheet = ss.getSheetByName(TAB_SCAN_LOG);
    }

    logSheet.appendRow([
      data.Timestamp || new Date().toISOString(),
      data.Ensemble || '',
      data.Line_Number || '',
      data.Student_Name || '',
      data.Section || '',
      data.Case_ID || '',
      data.Action || 'CHECK_IN',
      data.Status_Flag || 'DIRECT_MATCH',
      data.Volunteer_Note || '',
      data.Scanned_By || 'Unknown Volunteer'
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'LOGGED' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ERROR', message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function sheetToObjects(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((h) => String(h).trim());
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.join('').trim() === '') continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    results.push(obj);
  }
  return results;
}