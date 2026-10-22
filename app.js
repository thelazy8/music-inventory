/**
 * app.js - Complete Controller with Embedded GAS URL, Fixed 2-Tier Admin Role,
 * Instrument Repair Check-Out/In (#900), and Google Drive Invoice Scanner.
 */

// 👇👇 PASTE YOUR GOOGLE APPS SCRIPT WEB APP (/exec) URL BETWEEN THE QUOTES BELOW 👇👇
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzSdFeiLX9wMGEkTAtviNUKABb_haLkxnAxlLJGaLYXbLO0T9PvhPOSM2pcNrjNHwkqqw/exec';

const STORAGE_KEYS = {
  GAS_URL: 'instrument_tracker_gas_url',
  ACTION_MODE: 'instrument_tracker_action_mode',
  USER_NAME: 'instrument_tracker_user_name',
  USER_PIN: 'instrument_tracker_user_pin',
  USER_ROLE: 'instrument_tracker_user_role',
  SCHOOL_HEADER: 'instrument_tracker_school_header',
  RETURN_INFO: 'instrument_tracker_return_info',
  SCHOOL_LOGO: 'instrument_tracker_school_logo'
};

const AppState = {
  actionMode: localStorage.getItem(STORAGE_KEYS.ACTION_MODE) || 'CHECK_IN',
  userName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || '',
  userPin: localStorage.getItem(STORAGE_KEYS.USER_PIN) || '',
  userRole: localStorage.getItem(STORAGE_KEYS.USER_ROLE) || '',
  schoolHeader: localStorage.getItem(STORAGE_KEYS.SCHOOL_HEADER) || 'MS MUSIC PROGRAM',
  returnInfo: localStorage.getItem(STORAGE_KEYS.RETURN_INFO) || 'If found, return to Music Room',
  schoolLogoDataUrl: localStorage.getItem(STORAGE_KEYS.SCHOOL_LOGO) || '',
  ensembleFilter: 'ALL',
  rosterList: [],
  instrumentsList: [],
  scanHistory: [],
  repairsHistory: [],
  currentInput: '',
  matchedCandidates: [],
  activeStudent: null,
  awaitingIdLink: false,
  pendingRepairInstrument: null, // { section, caseId, initialNote }
  pendingInvoiceBase64: '',
  pendingInvoiceMime: '',
  scannerStarted: false,
  html5QrCode: null,
  lastScanTime: 0,
  postTransactionReset: false,
  lastTransaction: null,
  isSyncing: false,
  audioCtx: null
};

