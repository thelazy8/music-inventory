/**
 * app.js - Complete Controller (v10: Multi-Row Return_Line_1/2/3 + Sheet-Driven Logo Size & Position)
 */
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzSdFeiLX9wMGEkTAtviNUKABb_haLkxnAxlLJGaLYXbLO0T9PvhPOSM2pcNrjNHwkqqw/exec';

const STORAGE_KEYS = {
  GAS_URL: 'instrument_tracker_gas_url',
  ACTION_MODE: 'instrument_tracker_action_mode',
  USER_NAME: 'instrument_tracker_user_name',
  SCHOOL_HEADER: 'instrument_tracker_school_header',
  RETURN_LINES: 'instrument_tracker_return_lines',
  SCHOOL_LOGO: 'instrument_tracker_school_logo',
  LOGO_POSITION: 'instrument_tracker_logo_pos',
  LOGO_SIZE_PX: 'instrument_tracker_logo_size',
  QR_SIZE_PX: 'instrument_tracker_qr_size',
  AVERY_TEMPLATE: 'instrument_tracker_avery_template'
};

const AppState = {
  actionMode: localStorage.getItem(STORAGE_KEYS.ACTION_MODE) || 'CHECK_IN',
  userName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || '',
  userPin: '',
  userRole: '',
  schoolHeader: localStorage.getItem(STORAGE_KEYS.SCHOOL_HEADER) || 'MS MUSIC PROGRAM',
  returnLines: JSON.parse(localStorage.getItem(STORAGE_KEYS.RETURN_LINES) || '["If found, return to Music Room"]'),
  schoolLogoDataUrl: localStorage.getItem(STORAGE_KEYS.SCHOOL_LOGO) || '',
  logoPosition: localStorage.getItem(STORAGE_KEYS.LOGO_POSITION) || 'LEFT',
  logoSizePx: parseInt(localStorage.getItem(STORAGE_KEYS.LOGO_SIZE_PX), 10) || 48,
  qrSizePx: parseInt(localStorage.getItem(STORAGE_KEYS.QR_SIZE_PX), 10) || 0,
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
  qrCustomFilterBox: document.getElementById('qrCustomFilterBox'),
  qrCustomQueryInput: document.getElementById('qrCustomQueryInput'),
  qrSingleInputs: document.getElementById('qrSingleInputs'),
  qrSingleSpecsRow: document.getElementById('qrSingleSpecsRow'),
  qrInputPrimary: document.getElementById('qrInputPrimary'),
  qrInputSecondary: document.getElementById('qrInputSecondary'),
  qrInputBrand: document.getElementById('qrInputBrand'),
  qrInputModel: document.getElementById('qrInputModel'),
  qrInputSerial: document.getElementById('qrInputSerial'),
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

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=10').catch(() => {});
  localStorage.removeItem('instrument_tracker_user_pin');
  localStorage.removeItem('instrument_tracker_user_role');

  const params = new URLSearchParams(window.location.search);
  const apiParam = params.get('api');
  if (apiParam && apiParam.startsWith('https://script.google.com/')) {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, apiParam.trim());
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  applyModeUI(AppState.actionMode);
  if (UI.qrTemplateSelect) {
    UI.qrTemplateSelect.value = AppState.averyTemplate;
    updateStartColOptions();
  }

  bindEvents();
  await window.TrackerDB.init();
  await reloadMemoryFromIndexedDB();
  await updateSyncBadge();

  showLoginScreen();
  setInterval(() => flushOutboundQueue(), 15000);
  window.addEventListener('online', () => flushOutboundQueue());
  window.addEventListener('offline', () => updateSyncBadge());
});

function getGasUrl() {
  if (DEFAULT_GAS_URL && DEFAULT_GAS_URL.startsWith('https://script.google.com/')) return DEFAULT_GAS_URL.trim();
  const saved = localStorage.getItem(STORAGE_KEYS.GAS_URL);
  return saved && saved.startsWith('https://script.google.com/') ? saved.trim() : '';
}

function applyMasterSheetBranding(data) {
  if (typeof data.schoolHeader === 'string' && data.schoolHeader) {
    AppState.schoolHeader = data.schoolHeader;
    localStorage.setItem(STORAGE_KEYS.SCHOOL_HEADER, data.schoolHeader);
  }
  if (Array.isArray(data.returnLines) && data.returnLines.length > 0) {
    AppState.returnLines = data.returnLines;
    localStorage.setItem(STORAGE_KEYS.RETURN_LINES, JSON.stringify(data.returnLines));
  } else if (typeof data.returnInfo === 'string' && data.returnInfo) {
    const lines = data.returnInfo.split(/\r?\n|\|/).map((s) => s.trim()).filter(Boolean);
    AppState.returnLines = lines;
    localStorage.setItem(STORAGE_KEYS.RETURN_LINES, JSON.stringify(lines));
  }
  if (typeof data.schoolLogo === 'string') {
    AppState.schoolLogoDataUrl = data.schoolLogo;
    if (data.schoolLogo) localStorage.setItem(STORAGE_KEYS.SCHOOL_LOGO, data.schoolLogo);
    else localStorage.removeItem(STORAGE_KEYS.SCHOOL_LOGO);
  }
  if (typeof data.logoPosition === 'string' && data.logoPosition) {
    AppState.logoPosition = data.logoPosition.toUpperCase();
    localStorage.setItem(STORAGE_KEYS.LOGO_POSITION, AppState.logoPosition);
  }
  if (typeof data.logoSizePx === 'number' && data.logoSizePx > 0) {
    AppState.logoSizePx = data.logoSizePx;
    localStorage.setItem(STORAGE_KEYS.LOGO_SIZE_PX, String(data.logoSizePx));
  }
  if (typeof data.qrSizePx === 'number') {
    AppState.qrSizePx = data.qrSizePx;
    localStorage.setItem(STORAGE_KEYS.QR_SIZE_PX, String(data.qrSizePx));
  }
}

