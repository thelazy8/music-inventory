/**
 * app.js - Complete Controller (Untruncated)
 * Features: Fail-Safe PIN Login, Repair Tracking + Invoice Scanner,
 * Clean Instrument QR Tags (No Student Names), Avery 60506 & 97184 Templates,
 * and Start Row / Start Column Partial Sheet Saver.
 */

// 👇👇 PASTE YOUR GOOGLE APPS SCRIPT WEB APP (/exec) URL BETWEEN THE QUOTES BELOW 👇👇
const DEFAULT_GAS_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

const STORAGE_KEYS = {
  GAS_URL: 'instrument_tracker_gas_url',
  ACTION_MODE: 'instrument_tracker_action_mode',
  USER_NAME: 'instrument_tracker_user_name',
  USER_PIN: 'instrument_tracker_user_pin',
  USER_ROLE: 'instrument_tracker_user_role',
  SCHOOL_HEADER: 'instrument_tracker_school_header',
  RETURN_INFO: 'instrument_tracker_return_info',
  SCHOOL_LOGO: 'instrument_tracker_school_logo',
  AVERY_TEMPLATE: 'instrument_tracker_avery_template'
};

const AppState = {
  actionMode: localStorage.getItem(STORAGE_KEYS.ACTION_MODE) || 'CHECK_IN',
  userName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || '',
  userPin: localStorage.getItem(STORAGE_KEYS.USER_PIN) || '',
  userRole: localStorage.getItem(STORAGE_KEYS.USER_ROLE) || '',
  schoolHeader: localStorage.getItem(STORAGE_KEYS.SCHOOL_HEADER) || 'MS MUSIC PROGRAM',
  returnInfo: localStorage.getItem(STORAGE_KEYS.RETURN_INFO) || 'If found, return to Music Room',
  schoolLogoDataUrl: localStorage.getItem(STORAGE_KEYS.SCHOOL_LOGO) || '',
  averyTemplate: localStorage.getItem(STORAGE_KEYS.AVERY_TEMPLATE) || '60506',
  ensembleFilter: 'ALL',
  rosterList: [],
  instrumentsList: [],
  scanHistory: [],
  repairsHistory: [],
  currentInput: '',
  matchedCandidates: [],
  activeStudent: null,
  awaitingIdLink: false,
  pendingRepairInstrument: null,
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
  qrTemplateSelect: document.getElementById('qrTemplateSelect'),
  qrStartRowSelect: document.getElementById('qrStartRowSelect'),
  qrStartColSelect: document.getElementById('qrStartColSelect'),
  qrTypeSelect: document.getElementById('qrTypeSelect'),
  qrEnsembleSelect: document.getElementById('qrEnsembleSelect'),
  qrSchoolHeaderInput: document.getElementById('qrSchoolHeaderInput'),
  qrReturnInfoInput: document.getElementById('qrReturnInfoInput'),
  qrLogoFileInput: document.getElementById('qrLogoFileInput'),
  btnClearLogo: document.getElementById('btnClearLogo'),
  qrSingleInputs: document.getElementById('qrSingleInputs'),
  qrPrimaryLabel: document.getElementById('qrPrimaryLabel'),
  qrSecondaryLabel: document.getElementById('qrSecondaryLabel'),
  qrInputPrimary: document.getElementById('qrInputPrimary'),
  qrInputSecondary: document.getElementById('qrInputSecondary'),
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
 * 1. INITIALIZATION & FAIL-SAFE LOGIN
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
  UI.qrTemplateSelect.value = AppState.averyTemplate;
  updateStartColOptions();
  UI.qrSchoolHeaderInput.value = AppState.schoolHeader;
  UI.qrReturnInfoInput.value = AppState.returnInfo;
  if (AppState.schoolLogoDataUrl) UI.btnClearLogo.style.display = 'inline-block';

  bindEvents();

  await window.TrackerDB.init();
  await reloadMemoryFromIndexedDB();
  await updateSyncBadge();

  if (AppState.userName && AppState.userPin) {
    const role = resolveClientRole(AppState.userPin, AppState.userRole);
    unlockAppWithRole(AppState.userName, role);
    syncWithServer(false);
  } else {
    showLoginScreen();
  }

  setInterval(() => flushOutboundQueue(), 15000);
  window.addEventListener('online', () => flushOutboundQueue());
  window.addEventListener('offline', () => updateSyncBadge());
});