const UI = {
  loginOverlay: document.getElementById('loginOverlay'),
  loginNameInput: document.getElementById('loginNameInput'),
  loginPinInput: document.getElementById('loginPinInput'),
  loginErrorMsg: document.getElementById('loginErrorMsg'),
  btnLoginSubmit: document.getElementById('btnLoginSubmit'),
  navTabs: document.querySelectorAll('.nav-tab'),
  tabQrGenerator: document.getElementById('tabQrGenerator'),
  views: document.querySelectorAll('.view-panel'),
  userBadgeBtn: document.getElementById('userBadgeBtn'),
  btnModeIn: document.getElementById('btnModeIn'),
  btnModeOut: document.getElementById('btnModeOut'),
  ensembleFilterGroup: document.getElementById('ensembleFilterGroup'),
  syncBadge: document.getElementById('syncBadge'),
  syncText: document.getElementById('syncText'),
  btnSettings: document.getElementById('btnSettings'),
  studentCard: document.getElementById('studentCard'),
  lineDisplay: document.getElementById('lineDisplay'),
  studentName: document.getElementById('studentName'),
  studentMeta: document.getElementById('studentMeta'),
  candidateList: document.getElementById('candidateList'),
  expectedCase: document.getElementById('expectedCase'),
  studentActionButtons: document.getElementById('studentActionButtons'),
  btnManualCase: document.getElementById('btnManualCase'),
  btnLinkSchoolId: document.getElementById('btnLinkSchoolId'),
  cameraCard: document.getElementById('cameraCard'),
  cameraStatusBadge: document.getElementById('cameraStatusBadge'),
  resultBanner: document.getElementById('resultBanner'),
  resultIcon: document.getElementById('resultIcon'),
  resultTitle: document.getElementById('resultTitle'),
  resultSubtitle: document.getElementById('resultSubtitle'),
  btnAddNote: document.getElementById('btnAddNote'),
  btnNextStudent: document.getElementById('btnNextStudent'),
  keypadGrid: document.getElementById('keypadGrid'),
  searchInput: document.getElementById('searchInput'),
  searchResultsContainer: document.getElementById('searchResultsContainer'),
  chkShowCutLines: document.getElementById('chkShowCutLines'),
  qrTypeSelect: document.getElementById('qrTypeSelect'),
  qrEnsembleSelect: document.getElementById('qrEnsembleSelect'),
  qrSchoolHeaderInput: document.getElementById('qrSchoolHeaderInput'),
  qrReturnInfoInput: document.getElementById('qrReturnInfoInput'),
  qrLogoFileInput: document.getElementById('qrLogoFileInput'),
  btnClearLogo: document.getElementById('btnClearLogo'),
  qrSingleInputs: document.getElementById('qrSingleInputs'),
  qrInputPrimary: document.getElementById('qrInputPrimary'),
  qrInputSecondary: document.getElementById('qrInputSecondary'),
  qrStartSlotInput: document.getElementById('qrStartSlotInput'),
  btnPrintQr: document.getElementById('btnPrintQr'),
  qrPreviewGrid: document.getElementById('qrPreviewGrid'),
  repairModal: document.getElementById('repairModal'),
  repairModalTitle: document.getElementById('repairModalTitle'),
  repairInstrumentLabel: document.getElementById('repairInstrumentLabel'),
  repairShopInput: document.getElementById('repairShopInput'),
  repairDetailsLabel: document.getElementById('repairDetailsLabel'),
  repairDetailsInput: document.getElementById('repairDetailsInput'),
  repairReturnFields: document.getElementById('repairReturnFields'),
  repairCostInput: document.getElementById('repairCostInput'),
  repairInvoiceNumInput: document.getElementById('repairInvoiceNumInput'),
  adminInvoiceBox: document.getElementById('adminInvoiceBox'),
  invoiceFileInput: document.getElementById('invoiceFileInput'),
  invoicePreviewText: document.getElementById('invoicePreviewText'),
  btnCancelRepair: document.getElementById('btnCancelRepair'),
  btnSubmitRepair: document.getElementById('btnSubmitRepair'),
  manualCaseModal: document.getElementById('manualCaseModal'),
  btnQuickConfirmAssigned: document.getElementById('btnQuickConfirmAssigned'),
  manualSectionInput: document.getElementById('manualSectionInput'),
  sectionSuggestions: document.getElementById('sectionSuggestions'),
  manualCaseNumInput: document.getElementById('manualCaseNumInput'),
  chkFlagBadQr: document.getElementById('chkFlagBadQr'),
  btnCancelManual: document.getElementById('btnCancelManual'),
  btnSubmitManual: document.getElementById('btnSubmitManual'),
  noteModal: document.getElementById('noteModal'),
  noteInput: document.getElementById('noteInput'),
  btnCancelNote: document.getElementById('btnCancelNote'),
  btnSaveNote: document.getElementById('btnSaveNote'),
  settingsModal: document.getElementById('settingsModal'),
  gasUrlInput: document.getElementById('gasUrlInput'),
  settingsUserText: document.getElementById('settingsUserText'),
  rosterCountText: document.getElementById('rosterCountText'),
  historyCountText: document.getElementById('historyCountText'),
  queueCountText: document.getElementById('queueCountText'),
  btnReloadRoster: document.getElementById('btnReloadRoster'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings')
};

/* ============================================================================
 * 1. INITIALIZATION & STREAMLINED LOGIN (NAME + PIN ONLY)
 * ============================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Optional ?api= override support
  const params = new URLSearchParams(window.location.search);
  const apiParam = params.get('api');
  if (apiParam && apiParam.startsWith('https://script.google.com/')) {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, apiParam.trim());
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  applyModeUI(AppState.actionMode);
  UI.qrSchoolHeaderInput.value = AppState.schoolHeader;
  UI.qrReturnInfoInput.value = AppState.returnInfo;
  if (AppState.schoolLogoDataUrl) UI.btnClearLogo.style.display = 'inline-block';

  bindEvents();

  await window.TrackerDB.init();
  await reloadMemoryFromIndexedDB();
  await updateSyncBadge();

  if (AppState.userName && AppState.userPin) {
    const resolvedRole = resolveClientRole(AppState.userPin, AppState.userRole);
    unlockAppWithRole(AppState.userName, resolvedRole);
    syncWithServer(false);
  } else {
    showLoginScreen();
  }

  setInterval(() => flushOutboundQueue(), 15000);
  window.addEventListener('online', () => flushOutboundQueue());
  window.addEventListener('offline', () => updateSyncBadge());
});

function getGasUrl() {
  const custom = localStorage.getItem(STORAGE_KEYS.GAS_URL);
  if (custom && custom.startsWith('https://script.google.com/')) return custom;
  if (DEFAULT_GAS_URL && DEFAULT_GAS_URL.startsWith('https://script.google.com/')) return DEFAULT_GAS_URL;
  return '';
}

/**
 * Guarantees that PIN 9988 always unlocks ADMIN even if the Google Apps Script
 * deployment hasn't been bumped to a new version yet.
 */
function resolveClientRole(pin, serverRole) {
  if (serverRole === 'ADMIN' || String(pin).trim() === '9988') return 'ADMIN';
  return 'VOLUNTEER';
}

function showLoginScreen() {
  UI.loginNameInput.value = AppState.userName || '';
  UI.loginPinInput.value = '';
  UI.loginErrorMsg.style.display = 'none';
  UI.loginOverlay.classList.remove('hidden');
}

async function handleLoginAttempt() {
  const name = UI.loginNameInput.value.trim();
  const pin = UI.loginPinInput.value.trim();
  const url = getGasUrl();

  if (!name) return showLoginError('Please enter your name.');
  if (!pin) return showLoginError('Please enter your Access PIN.');

  // If DEFAULT_GAS_URL wasn't pasted into app.js yet, let Admin PIN 9988 unlock and open Settings modal
  if (!url) {
    if (pin === '9988' || pin === '2468') {
      AppState.userName = name;
      AppState.userPin = pin;
      AppState.userRole = resolveClientRole(pin, null);
      localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
      localStorage.setItem(STORAGE_KEYS.USER_PIN, pin);
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, AppState.userRole);
      unlockAppWithRole(name, AppState.userRole);
      UI.settingsModal.classList.add('open');
      return;
    }
    return showLoginError('App Script URL not embedded in app.js yet. Log in with Admin PIN 9988 to configure.');
  }

  UI.btnLoginSubmit.disabled = true;
  UI.btnLoginSubmit.textContent = 'Verifying PIN...';
  UI.loginErrorMsg.style.display = 'none';

  try {
    const authUrl = `${url}${url.includes('?') ? '&' : '?'}pin=${encodeURIComponent(pin)}`;
    const res = await fetch(authUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data.status === 'UNAUTHORIZED') {
      showLoginError('❌ Invalid PIN. Check with the Music Director.');
      return;
    }

    if (data.status === 'OK' || Array.isArray(data.roster)) {
      AppState.userName = name;
      AppState.userPin = pin;
      AppState.userRole = resolveClientRole(pin, data.role);

      localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
      localStorage.setItem(STORAGE_KEYS.USER_PIN, pin);
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, AppState.userRole);

      if (data.schoolHeader) {
        AppState.schoolHeader = data.schoolHeader;
        localStorage.setItem(STORAGE_KEYS.SCHOOL_HEADER, data.schoolHeader);
        UI.qrSchoolHeaderInput.value = data.schoolHeader;
      }
      if (data.returnInfo) {
        AppState.returnInfo = data.returnInfo;
        localStorage.setItem(STORAGE_KEYS.RETURN_INFO, data.returnInfo);
        UI.qrReturnInfoInput.value = data.returnInfo;
      }

      await window.TrackerDB.saveServerBundle({
        roster: data.roster || [],
        instruments: data.instruments || [],
        logs: data.logs || [],
        repairs: data.repairs || []
      });
      await reloadMemoryFromIndexedDB();
      unlockAppWithRole(name, AppState.userRole);
      flushOutboundQueue();
    }
  } catch (err) {
    if (pin === '9988' || pin === '2468' || pin === AppState.userPin) {
      AppState.userName = name;
      AppState.userPin = pin;
      AppState.userRole = resolveClientRole(pin, AppState.userRole);
      unlockAppWithRole(name, AppState.userRole);
    } else {
      showLoginError('Network unreachable. Connect to Wi-Fi/cellular for initial PIN check.');
    }
  } finally {
    UI.btnLoginSubmit.disabled = false;
    UI.btnLoginSubmit.textContent = '🔓 Unlock Scanner';
    updateSyncBadge();
  }
}