function showLoginScreen() {
  AppState.userPin = '';
  AppState.userRole = '';
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
  if (!url) return showLoginError('Database URL not configured in app.js yet.');

  UI.btnLoginSubmit.disabled = true;
  UI.btnLoginSubmit.textContent = 'Verifying PIN...';
  UI.loginErrorMsg.style.display = 'none';

  try {
    const authUrl = `${url}${url.includes('?') ? '&' : '?'}pin=${encodeURIComponent(pin)}`;
    const res = await fetch(authUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data.status === 'UNAUTHORIZED') return showLoginError('Invalid Access PIN. Please check with the Music Director.');

    let role = data.role || (pin === '9988' ? 'ADMIN' : pin === '2468' ? 'VOLUNTEER' : null);
    if (!role) return showLoginError('Invalid Access PIN.');

    completeLoginSession(name, pin, role);
    applyMasterSheetBranding(data);

    if (Array.isArray(data.roster)) {
      await window.TrackerDB.saveServerBundle({
        roster: data.roster || [], instruments: data.instruments || [], logs: data.logs || [], repairs: data.repairs || []
      });
      await reloadMemoryFromIndexedDB();
    }
    flushOutboundQueue();
  } catch (err) {
    const fallbackRole = pin === '9988' ? 'ADMIN' : pin === '2468' ? 'VOLUNTEER' : null;
    if (fallbackRole) completeLoginSession(name, pin, fallbackRole);
    else showLoginError('Could not reach Google Sheet. Check internet connection.');
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
      composite_id: 'REPAIR|900', Line_Number: 900, Student_Name: '🔧 Repair Shop',
      Ensemble: 'Repair', Section: 'Repair Vendor', Assigned_Case_ID: 'ANY', Student_ID: 'SHOP900'
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
      return showLoginError('Session PIN changed by Director. Please re-enter PIN.');
    }
    if (data && Array.isArray(data.roster)) {
      if (data.role) AppState.userRole = data.role;
      unlockAppWithRole(AppState.userName, AppState.userRole);
      applyMasterSheetBranding(data);
      await window.TrackerDB.saveServerBundle({
        roster: data.roster, instruments: data.instruments || [], logs: data.logs || [], repairs: data.repairs || []
      });
      await reloadMemoryFromIndexedDB();
      if (document.getElementById('viewQr').classList.contains('active')) renderLabelSheets();
      if (showAlert) alert(`Synced ${AppState.rosterList.length} students & ${AppState.instrumentsList.length} instruments.`);
    }
  } catch (err) {
    console.warn('Sync error:', err);
  } finally {
    updateSyncBadge();
  }
}