function getGasUrl() {
  if (DEFAULT_GAS_URL && DEFAULT_GAS_URL.startsWith('https://script.google.com/')) {
    return DEFAULT_GAS_URL.trim();
  }
  const saved = localStorage.getItem(STORAGE_KEYS.GAS_URL);
  if (saved && saved.startsWith('https://script.google.com/')) {
    return saved.trim();
  }
  return '';
}

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

  const isKnownDefaultPin = pin === '2468' || pin === '9988';

  // If no GAS URL is configured yet, allow 9988 or 2468 in immediately
  if (!url) {
    if (isKnownDefaultPin) {
      completeLoginSession(name, pin, resolveClientRole(pin, null));
      if (AppState.userRole === 'ADMIN') UI.settingsModal.classList.add('open');
      return;
    }
    return showLoginError('Enter PIN 2468 (Volunteer) or 9988 (Admin).');
  }

  UI.btnLoginSubmit.disabled = true;
  UI.btnLoginSubmit.textContent = 'Verifying PIN...';
  UI.loginErrorMsg.style.display = 'none';

  try {
    const authUrl = `${url}${url.includes('?') ? '&' : '?'}pin=${encodeURIComponent(pin)}`;
    const res = await fetch(authUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data.status === 'UNAUTHORIZED' && !isKnownDefaultPin) {
      showLoginError('❌ Invalid PIN. Check with the Music Director.');
      return;
    }

    const role = resolveClientRole(pin, data.role);
    completeLoginSession(name, pin, role);

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

    if (Array.isArray(data.roster)) {
      await window.TrackerDB.saveServerBundle({
        roster: data.roster || [],
        instruments: data.instruments || [],
        logs: data.logs || [],
        repairs: data.repairs || []
      });
      await reloadMemoryFromIndexedDB();
    }
    flushOutboundQueue();
  } catch (err) {
    // Fail-safe: If GAS throws an error or phone is offline, still allow default PINs or cached PIN in!
    if (isKnownDefaultPin || pin === AppState.userPin) {
      completeLoginSession(name, pin, resolveClientRole(pin, AppState.userRole));
    } else {
      showLoginError('Could not verify PIN with server. Use 2468 or 9988.');
    }
  } finally {
    UI.btnLoginSubmit.disabled = false;
    UI.btnLoginSubmit.textContent = '🔓 Unlock Scanner';
    updateSyncBadge();
  }
}

