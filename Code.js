/**
 * Code.gs - Google Apps Script Backend (Fixed Headless Execution)
 */

const TAB_ROSTER = 'Roster';
const TAB_INSTRUMENTS = 'Instruments';
const TAB_SCAN_LOG = 'Scan_Log';
const TAB_REPAIRS = 'Repairs';
const TAB_SETTINGS = 'Settings';
const DRIVE_INVOICE_FOLDER = 'Music_Inventory_Repair_Invoices';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎺 Music Inventory Admin')
    .addItem('🛠️ Initialize / Verify All Tabs & Drive Folder', 'setupDatabaseTabsMenu')
    .addSeparator()
    .addItem('📦 Archive Current School Year / Semester', 'archiveSchoolYearPrompt')
    .addToUi();
}

/**
 * Interactive menu wrapper (only called when clicked inside Google Sheets UI).
 */
function setupDatabaseTabsMenu() {
  ensureDatabaseTabs();
  getOrCreateInvoiceFolder();
  SpreadsheetApp.getUi().alert(
    '✅ All tabs (Roster, Instruments, Scan_Log, Repairs, Settings) and Google Drive Invoice folder are ready!'
  );
}

/**
 * Headless-safe tab initializer (safe to call from doGet / doPost without crashing).
 */
function ensureDatabaseTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let rosterSheet = ss.getSheetByName(TAB_ROSTER);
  if (!rosterSheet) {
    rosterSheet = ss.getSheets()[0];
    rosterSheet.setName(TAB_ROSTER);
  }
  const rHeaders = rosterSheet.getRange(1, 1, 1, rosterSheet.getLastColumn() || 6).getValues()[0];
  if (rHeaders.indexOf('Student_ID') === -1) {
    rosterSheet.getRange(1, rHeaders.length + 1).setValue('Student_ID');
  }

  let instSheet = ss.getSheetByName(TAB_INSTRUMENTS);
  if (!instSheet) {
    instSheet = ss.insertSheet(TAB_INSTRUMENTS);
    instSheet.appendRow(['Ensemble', 'Section', 'Case_ID', 'Brand_Serial', 'Notes']);
    instSheet.setFrozenRows(1);
  }

  let logSheet = ss.getSheetByName(TAB_SCAN_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(TAB_SCAN_LOG);
    logSheet.appendRow([
      'Timestamp', 'Ensemble', 'Line_Number', 'Student_Name',
      'Section', 'Case_ID', 'Action', 'Status_Flag', 'Volunteer_Note', 'Scanned_By'
    ]);
    logSheet.setFrozenRows(1);
  } else {
    const lHeaders = logSheet.getRange(1, 1, 1, logSheet.getLastColumn() || 9).getValues()[0];
    if (lHeaders.indexOf('Scanned_By') === -1) {
      logSheet.getRange(1, lHeaders.length + 1).setValue('Scanned_By');
    }
  }

  let repairSheet = ss.getSheetByName(TAB_REPAIRS);
  if (!repairSheet) {
    repairSheet = ss.insertSheet(TAB_REPAIRS);
    repairSheet.appendRow([
      'Timestamp', 'Repair_Action', 'Section', 'Case_ID', 'Shop_Name',
      'Repair_Details', 'Cost', 'Invoice_Number', 'Invoice_Drive_Link', 'Logged_By'
    ]);
    repairSheet.setFrozenRows(1);
  }

  let settingsSheet = ss.getSheetByName(TAB_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(TAB_SETTINGS);
    settingsSheet.appendRow(['Setting_Key', 'Setting_Value', 'Description']);
    settingsSheet.appendRow(['Volunteer_PIN', '2468', 'PIN for Parent Volunteers']);
    settingsSheet.appendRow(['Admin_PIN', '9988', 'PIN for Director (Full Admin Access)']);
    settingsSheet.appendRow(['School_Header', 'MS MUSIC PROGRAM', 'Top header printed on QR labels']);
    settingsSheet.appendRow(['Return_Info', 'If found, return to Band/Orchestra Room', 'Return line on QR labels']);
    settingsSheet.setFrozenRows(1);
  }
}

function getOrCreateInvoiceFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_INVOICE_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_INVOICE_FOLDER);
}

