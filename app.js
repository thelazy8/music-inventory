/**
 * app.js - Complete Controller with 2-Tier PIN Auth, Manual/Damaged QR Override,
 * Auto-Flagged Replacement Tag Queue, Live Search, and Avery 60506 Print Engine.
 */

const DEFAULT_GAS_URL = '';

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
  currentInput: '',
  matchedCandidates: [],
  activeStudent: null,
  awaitingIdLink: false,
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
  loginApiBox: document.getElementById('loginApiBox'),
  loginGasUrlInput: document.getElementById('loginGasUrlInput'),
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
 * 1. INITIALIZATION & LOGIN GATE
 * ============================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

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

  if (AppState.userName && AppState.userPin && getGasUrl()) {
    unlockAppWithRole(AppState.userName, AppState.userRole || 'VOLUNTEER');
    syncWithServer(false);
  } else {
    showLoginScreen();
  }

  setInterval(() => flushOutboundQueue(), 15000);
  window.addEventListener('online', () => flushOutboundQueue());
  window.addEventListener('offline', () => updateSyncBadge());
});

function getGasUrl() {
  return localStorage.getItem(STORAGE_KEYS.GAS_URL) || DEFAULT_GAS_URL;
}

function showLoginScreen() {
  UI.loginNameInput.value = AppState.userName || '';
  UI.loginPinInput.value = '';
  const existingUrl = getGasUrl();
  UI.loginGasUrlInput.value = existingUrl;
  UI.loginApiBox.style.display = existingUrl ? 'none' : 'block';
  UI.loginErrorMsg.style.display = 'none';
  UI.loginOverlay.classList.remove('hidden');
}

async function handleLoginAttempt() {
  const name = UI.loginNameInput.value.trim();
  const pin = UI.loginPinInput.value.trim();
  const url = UI.loginGasUrlInput.value.trim() || getGasUrl();

  if (!name) return showLoginError('Please enter your name so scans are attributed.');
  if (!pin) return showLoginError('Please enter the Band Room Access PIN.');
  if (!url || !url.startsWith('https://script.google.com/')) {
    UI.loginApiBox.style.display = 'block';
    return showLoginError('Please paste a valid Google Apps Script Web App URL.');
  }

  localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
  UI.btnLoginSubmit.disabled = true;
  UI.btnLoginSubmit.textContent = 'Verifying PIN...';
  UI.loginErrorMsg.style.display = 'none';

  try {
    const authUrl = `${url}${url.includes('?') ? '&' : '?'}pin=${encodeURIComponent(pin)}`;
    const res = await fetch(authUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data.status === 'UNAUTHORIZED') {
      showLoginError('❌ Invalid PIN. Check with the Band/Orchestra Director.');
      return;
    }

    if (data.status === 'OK') {
      AppState.userName = name;
      AppState.userPin = pin;
      AppState.userRole = data.role || 'VOLUNTEER';

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
        logs: data.logs || []
      });
      await reloadMemoryFromIndexedDB();
      unlockAppWithRole(name, AppState.userRole);
      flushOutboundQueue();
    }
  } catch (err) {
    if (AppState.rosterList.length > 0 && pin === AppState.userPin) {
      unlockAppWithRole(name, AppState.userRole || 'VOLUNTEER');
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
  UI.rosterCountText.textContent = AppState.rosterList.length;
  UI.historyCountText.textContent = AppState.scanHistory.length;

  // Populate section autocomplete list for Manual Override modal
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
      AppState.userRole = data.role || AppState.userRole;
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, AppState.userRole);
      unlockAppWithRole(AppState.userName, AppState.userRole);

      await window.TrackerDB.saveServerBundle({
        roster: data.roster,
        instruments: data.instruments || [],
        logs: data.logs || []
      });
      await reloadMemoryFromIndexedDB();
      if (showAlert) alert(`Synced ${AppState.rosterList.length} students & ${AppState.scanHistory.length} logs.`);
    }
  } catch (err) {
    console.warn('Offline or sync error:', err);
  } finally {
    updateSyncBadge();
  }
}