function handleKeypad(key) {
  unlockAudio();
  if (AppState.postTransactionReset && key !== 'CLR' && key !== 'BACK') {
    UI.resultBanner.classList.remove('visible');
    AppState.currentInput = '';
    AppState.postTransactionReset = false;
  }
  if (key === 'CLR') return resetScannerState();
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
    return lineMatch && (AppState.ensembleFilter === 'ALL' || s.Ensemble.toUpperCase() === AppState.ensembleFilter.toUpperCase());
  });

  AppState.matchedCandidates = matches;
  if (matches.length === 1) selectActiveStudent(matches[0], false);
  else if (matches.length > 1) selectActiveStudent(matches[0], true);
  else {
    AppState.activeStudent = {
      Line_Number: lineNum, Student_Name: `Unlisted (#${lineNum})`,
      Ensemble: AppState.ensembleFilter === 'ALL' ? 'Unlisted' : AppState.ensembleFilter,
      Section: 'Unassigned', Assigned_Case_ID: ''
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
  return Boolean(student && (String(student.Ensemble || '').toUpperCase() === 'REPAIR' || Number(student.Line_Number) >= 900));
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
    : student.Assigned_Case_ID ? `${student.Section} #${student.Assigned_Case_ID}` : 'UNASSIGNED';

  UI.studentActionButtons.style.display = 'flex';
  UI.btnLinkSchoolId.style.display = isRepair ? 'none' : 'inline-block';
  UI.studentCard.classList.add('ready-to-scan');
  UI.studentCard.classList.toggle('repair-active', isRepair);
  UI.cameraCard.classList.add('active-target');
  UI.cameraStatusBadge.textContent = isRepair ? '🔧 Scan Instrument Case for Repair' : `🎯 Scan ${student.Section} #${student.Assigned_Case_ID}`;

  if (showCandidateSwitcher && AppState.matchedCandidates.length > 1) {
    UI.candidateList.style.display = 'flex';
    UI.candidateList.innerHTML = AppState.matchedCandidates.map((cand, idx) => {
      const isSel = cand.composite_id === student.composite_id ? 'selected' : '';
      return `<button class="candidate-btn ${isSel}" data-idx="${idx}" type="button">
        <strong>${cand.Ensemble}: ${cand.Student_Name}</strong><br>
        <span style="font-size:0.74rem; color:#94a3b8;">Assigned: ${cand.Section} #${cand.Assigned_Case_ID}</span>
      </button>`;
    }).join('');
    UI.candidateList.querySelectorAll('.candidate-btn').forEach((btn) => {
      btn.addEventListener('click', () => selectActiveStudent(AppState.matchedCandidates[Number(btn.dataset.idx)], true));
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

async function startAlwaysOnCamera() {
  if (AppState.scannerStarted) return;
  AppState.scannerStarted = true;
  try {
    AppState.html5QrCode = new Html5Qrcode('reader');
    await AppState.html5QrCode.start({ facingMode: 'environment' }, { fps: 15, qrbox: { width: 185, height: 185 } }, onCodeScanned, () => {});
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
      Request_Type: 'LINK_STUDENT_ID', Auth_PIN: AppState.userPin,
      Ensemble: AppState.activeStudent.Ensemble, Line_Number: AppState.activeStudent.Line_Number, Student_ID: code
    });
    flushOutboundQueue();
    return;
  }

  if (code.toUpperCase().startsWith('SHOP|') || code.toUpperCase().startsWith('STU|')) {
    AppState.lastScanTime = now;
    const parts = code.split('|');
    if (code.toUpperCase().startsWith('SHOP|')) {
      AppState.currentInput = String(parseInt(parts[1], 10) || 900);
      lookupByLineNumber(AppState.currentInput);
      playTone('MATCH');
      return;
    }
    const ens = (parts[1] || '').trim().toUpperCase();
    const lineNum = parseInt(parts[2], 10);
    const found = AppState.rosterList.find((s) => s.Ensemble.toUpperCase() === ens && Number(s.Line_Number) === lineNum);
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
    await handleInstrumentScanOrRepair((parts[1] || '').trim(), (parts[2] || '').trim(), '');
    return;
  }

  const studentByBadge = AppState.rosterList.find((s) => s.Student_ID && String(s.Student_ID).trim().toUpperCase() === code.toUpperCase());
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
  if (isRepairShopEntity(AppState.activeStudent)) openRepairDetailsModal(scannedSection, scannedCaseId, initialNote);
  else await evaluateAndLogInstrumentScan(scannedSection, scannedCaseId, initialNote);
}

function openRepairDetailsModal(section, caseId, initialNote) {
  AppState.pendingRepairInstrument = { section, caseId, initialNote };
  AppState.pendingInvoiceBase64 = '';
  AppState.pendingInvoiceMime = '';
  UI.invoiceFileInput.value = '';
  UI.invoicePreviewText.style.display = 'none';

  const isReturning = AppState.actionMode === 'CHECK_IN';
  UI.repairModalTitle.textContent = isReturning ? '🔧 Check Instrument BACK IN from Repair' : '🔧 Send Instrument OUT for Repair';
  UI.repairInstrumentLabel.textContent = `${section} #${caseId}`;
  UI.repairShopInput.value = AppState.activeStudent && AppState.activeStudent.Student_Name
    ? `${AppState.activeStudent.Student_Name} (#${AppState.activeStudent.Line_Number})` : 'Repair Shop (#900)';
  UI.repairDetailsLabel.textContent = isReturning ? 'Work Performed / Repair Summary' : 'Issue / Reason for Repair';
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
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
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
    Request_Type: 'REPAIR_LOG', Auth_PIN: AppState.userPin, Timestamp: new Date().toISOString(),
    Line_Number: AppState.activeStudent ? Number(AppState.activeStudent.Line_Number) : 900,
    Repair_Action: repairAction, Section: section, Case_ID: String(caseId), Shop_Name: shopName,
    Repair_Details: details || (isReturning ? 'Returned from shop' : 'Sent for repair'),
    Cost: cost, Invoice_Number: invNum, Invoice_Base64: AppState.pendingInvoiceBase64 || '',
    Invoice_MimeType: AppState.pendingInvoiceMime || '', Scanned_By: `${AppState.userName} (${AppState.userRole})`
  };

  AppState.repairsHistory.push(repairPayload);
  AppState.scanHistory.push({
    Timestamp: repairPayload.Timestamp, Ensemble: 'Repair', Line_Number: repairPayload.Line_Number,
    Student_Name: shopName, Section: section, Case_ID: String(caseId),
    Action: isReturning ? 'CHECK_IN' : 'CHECK_OUT', Status_Flag: repairAction,
    Volunteer_Note: `${repairPayload.Repair_Details}${cost ? ' ($' + cost + ')' : ''}`, Scanned_By: repairPayload.Scanned_By
  });

  const localId = await window.TrackerDB.enqueueItem(repairPayload);
  AppState.lastTransaction = { ...repairPayload, local_id: localId };
  AppState.postTransactionReset = true;

  UI.resultBanner.className = 'result-banner visible match';
  UI.resultIcon.textContent = '🔧';
  UI.resultTitle.textContent = isReturning ? 'RETURNED FROM REPAIR' : 'SENT TO REPAIR';
  UI.resultSubtitle.textContent = `${section} #${caseId} • ${shopName}${AppState.pendingInvoiceBase64 ? ' • 📄 Invoice Queued' : ''}`;

  setTimeout(() => { if (AppState.postTransactionReset) resetScannerState(); }, 1400);
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
    const exact = AppState.matchedCandidates.find((c) => c.Section.toUpperCase() === scannedSection.toUpperCase() && String(c.Assigned_Case_ID).toUpperCase() === String(scannedCaseId).toUpperCase());
    const secMatch = AppState.matchedCandidates.find((c) => c.Section.toUpperCase() === scannedSection.toUpperCase());
    if (exact) AppState.activeStudent = exact;
    else if (secMatch) AppState.activeStudent = secMatch;
  }

  const student = AppState.activeStudent;
  const expectedSection = String(student.Section || '').trim().toUpperCase();
  const expectedCase = String(student.Assigned_Case_ID || '').trim().toUpperCase();

  let statusFlag = 'DIRECT_MATCH';
  if (!expectedCase) statusFlag = 'UNASSIGNED';
  else if (scannedSection.toUpperCase() !== expectedSection || String(scannedCaseId).toUpperCase() !== expectedCase) statusFlag = 'SWAP';

  if (statusFlag === 'DIRECT_MATCH') { playTone('MATCH'); vibrateDevice('MATCH'); }
  else { playTone('WARNING'); vibrateDevice('WARNING'); }

  const logEntry = {
    Request_Type: 'SCAN_LOG', Auth_PIN: AppState.userPin, Timestamp: new Date().toISOString(),
    Ensemble: student.Ensemble, Line_Number: Number(student.Line_Number), Student_Name: student.Student_Name,
    Section: scannedSection, Case_ID: String(scannedCaseId), Action: AppState.actionMode,
    Status_Flag: statusFlag, Volunteer_Note: initialNote, Scanned_By: `${AppState.userName} (${AppState.userRole})`
  };

  AppState.scanHistory.push(logEntry);
  const localId = await window.TrackerDB.enqueueItem(logEntry);
  AppState.lastTransaction = { ...logEntry, local_id: localId };
  AppState.postTransactionReset = true;

  UI.resultBanner.className = `result-banner visible ${statusFlag === 'DIRECT_MATCH' ? 'match' : 'swap'}`;
  UI.resultIcon.textContent = statusFlag === 'DIRECT_MATCH' ? '✓' : '⚠️';
  UI.resultTitle.textContent = statusFlag === 'DIRECT_MATCH'
    ? (AppState.actionMode === 'CHECK_IN' ? 'CHECKED IN' : 'CHECKED OUT') : `${statusFlag}: ${scannedSection} #${scannedCaseId}`;
  const noteSuffix = initialNote.includes('[NEEDS QR TAG]') ? ' • 🔧 Flagged for New QR' : '';
  UI.resultSubtitle.textContent = statusFlag === 'DIRECT_MATCH'
    ? `${student.Student_Name} • ${scannedSection} #${scannedCaseId}${noteSuffix}`
    : `${student.Student_Name} (Assigned: ${student.Section} #${student.Assigned_Case_ID})${noteSuffix}`;

  if (statusFlag === 'DIRECT_MATCH') {
    setTimeout(() => { if (AppState.postTransactionReset) resetScannerState(); }, 1200);
  }
  updateSyncBadge();
  flushOutboundQueue();
}

function formatInstSpecs(inst) {
  if (!inst) return '';
  const parts = [];
  if (inst.Brand) parts.push(inst.Brand);
  if (inst.Model) parts.push(inst.Model);
  if (inst.Serial) parts.push(`SN: ${inst.Serial}`);
  return parts.join(' • ');
}

function runStatusSearch(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (!q) {
    UI.searchResultsContainer.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">
      Type an instrument (e.g. <strong>"Trumpet 1"</strong>), student name (e.g. <strong>"Joe"</strong>), Brand/Serial, <strong>"Repair"</strong>, or <strong>"Needs QR"</strong>.
    </div>`;
    return;
  }
  const cardsHtml = [];
  const matchedInstruments = AppState.instrumentsList.filter((inst) => {
    const combo1 = `${inst.Section} ${inst.Case_ID}`.toLowerCase();
    const combo2 = `${inst.Section} #${inst.Case_ID}`.toLowerCase();
    const specs = `${inst.Brand || ''} ${inst.Model || ''} ${inst.Serial || ''} ${inst.Assigned_Student || ''}`.toLowerCase();
    const instLogs = AppState.scanHistory.filter((l) => String(l.Section || '').toUpperCase() === inst.Section.toUpperCase() && String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase());
    const lastLog = instLogs.length > 0 ? instLogs[instLogs.length - 1] : null;
    const lastNote = lastLog ? String(lastLog.Volunteer_Note || '').toLowerCase() : '';
    const lastFlag = lastLog ? String(lastLog.Status_Flag || '').toLowerCase() : '';
    return combo1.includes(q) || combo2.includes(q) || specs.includes(q) || lastNote.includes(q) || lastFlag.includes(q);
  });

  for (const inst of matchedInstruments) {
    const instLogs = AppState.scanHistory.filter((l) => String(l.Section || '').toUpperCase() === inst.Section.toUpperCase() && String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase());
    const lastLog = instLogs.length > 0 ? instLogs[instLogs.length - 1] : null;
    const inRepair = lastLog && String(lastLog.Status_Flag) === 'SENT_TO_REPAIR';
    const isOut = lastLog && lastLog.Action === 'CHECK_OUT';
    const needsQr = lastLog && String(lastLog.Volunteer_Note || '').includes('[NEEDS QR TAG]');

    let badgeClass = inRepair ? 'badge-repair' : isOut ? 'badge-out' : 'badge-in';
    let badgeLabel = inRepair ? '🔧 IN REPAIR' : isOut ? 'CHECKED OUT' : 'IN STORAGE';

    const specsLine = formatInstSpecs(inst);
    let statusDetail = `Roster Assignment: <strong>${inst.Assigned_Student}</strong> (${inst.Ensemble} #${inst.Assigned_Line || '—'})`;
    if (specsLine) statusDetail += `<br>Specs: <strong>${escapeHtml(specsLine)}</strong>`;
    if (lastLog) {
      statusDetail += `<br>Last Action: <strong>${inRepair ? 'Sent to Repair' : lastLog.Action === 'CHECK_OUT' ? 'Checked OUT' : 'Checked IN'}</strong> — ${lastLog.Student_Name} on ${formatShortDate(lastLog.Timestamp)}${lastLog.Scanned_By ? ' (by ' + lastLog.Scanned_By + ')' : ''}`;
      if (lastLog.Volunteer_Note) statusDetail += `<br>Note: <em>${escapeHtml(lastLog.Volunteer_Note)}</em>`;
      if (needsQr) statusDetail += `<br><span style="color:#fcd34d; font-weight:800;">🔧 FLAGGED: Needs Replacement QR Tag</span>`;
    } else statusDetail += `<br>No check-in/out scans recorded yet.`;

    cardsHtml.push(`<div class="result-card"><div class="result-card-header"><strong style="font-size:1.05rem; color:#38bdf8;">🎺 ${inst.Section} #${inst.Case_ID}</strong><span class="${badgeClass}">${badgeLabel}</span></div><div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">${statusDetail}</div></div>`);
  }

  const matchedStudents = AppState.rosterList.filter((stu) => !isRepairShopEntity(stu) && `${stu.Student_Name} ${stu.Ensemble} ${stu.Section} ${stu.Line_Number}`.toLowerCase().includes(q));
  for (const stu of matchedStudents) {
    const stuLogs = AppState.scanHistory.filter((l) => String(l.Ensemble || '').toUpperCase() === stu.Ensemble.toUpperCase() && Number(l.Line_Number) === Number(stu.Line_Number));
    const lastLog = stuLogs.length > 0 ? stuLogs[stuLogs.length - 1] : null;
    const currentlyOut = lastLog && lastLog.Action === 'CHECK_OUT';
    const lastOutLog = [...stuLogs].reverse().find((l) => l.Action === 'CHECK_OUT');
    const lastInLog = [...stuLogs].reverse().find((l) => l.Action === 'CHECK_IN');

    let historySummary = 'Nothing checked out yet this term.';
    if (currentlyOut) historySummary = `Currently has <strong>${lastLog.Section} #${lastLog.Case_ID}</strong> checked OUT since ${formatShortDate(lastLog.Timestamp)}`;
    else if (lastOutLog || lastInLog) {
      const refInst = lastOutLog ? `${lastOutLog.Section} #${lastOutLog.Case_ID}` : `${lastInLog.Section} #${lastInLog.Case_ID}`;
      historySummary = `Nothing currently checked out.<br>Last Instrument: <strong>${refInst}</strong><br>Out: ${lastOutLog ? formatShortDate(lastOutLog.Timestamp) : '—'} &nbsp;|&nbsp; In: ${lastInLog ? formatShortDate(lastInLog.Timestamp) : '—'}`;
    }
    cardsHtml.push(`<div class="result-card"><div class="result-card-header"><strong style="font-size:1.05rem;">👤 ${stu.Student_Name} (${stu.Ensemble} #${stu.Line_Number})</strong><span class="${currentlyOut ? 'badge-out' : 'badge-in'}">${currentlyOut ? 'HAS INSTRUMENT OUT' : 'ALL CHECKED IN'}</span></div><div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">Assigned: <strong>${stu.Section} #${stu.Assigned_Case_ID}</strong><br>${historySummary}</div></div>`);
  }

  UI.searchResultsContainer.innerHTML = cardsHtml.length > 0 ? cardsHtml.join('') : `<div style="color:var(--text-muted); text-align:center; padding:20px;">No matching students or instruments found.</div>`;
}