function showLoginError(msg) {
  UI.loginErrorMsg.textContent = msg;
  UI.loginErrorMsg.style.display = 'block';
}

function unlockAppWithRole(name, role) {
  UI.loginOverlay.classList.add('hidden');
  const isAdmin = role === 'ADMIN';
  UI.userBadgeBtn.textContent = `${isAdmin ? '🔑' : '👤'} ${name}`;
  UI.settingsUserText.textContent = `${name} (${role})`;

  UI.tabQrGenerator.classList.toggle('admin-locked', !isAdmin);
  UI.btnSettings.style.display = isAdmin ? 'inline-block' : 'none';

  startAlwaysOnCamera();
}

async function reloadMemoryFromIndexedDB() {
  AppState.rosterList = await window.TrackerDB.getAllStore('roster');
  AppState.instrumentsList = await window.TrackerDB.getAllStore('instruments');
  AppState.scanHistory = await window.TrackerDB.getAllStore('scan_history');
  AppState.repairsHistory = await window.TrackerDB.getAllStore('repairs_history');

  // Ensure Line #900 Repair Shop is always available in memory
  if (!AppState.rosterList.some((r) => Number(r.Line_Number) === 900)) {
    AppState.rosterList.push({
      composite_id: 'REPAIR|900',
      Line_Number: 900,
      Student_Name: '🔧 Repair Shop',
      Ensemble: 'Repair',
      Section: 'Repair Vendor',
      Assigned_Case_ID: 'ANY',
      Student_ID: 'SHOP900'
    });
  }

  UI.rosterCountText.textContent = AppState.rosterList.length;
  UI.historyCountText.textContent = AppState.scanHistory.length;

  const sections = [...new Set(AppState.instrumentsList.map((i) => i.Section).filter(Boolean))];
  UI.sectionSuggestions.innerHTML = sections.map((s) => `<option value="${escapeHtml(s)}">`).join('');
}