/* ============================================================================
 * 2. KEYPAD & DUAL-ENSEMBLE STUDENT LOOKUP
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

  if (!inputStr) {
    UI.lineDisplay.textContent = '---';
    UI.studentName.textContent = 'Type Line # or Scan ID';
    UI.studentMeta.textContent = 'Camera scans Student IDs & Cases';
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

function selectActiveStudent(student, showCandidateSwitcher) {
  AppState.activeStudent = student;
  UI.studentName.textContent = student.Student_Name;
  UI.studentMeta.textContent = `${student.Ensemble} • Line #${student.Line_Number}${student.Student_ID ? ' • ID Linked' : ''}`;
  UI.expectedCase.textContent = student.Assigned_Case_ID
    ? `${student.Section} #${student.Assigned_Case_ID}`
    : 'UNASSIGNED';

  UI.studentActionButtons.style.display = 'flex';
  UI.studentCard.classList.add('ready-to-scan');
  UI.cameraCard.classList.add('active-target');
  UI.cameraStatusBadge.textContent = `🎯 Scan ${student.Section} #${student.Assigned_Case_ID}`;

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
 * 3. CAMERA ENGINE & MANUAL OVERRIDE FOR DAMAGED QR CODES
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
  if (UI.manualCaseModal.classList.contains('open')) return;

  const now = Date.now();
  if (now - AppState.lastScanTime < 1400) return;

  const code = String(rawText || '').trim();
  if (!code) return;

  unlockAudio();

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

  if (code.toUpperCase().startsWith('STU|')) {
    AppState.lastScanTime = now;
    const parts = code.split('|');
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

  if (code.toUpperCase().startsWith('INST|')) {
    if (!AppState.activeStudent) {
      UI.cameraStatusBadge.textContent = '⚠️ Enter Student Line # or Scan Student ID First!';
      playTone('WARNING');
      AppState.lastScanTime = now;
      return;
    }

    AppState.lastScanTime = now;
    const parts = code.split('|');
    const scannedSection = (parts[1] || '').trim();
    const scannedCaseId = (parts[2] || '').trim();
    await evaluateAndLogInstrumentScan(scannedSection, scannedCaseId, '');
    return;
  }

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
    await evaluateAndLogInstrumentScan(scannedSection, scannedCaseId, '');
  }
}

/**
 * Opens the Manual Instrument Entry modal when a QR code is damaged or missing.
 */