function formatShortDate(isoStr) {
  try { return new Date(isoStr).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (_) { return isoStr; }
}

function filterByCustomKeywords(items, rawQuery, isStudentMode) {
  const cleanQuery = String(rawQuery || '').trim();
  if (!cleanQuery) return items;

  const tokens = cleanQuery.split(/[,;\n]+/).map((t) => t.trim().toLowerCase().replace(/#/g, '')).filter(Boolean);
  if (tokens.length === 0) return items;

  const matchedResults = [];
  const seenKeys = new Set();

  for (const token of tokens) {
    const exactNumMatch = token.match(/^([a-z\s]+?)\s+(\d+[a-z]*)$/);
    for (const item of items) {
      const uniqueId = isStudentMode ? item.composite_id : item.inst_key;
      if (seenKeys.has(uniqueId)) continue;

      let isMatch = false;
      if (exactNumMatch) {
        const textPart = exactNumMatch[1].trim();
        const numPart = exactNumMatch[2].trim();
        if (isStudentMode) {
          const stuText = `${item.Ensemble} ${item.Student_Name} ${item.Section}`.toLowerCase();
          isMatch = stuText.includes(textPart) && (String(item.Line_Number).toLowerCase() === numPart || String(item.Assigned_Case_ID).toLowerCase() === numPart);
        } else {
          const instText = `${item.Section} ${item.Ensemble} ${item.Brand || ''}`.toLowerCase();
          isMatch = instText.includes(textPart) && String(item.Case_ID).toLowerCase() === numPart;
        }
      } else {
        const haystack = isStudentMode
          ? `${item.Student_Name} ${item.Ensemble} ${item.Section} ${item.Line_Number}`.toLowerCase()
          : `${item.Section} ${item.Case_ID} ${item.Ensemble} ${item.Assigned_Student || ''} ${item.Brand || ''} ${item.Model || ''} ${item.Serial || ''}`.toLowerCase();
        isMatch = haystack.includes(token);
      }

      if (isMatch) {
        seenKeys.add(uniqueId);
        matchedResults.push(item);
      }
    }
  }
  return matchedResults;
}

function updateStartColOptions() {
  if (!UI.qrTemplateSelect || !UI.qrStartColSelect) return;
  const maxCols = UI.qrTemplateSelect.value === '97184' ? 2 : 3;
  const currentCol = parseInt(UI.qrStartColSelect.value, 10) || 1;
  UI.qrStartColSelect.innerHTML = maxCols === 2
    ? `<option value="1">Col 1 (Left)</option><option value="2">Col 2 (Right)</option>`
    : `<option value="1">Col 1 (Left)</option><option value="2">Col 2 (Middle)</option><option value="3">Col 3 (Right)</option>`;
  UI.qrStartColSelect.value = String(Math.min(currentCol, maxCols));
}

function renderLabelSheets() {
  const tpl = UI.qrTemplateSelect ? UI.qrTemplateSelect.value : '60506';
  const colsPerPage = tpl === '97184' ? 2 : 3;
  const labelsPerPage = tpl === '97184' ? 8 : 12;
  const startRow = UI.qrStartRowSelect ? Math.max(1, Math.min(4, parseInt(UI.qrStartRowSelect.value, 10) || 1)) : 1;
  const startCol = UI.qrStartColSelect ? Math.max(1, Math.min(colsPerPage, parseInt(UI.qrStartColSelect.value, 10) || 1)) : 1;
  const emptySkipCount = (startRow - 1) * colsPerPage + (startCol - 1);

  const mode = UI.qrTypeSelect.value;
  const ensFilter = UI.qrEnsembleSelect.value;
  const customQuery = UI.qrCustomQueryInput ? UI.qrCustomQueryInput.value : '';
  const schoolHeader = AppState.schoolHeader || 'MS MUSIC PROGRAM';
  const returnLines = Array.isArray(AppState.returnLines) && AppState.returnLines.length > 0
    ? AppState.returnLines
    : ['If found, return to Music Room'];
  const logoPos = (AppState.logoPosition || 'LEFT').toUpperCase();
  const logoPx = Number(AppState.logoSizePx) || 48;
  const defaultQrPx = tpl === '97184' ? 132 : 104;
  const qrPx = Number(AppState.qrSizePx) > 40 ? Number(AppState.qrSizePx) : defaultQrPx;

  localStorage.setItem(STORAGE_KEYS.AVERY_TEMPLATE, tpl);

  const labelItems = [];
  for (let s = 0; s < emptySkipCount; s++) labelItems.push({ emptySlot: true });

  if (mode === 'SINGLE_INST') {
    const sec = UI.qrInputPrimary.value.trim() || 'Trumpet';
    const num = UI.qrInputSecondary.value.trim() || '1';
    const key = `${sec.toUpperCase()}|${num.toUpperCase()}`;
    const existing = AppState.instrumentsList.find((i) => i.inst_key === key);
    const manualSpecs = formatInstSpecs({
      Brand: (UI.qrInputBrand && UI.qrInputBrand.value.trim()) || (existing && existing.Brand) || '',
      Model: (UI.qrInputModel && UI.qrInputModel.value.trim()) || (existing && existing.Model) || '',
      Serial: (UI.qrInputSerial && UI.qrInputSerial.value.trim()) || (existing && existing.Serial) || ''
    });
    labelItems.push({ payload: `INST|${sec}|${num}`, mainTitle: `${sec.toUpperCase()} #${num}`, subTitle: manualSpecs });
  } else if (mode === 'SINGLE_STU') {
    const name = UI.qrInputPrimary.value.trim() || 'Student';
    const line = UI.qrInputSecondary.value.trim() || '1';
    const ens = ensFilter === 'ALL' ? 'Band' : ensFilter;
    labelItems.push({ payload: `STU|${ens}|${line}`, mainTitle: `${ens.toUpperCase()} #${line}`, subTitle: name });
  } else if (mode === 'REPAIR_SHOP_QR') {
    labelItems.push({ payload: 'SHOP|900|Repair Shop', mainTitle: 'REPAIR SHOP #900', subTitle: '' });
  } else if (mode === 'FLAGGED_BAD_QR') {
    const flaggedSet = new Set();
    for (const log of AppState.scanHistory) {
      const key = `${String(log.Section || '').toUpperCase()}|${String(log.Case_ID || '').toUpperCase()}`;
      if (String(log.Volunteer_Note || '').includes('[NEEDS QR TAG]')) flaggedSet.add(key);
      else if (flaggedSet.has(key)) flaggedSet.delete(key);
    }
    for (const key of flaggedSet) {
      const [sec, num] = key.split('|');
      const matchedInst = AppState.instrumentsList.find((i) => i.inst_key === key);
      labelItems.push({
        payload: `INST|${matchedInst ? matchedInst.Section : sec}|${matchedInst ? matchedInst.Case_ID : num}`,
        mainTitle: `${sec} #${num}`,
        subTitle: formatInstSpecs(matchedInst)
      });
    }
  } else if (mode === 'BATCH_MASTER_INST' || mode === 'BATCH_ROSTER_INST') {
    const hasAnyMasterRows = AppState.instrumentsList.some((i) => i.in_master_tab);
    let list = AppState.instrumentsList.filter((i) => {
      const ensOk = ensFilter === 'ALL' || !i.Ensemble || i.Ensemble.toUpperCase() === ensFilter.toUpperCase();
      if (!ensOk) return false;
      if (mode === 'BATCH_MASTER_INST') return hasAnyMasterRows ? i.in_master_tab : true;
      return i.in_roster;
    });
    list = filterByCustomKeywords(list, customQuery, false);
    for (const inst of list) {
      labelItems.push({
        payload: `INST|${inst.Section}|${inst.Case_ID}`,
        mainTitle: `${inst.Section.toUpperCase()} #${inst.Case_ID}`,
        subTitle: formatInstSpecs(inst)
      });
    }
  } else if (mode === 'BATCH_STU') {
    let list = AppState.rosterList.filter((s) => !isRepairShopEntity(s) && (ensFilter === 'ALL' || s.Ensemble.toUpperCase() === ensFilter.toUpperCase()));
    list = filterByCustomKeywords(list, customQuery, true);
    for (const stu of list) {
      labelItems.push({ payload: `STU|${stu.Ensemble}|${stu.Line_Number}`, mainTitle: `${stu.Ensemble.toUpperCase()} #${stu.Line_Number}`, subTitle: stu.Student_Name });
    }
  } else if (mode === 'RETURN_ONLY') {
    for (let i = 0; i < labelsPerPage - emptySkipCount; i++) labelItems.push({ returnStickerOnly: true });
  }

  UI.qrPreviewGrid.innerHTML = '';
  if (labelItems.filter((x) => !x.emptySlot).length === 0) {
    UI.qrPreviewGrid.innerHTML = `<div style="color:var(--text-muted); padding:24px; text-align:center;">No matching tags found for that filter.</div>`;
    return;
  }

  // Build separate <div> elements for each Return Line so every row in Settings renders on its own line
  const returnLinesHtml = returnLines.map((line) => `<div class="tag-return-text">${escapeHtml(line)}</div>`).join('');

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

      const inner = document.createElement('div');
      inner.className = 'tag-inner-card';

      const headerBand = document.createElement('div');
      headerBand.className = 'tag-header-band';

      // Position Logo dynamically based on Settings tab (LEFT, RIGHT, TOP, or QR_CENTER)
      if (AppState.schoolLogoDataUrl && logoPos !== 'QR_CENTER' && logoPos !== 'NONE') {
        if (logoPos === 'TOP') headerBand.style.flexDirection = 'column';
        else if (logoPos === 'RIGHT') headerBand.style.flexDirection = 'row-reverse';
        else headerBand.style.flexDirection = 'row';

        const logoImg = document.createElement('img');
        logoImg.className = 'tag-logo-img';
        logoImg.src = AppState.schoolLogoDataUrl;
        logoImg.style.maxHeight = `${logoPx}px`;
        logoImg.style.maxWidth = `${Math.round(logoPx * 1.5)}px`;
        logoImg.style.width = 'auto';
        logoImg.style.height = 'auto';
        headerBand.appendChild(logoImg);
      }

      const schoolBlock = document.createElement('div');
      schoolBlock.className = 'tag-school-block';
      schoolBlock.innerHTML = `<div class="tag-school-name">${escapeHtml(schoolHeader)}</div>${returnLinesHtml}`;
      headerBand.appendChild(schoolBlock);
      inner.appendChild(headerBand);

      if (item.returnStickerOnly) {
        const centerNotice = document.createElement('div');
        centerNotice.style.padding = '8px 4px';
        centerNotice.innerHTML = `<div style="font-size:11pt; font-weight:900; margin-bottom:4px;">SCHOOL PROPERTY</div>${returnLinesHtml}`;
        inner.appendChild(centerNotice);
        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.innerHTML = `<div class="tag-sub-id">DO NOT REMOVE TAG FROM CASE</div>`;
        inner.appendChild(footerBand);
      } else {
        const qrWrap = document.createElement('div');
        qrWrap.className = 'tag-qr-wrap';
        qrWrap.style.position = 'relative';

        const canvas = document.createElement('canvas');
        new QRious({ element: canvas, value: item.payload, size: qrPx, level: 'H' });
        qrWrap.appendChild(canvas);

        // Optional QR_CENTER mode: overlays logo in the center of the Level-H QR code!
        if (AppState.schoolLogoDataUrl && logoPos === 'QR_CENTER') {
          const centerLogo = document.createElement('img');
          centerLogo.src = AppState.schoolLogoDataUrl;
          const badgeSize = Math.min(logoPx, Math.round(qrPx * 0.28));
          centerLogo.style.cssText = `position:absolute; max-height:${badgeSize}px; max-width:${badgeSize}px; background:#fff; padding:2px; border-radius:4px; border:1px solid #000;`;
          qrWrap.appendChild(centerLogo);
        }

        inner.appendChild(qrWrap);

        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.innerHTML = `<div class="tag-main-id">${escapeHtml(item.mainTitle)}</div>${item.subTitle ? `<div class="tag-sub-id">${escapeHtml(item.subTitle)}</div>` : ''}`;
        inner.appendChild(footerBand);
      }

      cell.appendChild(inner);
      pageEl.appendChild(cell);
    }
    UI.qrPreviewGrid.appendChild(pageEl);
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unlockAudio() {
  if (!AppState.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) AppState.audioCtx = new AudioCtx();
  }
  if (AppState.audioCtx && AppState.audioCtx.state === 'suspended') AppState.audioCtx.resume();
}

function playTone(type) {
  if (!AppState.audioCtx) return;
  const ctx = AppState.audioCtx;
  const now = ctx.currentTime;
  if (type === 'MATCH') {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1318.5, now + 0.07);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.22);
  } else {
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.16;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.12);
    }
  }
}