function completeLoginSession(name, pin, role) {
  AppState.userName = name;
  AppState.userPin = pin;
  AppState.userRole = role;
  localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
  localStorage.setItem(STORAGE_KEYS.USER_PIN, pin);
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  unlockAppWithRole(name, role);
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
      UI.invoicePreviewText.textContent = '✓ Invoice Scanned & Ready to Upload to Google Drive';
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
 * 4. LIVE SEARCH & STATUS QUERY ENGINE (INCLUDES REPAIR STATUS)
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
      lastFlag.includes(q)
    );
  });

  for (const inst of matchedInstruments) {
    const instLogs = AppState.scanHistory.filter(
      (l) =>
        String(l.Section || '').toUpperCase() === inst.Section.toUpperCase() &&
        String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase()
    );

    const lastLog = instLogs.length > 0 ? instLogs[instLogs.length - 1] : null;
    const inRepair = lastLog && String(lastLog.Status_Flag) === 'SENT_TO_REPAIR';
    const isOut = lastLog && lastLog.Action === 'CHECK_OUT';
    const needsQr = lastLog && String(lastLog.Volunteer_Note || '').includes('[NEEDS QR TAG]');

    let badgeClass = 'badge-in';
    let badgeLabel = 'IN STORAGE';
    if (inRepair) {
      badgeClass = 'badge-repair';
      badgeLabel = '🔧 IN REPAIR';
    } else if (isOut) {
      badgeClass = 'badge-out';
      badgeLabel = 'CHECKED OUT';
    }

    let statusDetail = `Roster Assignment: <strong>${inst.Assigned_Student}</strong> (${inst.Ensemble} #${inst.Assigned_Line || '—'})`;
    if (lastLog) {
      const timeStr = formatShortDate(lastLog.Timestamp);
      const scannedByStr = lastLog.Scanned_By ? ` (by ${lastLog.Scanned_By})` : '';
      statusDetail += `<br>Last Action: <strong>${inRepair ? 'Sent to Repair' : lastLog.Action === 'CHECK_OUT' ? 'Checked OUT' : 'Checked IN'}</strong> — ${lastLog.Student_Name} on ${timeStr}${scannedByStr}`;
      if (lastLog.Volunteer_Note) {
        statusDetail += `<br>Note: <em>${escapeHtml(lastLog.Volunteer_Note)}</em>`;
      }
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
          <span class="${badgeClass}">${badgeLabel}</span>
        </div>
        <div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">${statusDetail}</div>
      </div>
    `);
  }

  const matchedStudents = AppState.rosterList.filter((stu) => {
    if (isRepairShopEntity(stu)) return false;
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
 * 5. AVERY 60506 (2x2) & AVERY 97184 (3x2) QR GENERATOR + ROW/COL OFFSET
 * ============================================================================ */
function updateStartColOptions() {
  const tpl = UI.qrTemplateSelect.value;
  const maxCols = tpl === '97184' ? 2 : 3;
  const currentCol = parseInt(UI.qrStartColSelect.value, 10) || 1;

  UI.qrStartColSelect.innerHTML =
    maxCols === 2
      ? `<option value="1">Col 1 (Left)</option><option value="2">Col 2 (Right)</option>`
      : `<option value="1">Col 1 (Left)</option><option value="2">Col 2 (Middle)</option><option value="3">Col 3 (Right)</option>`;

  UI.qrStartColSelect.value = String(Math.min(currentCol, maxCols));
}

function renderLabelSheets() {
  const tpl = UI.qrTemplateSelect.value; // "60506" (3x4=12) or "97184" (2x4=8)
  const colsPerPage = tpl === '97184' ? 2 : 3;
  const labelsPerPage = tpl === '97184' ? 8 : 12;

  const startRow = Math.max(1, Math.min(4, parseInt(UI.qrStartRowSelect.value, 10) || 1));
  const startCol = Math.max(1, Math.min(colsPerPage, parseInt(UI.qrStartColSelect.value, 10) || 1));
  const emptySkipCount = (startRow - 1) * colsPerPage + (startCol - 1);

  const mode = UI.qrTypeSelect.value;
  const ensFilter = UI.qrEnsembleSelect.value;
  const schoolHeader = UI.qrSchoolHeaderInput.value.trim() || 'MS MUSIC PROGRAM';
  const returnInfo = UI.qrReturnInfoInput.value.trim() || 'If found, return to Music Room';

  localStorage.setItem(STORAGE_KEYS.AVERY_TEMPLATE, tpl);
  localStorage.setItem(STORAGE_KEYS.SCHOOL_HEADER, schoolHeader);
  localStorage.setItem(STORAGE_KEYS.RETURN_INFO, returnInfo);

  const labelItems = [];

  // Insert blank placeholder slots before (Start Row, Start Column) to conserve partial sticker sheets!
  for (let s = 0; s < emptySkipCount; s++) {
    labelItems.push({ emptySlot: true });
  }

  if (mode === 'SINGLE_INST') {
    const sec = UI.qrInputPrimary.value.trim() || 'Trumpet';
    const num = UI.qrInputSecondary.value.trim() || '1';
    labelItems.push({
      payload: `INST|${sec}|${num}`,
      mainTitle: `${sec.toUpperCase()} #${num}`,
      subTitle: '' // No student names or bottom subtitle on instrument tags!
    });
  } else if (mode === 'SINGLE_STU') {
    const name = UI.qrInputPrimary.value.trim() || 'Student';
    const line = UI.qrInputSecondary.value.trim() || '1';
    const ens = ensFilter === 'ALL' ? 'Band' : ensFilter;
    labelItems.push({
      payload: `STU|${ens}|${line}`,
      mainTitle: `${ens.toUpperCase()} #${line}`,
      subTitle: name
    });
  } else if (mode === 'REPAIR_SHOP_QR') {
    labelItems.push({
      payload: 'SHOP|900|Repair Shop',
      mainTitle: 'REPAIR SHOP #900',
      subTitle: ''
    });
  } else if (mode === 'FLAGGED_BAD_QR') {
    const flaggedSet = new Set();
    for (const log of AppState.scanHistory) {
      const key = `${String(log.Section || '').toUpperCase()}|${String(log.Case_ID || '').toUpperCase()}`;
      if (String(log.Volunteer_Note || '').includes('[NEEDS QR TAG]')) {
        flaggedSet.add(key);
      } else if (flaggedSet.has(key)) {
        flaggedSet.delete(key);
      }
    }
    for (const key of flaggedSet) {
      const [sec, num] = key.split('|');
      const matchedInst = AppState.instrumentsList.find((i) => i.inst_key === key);
      labelItems.push({
        payload: `INST|${matchedInst ? matchedInst.Section : sec}|${matchedInst ? matchedInst.Case_ID : num}`,
        mainTitle: `${sec} #${num}`,
        subTitle: '' // Clean instrument tag with no student name
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
        subTitle: '' // Clean instrument tag with no student name
      });
    }
  } else if (mode === 'BATCH_STU') {
    const list = AppState.rosterList.filter(
      (s) =>
        !isRepairShopEntity(s) &&
        (ensFilter === 'ALL' || s.Ensemble.toUpperCase() === ensFilter.toUpperCase())
    );
    for (const stu of list) {
      labelItems.push({
        payload: `STU|${stu.Ensemble}|${stu.Line_Number}`,
        mainTitle: `${stu.Ensemble.toUpperCase()} #${stu.Line_Number}`,
        subTitle: stu.Student_Name
      });
    }
  } else if (mode === 'RETURN_ONLY') {
    const remainingOnFirstSheet = labelsPerPage - emptySkipCount;
    for (let i = 0; i < remainingOnFirstSheet; i++) {
      labelItems.push({ returnStickerOnly: true });
    }
  }

  UI.qrPreviewGrid.innerHTML = '';

  const actualPrintedCount = labelItems.filter((x) => !x.emptySlot).length;
  if (actualPrintedCount === 0) {
    UI.qrPreviewGrid.innerHTML = `<div style="color:var(--text-muted); padding:24px; text-align:center;">
      No matching tags to generate (all scanned QR codes are currently working).
    </div>`;
    return;
  }

  for (let i = 0; i < labelItems.length; i += labelsPerPage) {
    const pageSlice = labelItems.slice(i, i + labelsPerPage);
    const pageEl = document.createElement('div');
    pageEl.className = `avery-page tpl-${tpl}`;

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
          size: tpl === '97184' ? 116 : 112,
          level: 'H'
        });
        qrWrap.appendChild(canvas);
        cell.appendChild(qrWrap);

        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.innerHTML = `
          <div class="tag-main-id">${escapeHtml(item.mainTitle)}</div>
          ${item.subTitle ? `<div class="tag-sub-id">${escapeHtml(item.subTitle)}</div>` : ''}
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
 * 6