function openManualCaseModal() {
  if (!AppState.activeStudent) return;
  const stu = AppState.activeStudent;

  if (stu.Section && stu.Assigned_Case_ID) {
    UI.btnQuickConfirmAssigned.style.display = 'block';
    UI.btnQuickConfirmAssigned.textContent = `✓ Log Assigned: ${stu.Section} #${stu.Assigned_Case_ID} (Flag Bad QR)`;
  } else {
    UI.btnQuickConfirmAssigned.style.display = 'none';
  }

  UI.manualSectionInput.value = stu.Section !== 'Unassigned' ? stu.Section : '';
  UI.manualCaseNumInput.value = stu.Assigned_Case_ID || '';
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
 * 4. LIVE SEARCH & STATUS QUERY ENGINE
 * ============================================================================ */
function runStatusSearch(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (!q) {
    UI.searchResultsContainer.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">
      Type an instrument (e.g. <strong>"Trumpet 1"</strong>), student name (e.g. <strong>"Joe"</strong>), or <strong>"Needs QR"</strong> to see damaged tags.
    </div>`;
    return;
  }

  const cardsHtml = [];

  const matchedInstruments = AppState.instrumentsList.filter((inst) => {
    const combo1 = `${inst.Section} ${inst.Case_ID}`.toLowerCase();
    const combo2 = `${inst.Section} #${inst.Case_ID}`.toLowerCase();
    const assigned = (inst.Assigned_Student || '').toLowerCase();

    // Also allow searching "needs qr" or "bad qr" to pull up flagged instruments
    const instLogs = AppState.scanHistory.filter(
      (l) =>
        String(l.Section || '').toUpperCase() === inst.Section.toUpperCase() &&
        String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase()
    );
    const lastNote = instLogs.length > 0 ? String(instLogs[instLogs.length - 1].Volunteer_Note || '').toLowerCase() : '';

    return combo1.includes(q) || combo2.includes(q) || assigned.includes(q) || lastNote.includes(q);
  });

  for (const inst of matchedInstruments) {
    const instLogs = AppState.scanHistory.filter(
      (l) =>
        String(l.Section || '').toUpperCase() === inst.Section.toUpperCase() &&
        String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase()
    );

    const lastLog = instLogs.length > 0 ? instLogs[instLogs.length - 1] : null;
    const isOut = lastLog && lastLog.Action === 'CHECK_OUT';
    const needsQr = lastLog && String(lastLog.Volunteer_Note || '').includes('[NEEDS QR TAG]');

    let statusDetail = `Assigned to: <strong>${inst.Assigned_Student}</strong> (${inst.Ensemble} #${inst.Assigned_Line || '—'})`;
    if (lastLog) {
      const timeStr = formatShortDate(lastLog.Timestamp);
      const scannedByStr = lastLog.Scanned_By ? ` (by ${lastLog.Scanned_By})` : '';
      statusDetail += `<br>Last Action: <strong>${lastLog.Action === 'CHECK_OUT' ? 'Checked OUT' : 'Checked IN'}</strong> to ${lastLog.Student_Name} on ${timeStr}${scannedByStr}`;
      if (needsQr) {
        statusDetail += `<br><span style="color:#fcd34d; font-weight:800;">🔧 FLAGGED: Needs Replacement QR Tag</span>`;
      }
    } else {
      statusDetail += `<br>No check-in/out scans recorded yet.`;
    }

    cardsHtml.push(`
      <div class="result-card">
        <div class="result-card-header">
          <strong style="font-size:1.05rem; color:#38bdf8;">🎺 ${inst.Section} #${inst.Case_ID}</strong>
          <span class="${isOut ? 'badge-out' : 'badge-in'}">${isOut ? 'CHECKED OUT' : 'IN STORAGE'}</span>
        </div>
        <div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">${statusDetail}</div>
      </div>
    `);
  }

  const matchedStudents = AppState.rosterList.filter((stu) => {
    const hay = `${stu.Student_Name} ${stu.Ensemble} ${stu.Section} ${stu.Line_Number}`.toLowerCase();
    return hay.includes(q);
  });

  for (const stu of matchedStudents) {
    const stuLogs = AppState.scanHistory.filter(
      (l) =>
        String(l.Ensemble || '').toUpperCase() === stu.Ensemble.toUpperCase() &&
        Number(l.Line_Number) === Number(stu.Line_Number)
    );

    const lastLog = stuLogs.length > 0 ? stuLogs[stuLogs.length - 1] : null;
    const currentlyOut = lastLog && lastLog.Action === 'CHECK_OUT';

    const lastOutLog = [...stuLogs].reverse().find((l) => l.Action === 'CHECK_OUT');
    const lastInLog = [...stuLogs].reverse().find((l) => l.Action === 'CHECK_IN');

    let historySummary = '';
    if (currentlyOut) {
      historySummary = `Currently has <strong>${lastLog.Section} #${lastLog.Case_ID}</strong> checked OUT since ${formatShortDate(lastLog.Timestamp)}`;
    } else if (lastOutLog || lastInLog) {
      const refInst = lastOutLog
        ? `${lastOutLog.Section} #${lastOutLog.Case_ID}`
        : `${lastInLog.Section} #${lastInLog.Case_ID}`;
      const outTime = lastOutLog ? formatShortDate(lastOutLog.Timestamp) : '—';
      const inTime = lastInLog ? formatShortDate(lastInLog.Timestamp) : '—';
      historySummary = `Nothing currently checked out.<br>Last Instrument: <strong>${refInst}</strong><br>Out: ${outTime} &nbsp;|&nbsp; In: ${inTime}`;
    } else {
      historySummary = `Nothing checked out yet this term.`;
    }

    cardsHtml.push(`
      <div class="result-card">
        <div class="result-card-header">
          <strong style="font-size:1.05rem;">👤 ${stu.Student_Name} (${stu.Ensemble} #${stu.Line_Number})</strong>
          <span class="${currentlyOut ? 'badge-out' : 'badge-in'}">${currentlyOut ? 'HAS INSTRUMENT OUT' : 'ALL CHECKED IN'}</span>
        </div>
        <div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">
          Assigned: <strong>${stu.Section} #${stu.Assigned_Case_ID}</strong><br>
          ${historySummary}
        </div>
      </div>
    `);
  }

  UI.searchResultsContainer.innerHTML =
    cardsHtml.length > 0
      ? cardsHtml.join('')
      : `<div style="color:var(--text-muted); text-align:center; padding:20px;">No matching students or instruments found.</div>`;
}

function formatShortDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return isoStr;
  }
}

/* ============================================================================
 * 5. AVERY 60506 (2" x 2" - 12 PER SHEET) QR TAG & BRANDING GENERATOR
 * ============================================================================ */
function renderAvery60506Sheets() {
  const mode = UI.qrTypeSelect.value;
  const ensFilter = UI.qrEnsembleSelect.value;
  const schoolHeader = UI.qrSchoolHeaderInput.value.trim() || 'MS MUSIC PROGRAM';
  const returnInfo = UI.qrReturnInfoInput.value.trim() || 'If found, return to Music Room';

  localStorage.setItem(STORAGE_KEYS.SCHOOL_HEADER, schoolHeader);
  localStorage.setItem(STORAGE_KEYS.RETURN_INFO, returnInfo);

  const labelItems = [];

  if (mode === 'SINGLE_INST' || mode === 'SINGLE_STU') {
    const startSlot = Math.max(1, Math.min(12, parseInt(UI.qrStartSlotInput.value, 10) || 1));
    for (let s = 1; s < startSlot; s++) {
      labelItems.push({ emptySlot: true });
    }

    if (mode === 'SINGLE_INST') {
      const sec = UI.qrInputPrimary.value.trim() || 'Trumpet';
      const num = UI.qrInputSecondary.value.trim() || '1';
      labelItems.push({
        payload: `INST|${sec}|${num}`,
        mainTitle: `${sec.toUpperCase()} #${num}`,
        subTitle: ensFilter === 'ALL' ? 'School Instrument' : ensFilter
      });
    } else {
      const name = UI.qrInputPrimary.value.trim() || 'Student';
      const line = UI.qrInputSecondary.value.trim() || '1';
      const ens = ensFilter === 'ALL' ? 'Band' : ensFilter;
      labelItems.push({
        payload: `STU|${ens}|${line}`,
        mainTitle: `${ens.toUpperCase()} #${line}`,
        subTitle: name
      });
    }
  } else if (mode === 'FLAGGED_BAD_QR') {
    // Automatically pull every unique instrument whose latest scan was flagged with [NEEDS QR TAG]
    const flaggedSet = new Set();
    for (const log of AppState.scanHistory) {
      const key = `${String(log.Section || '').toUpperCase()}|${String(log.Case_ID || '').toUpperCase()}`;
      if (String(log.Volunteer_Note || '').includes('[NEEDS QR TAG]')) {
        flaggedSet.add(key);
      } else if (flaggedSet.has(key)) {
        // If it was subsequently scanned normally via QR, it no longer needs a tag!
        flaggedSet.delete(key);
      }
    }

    for (const key of flaggedSet) {
      const [sec, num] = key.split('|');
      const matchedInst = AppState.instrumentsList.find((i) => i.inst_key === key);
      labelItems.push({
        payload: `INST|${matchedInst ? matchedInst.Section : sec}|${matchedInst ? matchedInst.Case_ID : num}`,
        mainTitle: `${sec} #${num}`,
        subTitle: matchedInst ? `${matchedInst.Ensemble} • ${matchedInst.Assigned_Student}` : 'Replacement Tag'
      });
    }
  } else if (mode === 'BATCH_INST') {
    const list = AppState.instrumentsList.filter(
      (i) => ensFilter === 'ALL' || i.Ensemble.toUpperCase() === ensFilter.toUpperCase()
    );
    for (const inst of list) {
      labelItems.push({
        payload: `INST|${inst.Section}|${inst.Case_ID}`,
        mainTitle: `${inst.Section.toUpperCase()} #${inst.Case_ID}`,
        subTitle: `${inst.Ensemble} • ${inst.Assigned_Student}`
      });
    }
  } else if (mode === 'BATCH_STU') {
    const list = AppState.rosterList.filter(
      (s) => ensFilter === 'ALL' || s.Ensemble.toUpperCase() === ensFilter.toUpperCase()
    );
    for (const stu of list) {
      labelItems.push({
        payload: `STU|${stu.Ensemble}|${stu.Line_Number}`,
        mainTitle: `${stu.Ensemble.toUpperCase()} #${stu.Line_Number}`,
        subTitle: `${stu.Student_Name} (${stu.Section} #${stu.Assigned_Case_ID})`
      });
    }
  } else if (mode === 'RETURN_ONLY') {
    for (let i = 0; i < 12; i++) {
      labelItems.push({ returnStickerOnly: true });
    }
  }

  UI.qrPreviewGrid.innerHTML = '';

  if (labelItems.length === 0) {
    UI.qrPreviewGrid.innerHTML = `<div style="color:var(--text-muted); padding:24px; text-align:center;">
      No flagged "Bad QR" cases found! All scanned tags are currently working.
    </div>`;
    return;
  }

  for (let i = 0; i < labelItems.length; i += 12) {
    const pageSlice = labelItems.slice(i, i + 12);
    const pageEl = document.createElement('div');
    pageEl.className = 'avery-page';

    for (const item of pageSlice) {
      const cell = document.createElement('div');
      cell.className = 'avery-label-cell';

      if (item.emptySlot) {
        cell.style.borderColor = 'transparent';
        pageEl.appendChild(cell);
        continue;
      }

      const headerBand = document.createElement('div');
      headerBand.className = 'tag-header-band';

      if (AppState.schoolLogoDataUrl) {
        const logoImg = document.createElement('img');
        logoImg.className = 'tag-logo-img';
        logoImg.src = AppState.schoolLogoDataUrl;
        headerBand.appendChild(logoImg);
      }

      const schoolBlock = document.createElement('div');
      schoolBlock.className = 'tag-school-block';
      schoolBlock.innerHTML = `
        <div class="tag-school-name">${escapeHtml(schoolHeader)}</div>
        <div class="tag-return-text">${escapeHtml(returnInfo)}</div>
      `;
      headerBand.appendChild(schoolBlock);
      cell.appendChild(headerBand);

      if (item.returnStickerOnly) {
        const centerNotice = document.createElement('div');
        centerNotice.style.padding = '8px 4px';
        centerNotice.innerHTML = `
          <div style="font-size:11pt; font-weight:900; margin-bottom:4px;">SCHOOL PROPERTY</div>
          <div style="font-size:8pt; font-weight:700; line-height:1.25;">${escapeHtml(returnInfo)}</div>
        `;
        cell.appendChild(centerNotice);

        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.innerHTML = `<div class="tag-sub-id">DO NOT REMOVE TAG FROM CASE</div>`;
        cell.appendChild(footerBand);
      } else {
        const qrWrap = document.createElement('div');
        qrWrap.className = 'tag-qr-wrap';
        const canvas = document.createElement('canvas');
        new QRious({
          element: canvas,
          value: item.payload,
          size: 108,
          level: 'H'
        });
        qrWrap.appendChild(canvas);
        cell.appendChild(qrWrap);

        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.innerHTML = `
          <div class="tag-main-id">${escapeHtml(item.mainTitle)}</div>
          <div class="tag-sub-id">${escapeHtml(item.subTitle)}</div>
        `;
        cell.appendChild(footerBand);
      }

      pageEl.appendChild(cell);
    }

    UI.qrPreviewGrid.appendChild(pageEl);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================================
 * 6. WEB AUDIO, HAPTICS, & BACKGROUND QUEUE SYNC
 * ============================================================================ */
function unlockAudio() {
  if (!AppState.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) AppState.audioCtx = new AudioCtx();
  }
  if (AppState.audioCtx && AppState.audioCtx.state === 'suspended') {
    AppState.audioCtx.resume();
  }
}

function playTone(type) {
  if (!AppState.audioCtx) return;
  const ctx = AppState.audioCtx;
  const now = ctx.currentTime;

  if (type === 'MATCH') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1318.5, now + 0.07);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } else {
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    }
  }
}