function vibrateDevice(type) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(type === 'MATCH' ? 70 : [140, 70, 140]); } catch (_) {}
  }
}

async function flushOutboundQueue() {
  if (AppState.isSyncing || !navigator.onLine || !AppState.userPin) return updateSyncBadge();
  const gasUrl = getGasUrl();
  if (!gasUrl) return;
  const pending = await window.TrackerDB.getAllStore('sync_queue');
  if (pending.length === 0) return updateSyncBadge();

  AppState.isSyncing = true;
  updateSyncBadge();
  try {
    for (const item of pending) {
      if (!navigator.onLine) break;
      item.Auth_PIN = item.Auth_PIN || AppState.userPin;
      const response = await fetch(gasUrl, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(item), redirect: 'follow'
      });
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.status !== 'UNAUTHORIZED') await window.TrackerDB.removeQueueItem(item.local_id);
        else break;
      } else break;
    }
  } catch (err) {
    console.warn('Queue sync paused:', err);
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
  if (!navigator.onLine) { UI.syncBadge.classList.add('offline'); UI.syncText.textContent = `Offline (${count})`; }
  else if (count > 0) { UI.syncBadge.classList.add('pending'); UI.syncText.textContent = `Syncing (${count})`; }
  else UI.syncText.textContent = 'Synced';
}