async function syncWithServer(showAlert = false) {
  const url = getGasUrl();
  if (!url || !AppState.userPin || !navigator.onLine) return;

  await flushOutboundQueue();

  try {
    UI.syncText.textContent = 'Syncing...';
    const authUrl = `${url}${url.includes('?') ? '&' : '?'}pin=${encodeURIComponent(AppState.userPin)}`;
    const res = await fetch(authUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data.status === 'UNAUTHORIZED') {
      showLoginScreen();
      showLoginError('Session PIN changed by Director. Please re-enter PIN.');
      return;
    }

    if (data && Array.isArray(data.roster)) {
      AppState.userRole = resolveClientRole(AppState.userPin, data.role);
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, AppState.userRole);
      unlockAppWithRole(AppState.userName, AppState.userRole);

      await window.TrackerDB.saveServerBundle({
        roster: data.roster,
        instruments: data.instruments || [],
        logs: data.logs || [],
        repairs: data.repairs || []
      });
      await reloadMemoryFromIndexedDB();
      if (showAlert) alert(`Synced ${AppState.rosterList.length} records & ${AppState.scanHistory.length} logs.`);
    }
  } catch (err) {
    console.warn('Offline or sync error:', err);
  } finally {
    updateSyncBadge();
  }
}

/* ============================================================================
 * 2. KEYPAD, STUDENT LOOKUP & REPAIR SHOP (#900) MODE
 * ============================================================================ */
function handleKeypad(key) {
  unlockAudio();

  if (AppState.postTransactionReset && key !== 'CLR' && key !== 'BACK') {
    UI.resultBanner.classList.remove('visible');
    AppState.currentInput = '';
    AppState.postTransactionReset = false;
  }

  if (key === 'CLR') {
    resetScannerState();
    return;
  }

  if (key === 'BACK') {
    UI.resultBanner.classList.remove('visible');
    AppState.postTransactionReset = false;
    AppState.currentInput = AppState.currentInput.slice(0, -1);
  } else if (AppState.currentInput.length < 4) {
    if (AppState.currentInput === '' && key === '0') return;
    AppState.currentInput += key;
  }

  lookupByLineNumber(AppState.currentInput);
}

function lookupByLineNumber(inputStr) {
  AppState.awaitingIdLink = false;
  UI.btnLinkSchoolId.textContent = '🔗 Link ID';
  UI.studentCard.classList.remove('repair-active');

  if (!inputStr) {
    UI.lineDisplay.textContent = '---';
    UI.studentName.textContent = 'Type Line # or Scan ID';
    UI.studentMeta.textContent = 'Use #900 for Instrument Repairs';
    UI.expectedCase.textContent = '—';
    UI.candidateList.style.display = 'none';
    UI.studentActionButtons.style.display = 'none';
    UI.studentCard.classList.remove('ready-to-scan');
    UI.cameraCard.classList.remove('active-target');
    UI.cameraStatusBadge.textContent = 'Ready: Scan ID or Type Line #';
    AppState.matchedCandidates = [];
    AppState.activeStudent = null;
    return;
  }

  const lineNum = parseInt(inputStr, 10);
  UI.lineDisplay.textContent = lineNum;

  const matches = AppState.rosterList.filter((s) => {
    const lineMatch = Number(s.Line_Number) === lineNum;
    if (lineNum >= 900 || String(s.Ensemble).toUpperCase() === 'REPAIR') return lineMatch;
    const ensMatch =
      AppState.ensembleFilter === 'ALL' ||
      s.Ensemble.toUpperCase() === AppState.ensembleFilter.toUpperCase();
    return lineMatch && ensMatch;
  });

  AppState.matchedCandidates = matches;

  if (matches.length === 1) {
    selectActiveStudent(matches[0], false);
  } else if (matches.length > 1) {
    selectActiveStudent(matches[0], true);
  } else {
    AppState.activeStudent = {
      Line_Number: lineNum,
      Student_Name: `Unlisted (#${lineNum})`,
      Ensemble: AppState.ensembleFilter === 'ALL' ? 'Unlisted' : AppState.ensembleFilter,
      Section: 'Unassigned',
      Assigned_Case_ID: ''
    };
    UI.candidateList.style.display = 'none';
    UI.studentName.textContent = `Line #${lineNum} Not Found`;
    UI.studentMeta.textContent = 'Scan instrument or tap Manual below';
    UI.expectedCase.textContent = 'UNASSIGNED';
    UI.studentActionButtons.style.display = 'flex';
    UI.studentCard.classList.add('ready-to-scan');
    UI.cameraCard.classList.add('active-target');
    UI.cameraStatusBadge.textContent = '🎯 Scan Case QR or Tap Manual';
  }
}