function vibrateDevice(type) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(type === 'MATCH' ? 70 : [140, 70, 140]);
    } catch (_) {}
  }
}

async function flushOutboundQueue() {
  if (AppState.isSyncing || !navigator.onLine || !AppState.userPin) {
    updateSyncBadge();
    return;
  }
  const gasUrl = getGasUrl();
  if (!gasUrl) return;

  const pending = await window.TrackerDB.getAllStore('sync_queue');
  if (pending.length === 0) {
    updateSyncBadge();
    return;
  }

  AppState.isSyncing = true;
  updateSyncBadge();

  try {
    for (const item of pending) {
      if (!navigator.onLine) break;
      item.Auth_PIN = item.Auth_PIN || AppState.userPin;
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(item),
        redirect: 'follow'
      });
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.status !== 'UNAUTHORIZED') {
          await window.TrackerDB.removeQueueItem(item.local_id);
        } else {
          break;
        }
      } else {
        break;
      }
    }
  } catch (err) {
    console.warn('Queue sync paused (offline):', err);
  } finally {
    AppState.isSyncing = false;
    updateSyncBadge();
  }
}

async function updateSyncBadge() {
  const pending = await window.TrackerDB.getAllStore('sync_queue');
  const count = pending.length;
  UI.queueCountText.textContent = count;
  UI.syncBadge.classList.remove('pending', 'offline');

  if (!navigator.onLine) {
    UI.syncBadge.classList.add('offline');
    UI.syncText.textContent = `Offline (${count})`;
  } else if (count > 0) {
    UI.syncBadge.classList.add('pending');
    UI.syncText.textContent = `Syncing (${count})`;
  } else {
    UI.syncText.textContent = 'Synced';
  }
}