function applyModeUI(mode) {
  AppState.actionMode = mode;
  localStorage.setItem(STORAGE_KEYS.ACTION_MODE, mode);
  UI.btnModeIn.classList.toggle('active-in', mode === 'CHECK_IN');
  UI.btnModeOut.classList.toggle('active-out', mode === 'CHECK_OUT');
  if (AppState.activeStudent && isRepairShopEntity(AppState.activeStudent)) selectActiveStudent(AppState.activeStudent, false);
}

function bindEvents() {
  UI.btnLoginSubmit.addEventListener('click', handleLoginAttempt);
  UI.loginPinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLoginAttempt(); });
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
      if (tab.dataset.view === 'viewSearch') runStatusSearch(UI.searchInput.value);
      else if (tab.dataset.view === 'viewQr') renderLabelSheets();
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
    if (AppState.ensembleFilter === 'REPAIR') {
      AppState.currentInput = '900';
      lookupByLineNumber('900');
    } else {
      if (AppState.currentInput === '900') AppState.currentInput = '';
      lookupByLineNumber(AppState.currentInput);
    }
  });

  UI.keypadGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.key-btn');
    if (btn) handleKeypad(btn.dataset.key);
  });

  UI.btnManualCase.addEventListener('click', openManualCaseModal);
  UI.btnCancelManual.addEventListener('click', () => UI.manualCaseModal.classList.remove('open'));
  UI.btnQuickConfirmAssigned.addEventListener('click', async () => {
    if (!AppState.activeStudent) return;
    UI.manualCaseModal.classList.remove('open');
    await handleInstrumentScanOrRepair(AppState.activeStudent.Section, AppState.activeStudent.Assigned_Case_ID, '[NEEDS QR TAG] Manual Entry - Damaged/Missing QR');
  });
  UI.btnSubmitManual.addEventListener('click', async () => {
    const sec = UI.manualSectionInput.value.trim(), num = UI.manualCaseNumInput.value.trim();
    if (!sec || !num) return alert('Please enter both Instrument Section and Case #.');
    UI.manualCaseModal.classList.remove('open');
    await handleInstrumentScanOrRepair(sec, num, UI.chkFlagBadQr.checked ? '[NEEDS QR TAG] Manual Entry - Damaged/Missing QR' : 'Manual Entry');
  });

  document.querySelectorAll('.repair-chip').forEach((chip) => {
    chip.addEventListener('click', () => { UI.repairDetailsInput.value = chip.dataset.text; });
  });
  UI.invoiceFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleInvoiceFileSelected(file);
  });
  UI.btnCancelRepair.addEventListener('click', () => UI.repairModal.classList.remove('open'));
  UI.btnSubmitRepair.addEventListener('click', submitRepairTransaction);

  UI.btnLinkSchoolId.addEventListener('click', () => {
    AppState.awaitingIdLink = !AppState.awaitingIdLink;
    UI.btnLinkSchoolId.textContent = AppState.awaitingIdLink ? '📷 Scan ID...' : '🔗 Link ID';
  });

  UI.btnNextStudent.addEventListener('click', () => resetScannerState());
  UI.btnAddNote.addEventListener('click', () => { UI.noteInput.value = ''; UI.noteModal.classList.add('open'); });
  document.querySelectorAll('.note-chip').forEach((chip) => {
    chip.addEventListener('click', () => { UI.noteInput.value = chip.dataset.note; });
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
  UI.chkShowCutLines.addEventListener('change', (e) => UI.qrPreviewGrid.classList.toggle('hide-cut-lines', !e.target.checked));

  if (UI.qrTemplateSelect) {
    UI.qrTemplateSelect.addEventListener('change', () => { updateStartColOptions(); renderLabelSheets(); });
  }
  if (UI.qrStartRowSelect) UI.qrStartRowSelect.addEventListener('change', renderLabelSheets);
  if (UI.qrStartColSelect) UI.qrStartColSelect.addEventListener('change', renderLabelSheets);

  UI.qrTypeSelect.addEventListener('change', () => {
    const mode = UI.qrTypeSelect.value;
    const isSingle = mode.startsWith('SINGLE_');
    const isBatch = mode.startsWith('BATCH_');
    UI.qrSingleInputs.style.display = isSingle ? 'flex' : 'none';
    if (UI.qrSingleSpecsRow) UI.qrSingleSpecsRow.style.display = mode === 'SINGLE_INST' ? 'grid' : 'none';
    if (UI.qrCustomFilterBox) UI.qrCustomFilterBox.style.display = isBatch ? 'block' : 'none';
    renderLabelSheets();
  });

  UI.qrEnsembleSelect.addEventListener('change', renderLabelSheets);
  if (UI.qrCustomQueryInput) UI.qrCustomQueryInput.addEventListener('input', renderLabelSheets);
  UI.qrInputPrimary.addEventListener('input', renderLabelSheets);
  UI.qrInputSecondary.addEventListener('input', renderLabelSheets);
  if (UI.qrInputBrand) UI.qrInputBrand.addEventListener('input', renderLabelSheets);
  if (UI.qrInputModel) UI.qrInputModel.addEventListener('input', renderLabelSheets);
  if (UI.qrInputSerial) UI.qrInputSerial.addEventListener('input', renderLabelSheets);

  UI.btnPrintQr.addEventListener('click', () => window.print());

  UI.syncBadge.addEventListener('click', () => syncWithServer(false));
  UI.btnSettings.addEventListener('click', () => { UI.gasUrlInput.value = getGasUrl(); UI.settingsModal.classList.add('open'); });
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
// === END OF APP.JS ===