function isRepairShopEntity(student) {
  if (!student) return false;
  return (
    String(student.Ensemble || '').toUpperCase() === 'REPAIR' ||
    Number(student.Line_Number) >= 900
  );
}

function selectActiveStudent(student, showCandidateSwitcher) {
  AppState.activeStudent = student;
  const isRepair = isRepairShopEntity(student);

  UI.studentName.textContent = student.Student_Name;
  UI.studentMeta.textContent = isRepair
    ? `Repair Mode (${AppState.actionMode === 'CHECK_OUT' ? 'Sending OUT to Shop' : 'Returning IN from Shop'})`
    : `${student.Ensemble} • Line #${student.Line_Number}${student.Student_ID ? ' • ID Linked' : ''}`;

  UI.expectedCase.textContent = isRepair
    ? 'Scan Any Instrument for Repair'
    : student.Assigned_Case_ID
    ? `${student.Section} #${student.Assigned_Case_ID}`
    : 'UNASSIGNED';

  UI.studentActionButtons.style.display = 'flex';
  UI.btnLinkSchoolId.style.display = isRepair ? 'none' : 'inline-block';
  UI.studentCard.classList.add('ready-to-scan');
  UI.studentCard.classList.toggle('repair-active', isRepair);
  UI.cameraCard.classList.add('active-target');
  UI.cameraStatusBadge.textContent = isRepair
    ? '🔧 Scan Instrument Case for Repair'
    : `🎯 Scan ${student.Section} #${student.Assigned_Case_ID}`;

  if (showCandidateSwitcher && AppState.matchedCandidates.length > 1) {
    UI.candidateList.style.display = 'flex';
    UI.candidateList.innerHTML = AppState.matchedCandidates
      .map((cand, idx) => {
        const isSel = cand.composite_id === student.composite_id ? 'selected' : '';
        return `<button class="candidate-btn ${isSel}" data-idx="${idx}" type="button">
          <strong>${cand.Ensemble}: ${cand.Student_Name}</strong><br>
          <span style="font-size:0.74rem; color:#94a3b8;">Assigned: ${cand.Section} #${cand.Assigned_Case_ID}</span>
        </button>`;
      })
      .join('');

    UI.candidateList.querySelectorAll('.candidate-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = AppState.matchedCandidates[Number(btn.dataset.idx)];
        selectActiveStudent(picked, true);
      });
    });
  } else {
    UI.candidateList.style.display = 'none';
  }
}

function resetScannerState() {
  UI.resultBanner.classList.remove('visible');
  AppState.currentInput = '';
  AppState.postTransactionReset = false;
  lookupByLineNumber('');
}

/* ============================================================================
 * 3. CAMERA ENGINE & INSTRUMENT REPAIR / INVOICE CAPTURE WORKFLOW
 * ============================================================================ */
async function startAlwaysOnCamera() {
  if (AppState.scannerStarted) return;
  AppState.scannerStarted = true;

  try {
    AppState.html5QrCode = new Html5Qrcode('reader');
    await AppState.html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: { width: 185, height: 185 } },
      onCodeScanned,
      () => {}
    );
  } catch (err) {
    AppState.scannerStarted = false;
    UI.cameraStatusBadge.textContent = '⚠️ Allow HTTPS Camera Access';
  }
}