/* ============================================================================
 * 7. UI NAVIGATION & EVENT LISTENERS
 * ============================================================================ */
function applyModeUI(mode) {
  AppState.actionMode = mode;
  localStorage.setItem(STORAGE_KEYS.ACTION_MODE, mode);
  UI.btnModeIn.classList.toggle('active-in', mode === 'CHECK_IN');
  UI.btnModeOut.classList.toggle('active-out', mode === 'CHECK_OUT');
}

function bindEvents() {
  UI.btnLoginSubmit.addEventListener('click', handleLoginAttempt);
  UI.loginPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLoginAttempt();
  });

  UI.userBadgeBtn.addEventListener('click', showLoginScreen);

  UI.navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.view === 'viewQr' && AppState.userRole !== 'ADMIN') {
        alert('🔒 The QR Tag Generator requires the Director Admin PIN. Tap your name badge in the top bar to switch to the Admin PIN.');
        return;
      }

      UI.navTabs.forEach((t) => t.classList.remove('active'));
      UI.views.forEach((v) => v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.view).classList.add('active');

      if (tab.dataset.view === 'viewSearch') {
        runStatusSearch(UI.searchInput.value);
      } else if (tab.dataset.view === 'viewQr') {
        renderAvery60506Sheets();
      }
    });
  });

  UI.btnModeIn.addEventListener('click', () => applyModeUI('CHECK_IN'));
  UI.btnModeOut.addEventListener('click', () => applyModeUI('CHECK_OUT'));

  UI.ensembleFilterGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;
    UI.ensembleFilterGroup.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active-ens'));
    btn.classList.add('active-ens');
    AppState.ensembleFilter = btn.dataset.ens;
    lookupByLineNumber(AppState.currentInput);
  });

  UI.keypadGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.key-btn');
    if (btn) handleKeypad(btn.dataset.key);
  });

  // Manual Case / Bad QR Modal Bindings
  UI.btnManualCase.addEventListener('click', openManualCaseModal);
  UI.btnCancelManual.addEventListener('click', () => UI.manualCaseModal.classList.remove('open'));

  UI.btnQuickConfirmAssigned.addEventListener('click', async () => {
    if (!AppState.activeStudent) return;
    UI.manualCaseModal.classList.remove('open');
    await evaluateAndLogInstrumentScan(
      AppState.activeStudent.Section,
      AppState.activeStudent.Assigned_Case_ID,
      '[NEEDS QR TAG] Manual Entry - Damaged/Missing QR'
    );
  });

  UI.btnSubmitManual.addEventListener('click', async () => {
    const sec = UI.manualSectionInput.value.trim();
    const num = UI.manualCaseNumInput.value.trim();
    if (!sec || !num) {
      alert('Please enter both Instrument Section (e.g. Trumpet) and Case #.');
      return;
    }
    const note = UI.chkFlagBadQr.checked
      ? '[NEEDS QR TAG] Manual Entry - Damaged/Missing QR'
      : 'Manual Entry';
    UI.manualCaseModal.classList.remove('open');
    await evaluateAndLogInstrumentScan(sec, num, note);
  });

  UI.btnLinkSchoolId.addEventListener('click', () => {
    AppState.awaitingIdLink = !AppState.awaitingIdLink;
    UI.btnLinkSchoolId.textContent = AppState.awaitingIdLink ? '📷 Scan ID...' : '🔗 Link ID';
  });

  UI.btnNextStudent.addEventListener('click', () => resetScannerState());
  UI.btnAddNote.addEventListener('click', () => {
    UI.noteInput.value = '';
    UI.noteModal.classList.add('open');
  });

  document.querySelectorAll('.note-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      UI.noteInput.value = chip.dataset.note;
    });
  });

  UI.btnCancelNote.addEventListener('click', () => UI.noteModal.classList.remove('open'));
  UI.btnSaveNote.addEventListener('click', async () => {
    const noteText = UI.noteInput.value.trim();
    UI.noteModal.classList.remove('open');
    if (noteText && AppState.lastTransaction) {
      const updated = await window.TrackerDB.updateQueuedNote(AppState.lastTransaction.local_id, noteText);
      if (!updated) {
        const followUp = { ...AppState.lastTransaction, Volunteer_Note: `[NOTE] ${noteText}` };
        delete followUp.local_id;
        await window.TrackerDB.enqueueItem(followUp);
      }
      flushOutboundQueue();
    }
    resetScannerState();
  });

  UI.searchInput.addEventListener('input', (e) => runStatusSearch(e.target.value));

  UI.chkShowCutLines.addEventListener('change', (e) => {
    UI.qrPreviewGrid.classList.toggle('hide-cut-lines', !e.target.checked);
  });

  UI.qrTypeSelect.addEventListener('change', () => {
    const isSingle = UI.qrTypeSelect.value.startsWith('SINGLE_');
    UI.qrSingleInputs.style.display = isSingle ? 'grid' : 'none';
    if (UI.qrTypeSelect.value === 'SINGLE_STU') {
      UI.qrInputPrimary.placeholder = 'Student Name (e.g. Joe Band)';
      UI.qrInputSecondary.placeholder = 'Line # (e.g. 1)';
    } else {
      UI.qrInputPrimary.placeholder = 'Instrument (e.g. Trumpet)';
      UI.qrInputSecondary.placeholder = 'Case # (e.g. 7)';
    }
    renderAvery60506Sheets();
  });

  UI.qrEnsembleSelect.addEventListener('change', renderAvery60506Sheets);
  UI.qrSchoolHeaderInput.addEventListener('input', renderAvery60506Sheets);
  UI.qrReturnInfoInput.addEventListener('input', renderAvery60506Sheets);
  UI.qrInputPrimary.addEventListener('input', renderAvery60506Sheets);
  UI.qrInputSecondary.addEventListener('input', renderAvery60506Sheets);
  UI.qrStartSlotInput.addEventListener('input', renderAvery60506Sheets);

  UI.qrLogoFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      AppState.schoolLogoDataUrl = ev.target.result;
      localStorage.setItem(STORAGE_KEYS.SCHOOL_LOGO, AppState.schoolLogoDataUrl);
      UI.btnClearLogo.style.display = 'inline-block';
      renderAvery60506Sheets();
    };
    reader.readAsDataURL(file);
  });

  UI.btnClearLogo.addEventListener('click', () => {
    AppState.schoolLogoDataUrl = '';
    localStorage.removeItem(STORAGE_KEYS.SCHOOL_LOGO);
    UI.qrLogoFileInput.value = '';
    UI.btnClearLogo.style.display = 'none';
    renderAvery60506Sheets();
  });

  UI.btnPrintQr.addEventListener('click', () => window.print());

  UI.syncBadge.addEventListener('click', () => syncWithServer(false));
  UI.btnSettings.addEventListener('click', () => {
    UI.gasUrlInput.value = getGasUrl();
    UI.settingsModal.classList.add('open');
  });
  UI.btnCloseSettings.addEventListener('click', () => UI.settingsModal.classList.remove('open'));
  UI.btnSaveSettings.addEventListener('click', async () => {
    const url = UI.gasUrlInput.value.trim();
    if (url) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
      UI.settingsModal.classList.remove('open');
      await syncWithServer(true);
    }
  });
  UI.btnReloadRoster.addEventListener('click', async () => {
    const url = UI.gasUrlInput.value.trim();
    if (url) localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
    await syncWithServer(true);
  });
}