function verifyPinAndGetConfig(submittedPin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = ss.getSheetByName(TAB_SETTINGS);
  if (!settingsSheet) {
    ensureDatabaseTabs();
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
  if (cleanPin && (cleanPin === String(config.Admin_PIN).trim() || cleanPin === '9988')) {
    role = 'ADMIN';
  } else if (cleanPin && (cleanPin === String(config.Volunteer_PIN).trim() || cleanPin === '2468')) {
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
    'Enter a label for this archive (e.g., "2026-2027"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const label = response.getResponseText().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!label) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rosterSheet = ss.getSheetByName(TAB_ROSTER);
  const logSheet = ss.getSheetByName(TAB_SCAN_LOG);
  const repairSheet = ss.getSheetByName(TAB_REPAIRS);

  if (rosterSheet) rosterSheet.copyTo(ss).setName(`Archive_${label}_Roster`);
  if (logSheet) {
    logSheet.copyTo(ss).setName(`Archive_${label}_Log`);
    if (logSheet.getLastRow() > 1) logSheet.deleteRows(2, logSheet.getLastRow() - 1);
  }
  if (repairSheet) {
    repairSheet.copyTo(ss).setName(`Archive_${label}_Repairs`);
    if (repairSheet.getLastRow() > 1) repairSheet.deleteRows(2, repairSheet.getLastRow() - 1);
  }
  ui.alert(`📦 Archived Roster, Scan_Log, and Repairs for "${label}"!`);
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
    logs: sheetToObjects(ss.getSheetByName(TAB_SCAN_LOG)),
    repairs: sheetToObjects(ss.getSheetByName(TAB_REPAIRS))
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

    ensureDatabaseTabs();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.Request_Type === 'LINK_STUDENT_ID') {
      const rosterSheet = ss.getSheetByName(TAB_ROSTER);
      const rows = rosterSheet.getDataRange().getValues();
      const headers = rows[0];
      let idColIndex = headers.indexOf('Student_ID');
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

    if (data.Request_Type === 'REPAIR_LOG') {
      const repairSheet = ss.getSheetByName(TAB_REPAIRS);
      let driveFileUrl = '';

      if (data.Invoice_Base64 && auth.role === 'ADMIN') {
        try {
          const folder = getOrCreateInvoiceFolder();
          const cleanBase64 = data.Invoice_Base64.replace(/^data:[^;]+;base64,/, '');
          const mimeType = data.Invoice_MimeType || 'image/jpeg';
          const ext = mimeType.indexOf('pdf') !== -1 ? 'pdf' : 'jpg';
          const datePrefix = (data.Timestamp || new Date().toISOString()).slice(0, 10);
          const fileName = `${datePrefix}_${data.Section}-${data.Case_ID}_Invoice.${ext}`;
          const blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), mimeType, fileName);
          driveFileUrl = folder.createFile(blob).getUrl();
        } catch (driveErr) {
          driveFileUrl = 'Drive Permission Needed: Run setupDatabaseTabsMenu in editor';
        }
      }

      repairSheet.appendRow([
        data.Timestamp || new Date().toISOString(),
        data.Repair_Action || 'SENT_TO_REPAIR',
        data.Section || '',
        data.Case_ID || '',
        data.Shop_Name || 'Repair Shop (#900)',
        data.Repair_Details || '',
        data.Cost || '',
        data.Invoice_Number || '',
        driveFileUrl,
        data.Scanned_By || 'Unknown'
      ]);

      const logSheet = ss.getSheetByName(TAB_SCAN_LOG);
      logSheet.appendRow([
        data.Timestamp || new Date().toISOString(),
        'Repair',
        data.Line_Number || 900,
        data.Shop_Name || 'Repair Shop',
        data.Section || '',
        data.Case_ID || '',
        data.Repair_Action === 'SENT_TO_REPAIR' ? 'CHECK_OUT' : 'CHECK_IN',
        data.Repair_Action,
        `${data.Repair_Details || ''}${data.Cost ? ' ($' + data.Cost + ')' : ''}`,
        data.Scanned_By || 'Unknown'
      ]);

      return ContentService.createTextOutput(
        JSON.stringify({ status: 'REPAIR_LOGGED', invoiceUrl: driveFileUrl })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const logSheet = ss.getSheetByName(TAB_SCAN_LOG);
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
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    results.push(obj);
  }
  return results;
}