async function onCodeScanned(rawText) {
  if (!UI.loginOverlay.classList.contains('hidden')) return;
  if (UI.manualCaseModal.classList.contains('open') || UI.repairModal.classList.contains('open')) return;

  const now = Date.now();
  if (now - AppState.lastScanTime < 1400) return;

  const code = String(rawText || '').trim();
  if (!code) return;

  unlockAudio();

  // CASE A: Linking a Student ID barcode
  if (AppState.awaitingIdLink && AppState.activeStudent) {
    AppState.lastScanTime = now;
    AppState.awaitingIdLink = false;
    AppState.activeStudent.Student_ID = code;
    UI.btnLinkSchoolId.textContent = '✓ ID Linked';
    playTone('MATCH');

    await window.TrackerDB.enqueueItem({
      Request_Type: 'LINK_STUDENT_ID',
      Auth_PIN: AppState.userPin,
      Ensemble: AppState.activeStudent.Ensemble,
      Line_Number: AppState.activeStudent.Line_Number,
      Student_ID: code
    });
    flushOutboundQueue();
    return;
  }

  // CASE B: Scanned a Repair Shop QR Card ("SHOP|900|Repair Shop") or Student QR ("STU|Band|1")
  if (code.toUpperCase().startsWith('SHOP|') || code.toUpperCase().startsWith('STU|')) {
    AppState.lastScanTime = now;
    const parts = code.split('|');
    if (code.toUpperCase().startsWith('SHOP|')) {
      const lineNum = parseInt(parts[1], 10) || 900;
      AppState.currentInput = String(lineNum);
      lookupByLineNumber(AppState.currentInput);
      playTone('MATCH');
      return;
    }
    const ens = (parts[1] || '').trim().toUpperCase();
    const lineNum = parseInt(parts[2], 10);
    const found = AppState.rosterList.find(
      (s) => s.Ensemble.toUpperCase() === ens && Number(s.Line_Number) === lineNum
    );
    if (found) {
      UI.resultBanner.classList.remove('visible');
      AppState.postTransactionReset = false;
      AppState.currentInput = String(lineNum);
      UI.lineDisplay.textContent = lineNum;
      AppState.matchedCandidates = [found];
      selectActiveStudent(found, false);
      playTone('MATCH');
    }
    return;
  }

  // CASE C: Scanned an Instrument QR Code ("INST|Trumpet|1")
  if (code.toUpperCase().startsWith('INST|')) {
    if (!AppState.activeStudent) {
      UI.cameraStatusBadge.textContent = '⚠️ Enter Line # (or #900 for Repair) First!';
      playTone('WARNING');
      AppState.lastScanTime = now;
      return;
    }

    AppState.lastScanTime = now;
    const parts = code.split('|');
    const scannedSection = (parts[1] || '').trim();
    const scannedCaseId = (parts[2] || '').trim();
    await handleInstrumentScanOrRepair(scannedSection, scannedCaseId, '');
    return;
  }

  // CASE D: Scanned a School ID Card Barcode / QR
  const studentByBadge = AppState.rosterList.find(
    (s) => s.Student_ID && String(s.Student_ID).trim().toUpperCase() === code.toUpperCase()
  );

  if (studentByBadge) {
    AppState.lastScanTime = now;
    UI.resultBanner.classList.remove('visible');
    AppState.postTransactionReset = false;
    AppState.currentInput = String(studentByBadge.Line_Number);
    UI.lineDisplay.textContent = studentByBadge.Line_Number;
    AppState.matchedCandidates = [studentByBadge];
    selectActiveStudent(studentByBadge, false);
    playTone('MATCH');
    return;
  }

  if (AppState.activeStudent) {
    AppState.lastScanTime = now;
    let scannedSection = AppState.activeStudent.Section || 'Instrument';
    let scannedCaseId = code;
    if (code.includes('-')) {
      const [sec, num] = code.split('-');
      scannedSection = sec.trim();
      scannedCaseId = num.trim();
    }
    await handleInstrumentScanOrRepair(scannedSection, scannedCaseId, '');
  }
}

async function handleInstrumentScanOrRepair(scannedSection, scannedCaseId, initialNote = '') {
  if (isRepairShopEntity(AppState.activeStudent)) {
    openRepairDetailsModal(scannedSection, scannedCaseId, initialNote);
  } else {
    await evaluateAndLogInstrumentScan(scannedSection, scannedCaseId, initialNote);
  }
}

/**
 * Opens the Repair Details & Invoice Scanner Modal when checking an instrument
 * OUT to repair or BACK IN from repair.
 */
function openRepairDetailsModal(section, caseId, initialNote) {
  AppState.pendingRepairInstrument = { section, caseId, initialNote };
  AppState.pendingInvoiceBase64 = '';
  AppState.pendingInvoiceMime = '';
  UI.invoiceFileInput.value = '';
  UI.invoicePreviewText.style.display = 'none';

  const isReturning = AppState.actionMode === 'CHECK_IN';
  UI.repairModalTitle.textContent = isReturning
    ? '🔧 Check Instrument BACK IN from Repair'
    : '🔧 Send Instrument OUT for Repair';
  UI.repairInstrumentLabel.textContent = `${section} #${caseId}`;
  UI.repairShopInput.value =
    AppState.activeStudent && AppState.activeStudent.Student_Name
      ? `${AppState.activeStudent.Student_Name} (#${AppState.activeStudent.Line_Number})`
      : 'Repair Shop (#900)';

  UI.repairDetailsLabel.textContent = isReturning
    ? 'Work Performed / Repair Summary'
    : 'Issue / Reason for Repair';
  UI.repairDetailsInput.value = '';
  UI.repairCostInput.value = '';
  UI.repairInvoiceNumInput.value = '';

  UI.repairReturnFields.style.display = isReturning ? 'block' : 'none';
  UI.adminInvoiceBox.style.display = isReturning && AppState.userRole === 'ADMIN' ? 'block' : 'none';

  playTone('MATCH');
  UI.repairModal.classList.add('open');
}

/**
 * Compresses an invoice camera photo on a canvas so it uploads rapidly via GAS doPost.
 */
function handleInvoiceFileSelected(file) {
  if (!file) return;

  if (file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = (e) => {
      AppState.pendingInvoiceBase64 = e.target.result;
      AppState.pendingInvoiceMime = 'application/pdf';
      UI.invoicePreviewText.textContent = `✓ PDF Attached (${Math.round(file.size / 1024)} KB)`;
      UI.invoicePreviewText.style.display = 'block';
    };
    reader.readAsDataURL(file);
    return;
  }

  // Compress camera image to crisp 1600px JPEG (~150KB)
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      AppState.pendingInvoiceBase64 = canvas.toDataURL('image/jpeg', 0.78);
      AppState.pendingInvoiceMime = 'image/jpeg';
      UI.invoicePreviewText.textContent = `✓ Invoice Scanned & Ready to Upload to Google Drive`;
      UI.invoicePreviewText.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function submitRepairTransaction() {
  if (!AppState.pendingRepairInstrument) return;
  const { section, caseId, initialNote } = AppState.pendingRepairInstrument;
  const isReturning = AppState.actionMode === 'CHECK_IN';
  const repairAction = isReturning ? 'RETURNED_FROM_REPAIR' : 'SENT_TO_REPAIR';
  const shopName = UI.repairShopInput.value.trim() || 'Repair Shop (#900)';
  const details = [UI.repairDetailsInput.value.trim(), initialNote].filter(Boolean).join(' • ');
  const cost = isReturning ? UI.repairCostInput.value.trim() : '';
  const invNum = isReturning ? UI.repairInvoiceNumInput.value.trim() : '';

  UI.repairModal.classList.remove('open');

  const repairPayload = {
    Request_Type: 'REPAIR_LOG',
    Auth_PIN: AppState.userPin,
    Timestamp: new Date().toISOString(),
    Line_Number: AppState.activeStudent ? Number(AppState.activeStudent.Line_Number) : 900,
    Repair_Action: repairAction,
    Section: section,
    Case_ID: String(caseId),
    Shop_Name: shopName,
    Repair_Details: details || (isReturning ? 'Returned from shop' : 'Sent for repair'),
    Cost: cost,
    Invoice_Number: invNum,
    Invoice_Base64: AppState.pendingInvoiceBase64 || '',
    Invoice_MimeType: AppState.pendingInvoiceMime || '',
    Scanned_By: `${AppState.userName} (${AppState.userRole})`
  };

  AppState.repairsHistory.push(repairPayload);
  AppState.scanHistory.push({
    Timestamp: repairPayload.Timestamp,
    Ensemble: 'Repair',
    Line_Number: repairPayload.Line_Number,
    Student_Name: shopName,
    Section: section,
    Case_ID: String(caseId),
    Action: isReturning ? 'CHECK_IN' : 'CHECK_OUT',
    Status_Flag: repairAction,
    Volunteer_Note: `${repairPayload.Repair_Details}${cost ? ' ($' + cost + ')' : ''}`,
    Scanned_By: repairPayload.Scanned_By
  });

  const localId = await window.TrackerDB.enqueueItem(repairPayload);
  AppState.lastTransaction = { ...repairPayload, local_id: localId };
  AppState.postTransactionReset = true;

  UI.resultBanner.className = 'result-banner visible match';
  UI.resultIcon.textContent = '🔧';
  UI.resultTitle.textContent = isReturning ? 'RETURNED FROM REPAIR' : 'SENT TO REPAIR';
  UI.resultSubtitle.textContent = `${section} #${caseId} • ${shopName}${AppState.pendingInvoiceBase64 ? ' • 📄 Invoice Queued' : ''}`;

  setTimeout(() => {
    if (AppState.postTransactionReset) resetScannerState();
  }, 1400);

  updateSyncBadge();
  flushOutboundQueue();
}

function openManualCaseModal() {
  if (!AppState.activeStudent) return;
  const stu = AppState.activeStudent;
  const isRepair = isRepairShopEntity(stu);

  if (!isRepair && stu.Section && stu.Assigned_Case_ID) {
    UI.btnQuickConfirmAssigned.style.display = 'block';
    UI.btnQuickConfirmAssigned.textContent = `✓ Log Assigned: ${stu.Section} #${stu.Assigned_Case_ID} (Flag Bad QR)`;
  } else {
    UI.btnQuickConfirmAssigned.style.display = 'none';
  }

  UI.manualSectionInput.value = !isRepair && stu.Section !== 'Unassigned' ? stu.Section : '';
  UI.manualCaseNumInput.value = !isRepair ? stu.Assigned_Case_ID || '' : '';
  UI.chkFlagBadQr.checked = true;
  UI.manualCaseModal.classList.add('open');
}

async function evaluateAndLogInstrumentScan(scannedSection, scannedCaseId, initialNote = '') {
  if (AppState.matchedCandidates.length > 1) {
    const exactCandidate = AppState.matchedCandidates.find(
      (c) =>
        c.Section.toUpperCase() === scannedSection.toUpperCase() &&
        String(c.Assigned_Case_ID).toUpperCase() === String(scannedCaseId).toUpperCase()
    );
    const sectionCandidate = AppState.matchedCandidates.find(
      (c) => c.Section.toUpperCase() === scannedSection.toUpperCase()
    );
    if (exactCandidate) AppState.activeStudent = exactCandidate;
    else if (sectionCandidate) AppState.activeStudent = sectionCandidate;
  }

  const student = AppState.activeStudent;
  const expectedSection = String(student.Section || '').trim().toUpperCase();
  const expectedCase = String(student.Assigned_Case_ID || '').trim().toUpperCase();

  let statusFlag = 'DIRECT_MATCH';
  if (!expectedCase) {
    statusFlag = 'UNASSIGNED';
  } else if (
    scannedSection.toUpperCase() !== expectedSection ||
    String(scannedCaseId).toUpperCase() !== expectedCase
  ) {
    statusFlag = 'SWAP';
  }

  if (statusFlag === 'DIRECT_MATCH') {
    playTone('MATCH');
    vibrateDevice('MATCH');
  } else {
    playTone('WARNING');
    vibrateDevice('WARNING');
  }

  const logEntry = {
    Request_Type: 'SCAN_LOG',
    Auth_PIN: AppState.userPin,
    Timestamp: new Date().toISOString(),
    Ensemble: student.Ensemble,
    Line_Number: Number(student.Line_Number),
    Student_Name: student.Student_Name,
    Section: scannedSection,
    Case_ID: String(scannedCaseId),
    Action: AppState.actionMode,
    Status_Flag: statusFlag,
    Volunteer_Note: initialNote,
    Scanned_By: `${AppState.userName} (${AppState.userRole})`
  };

  AppState.scanHistory.push(logEntry);
  const localId = await window.TrackerDB.enqueueItem(logEntry);
  AppState.lastTransaction = { ...logEntry, local_id: localId };
  AppState.postTransactionReset = true;

  UI.resultBanner.className = `result-banner visible ${statusFlag === 'DIRECT_MATCH' ? 'match' : 'swap'}`;
  UI.resultIcon.textContent = statusFlag === 'DIRECT_MATCH' ? '✓' : '⚠️';
  UI.resultTitle.textContent =
    statusFlag === 'DIRECT_MATCH'
      ? `${AppState.actionMode === 'CHECK_IN' ? 'CHECKED IN' : 'CHECKED OUT'}`
      : `${statusFlag}: ${scannedSection} #${scannedCaseId}`;

  const noteSuffix = initialNote.includes('[NEEDS QR TAG]') ? ' • 🔧 Flagged for New QR' : '';
  UI.resultSubtitle.textContent =
    statusFlag === 'DIRECT_MATCH'
      ? `${student.Student_Name} • ${scannedSection} #${scannedCaseId}${noteSuffix}`
      : `${student.Student_Name} (Assigned: ${student.Section} #${student.Assigned_Case_ID})${noteSuffix}`;

  if (statusFlag === 'DIRECT_MATCH') {
    setTimeout(() => {
      if (AppState.postTransactionReset) resetScannerState();
    }, 1200);
  }

  updateSyncBadge();
  flushOutboundQueue();
}

/* ============================================================================
 * 4. LIVE SEARCH & STATUS QUERY ENGINE (INCLUDES REPAIR STATUS & INVOICE LINKS)
 * ============================================================================ */
function runStatusSearch(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (!q) {
    UI.searchResultsContainer.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">
      Type an instrument (e.g. <strong>"Trumpet 1"</strong>), student name (e.g. <strong>"Joe"</strong>), <strong>"Repair"</strong>, or <strong>"Needs QR"</strong>.
    </div>`;
    return;
  }

  const cardsHtml = [];

  const matchedInstruments = AppState.instrumentsList.filter((inst) => {
    const combo1 = `${inst.Section} ${inst.Case_ID}`.toLowerCase();
    const combo2 = `${inst.Section} #${inst.Case_ID}`.toLowerCase();
    const assigned = (inst.Assigned_Student || '').toLowerCase();

    const instLogs = AppState.scanHistory.filter(
      (l) =>
        String(l.Section || '').toUpperCase() === inst.Section.toUpperCase() &&
        String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase()
    );
    const lastLog = instLogs.length > 0 ? instLogs[instLogs.length - 1] : null;
    const lastNote = lastLog ? String(lastLog.Volunteer_Note || '').toLowerCase() : '';
    const lastFlag = lastLog ? String(lastLog.Status_Flag || '').toLowerCase() : '';

    return (
      combo1.includes(q) ||
      combo2.includes(q) ||
      assigned.includes(q) ||
      lastNote.includes(q) ||
      lastFlag.includes(q
