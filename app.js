// app.js - Complete Controller (v15: Search Tab QR/ID Scanner + Auto-History Popup + District Student_ID Support)
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
  TEXT_ALIGN: 'instrument_tracker_text_align',
  FOOTER_ALIGN: 'instrument_tracker_footer_align',
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
  textAlignment: localStorage.getItem(STORAGE_KEYS.TEXT_ALIGN) || 'center',
  footerAlignment: localStorage.getItem(STORAGE_KEYS.FOOTER_ALIGN) || 'center',
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
  searchScanActive: false,
  pendingRepairInstrument: null,
  pendingInvoiceBase64: '',
  pendingInvoiceMime: '',
  pendingTx: null,
  onUnlistedResolved: null,
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

function getLocalTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  let hr = d.getHours();
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12 || 12;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hr)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function getSec(obj) {
  return obj ? String(obj.Section || obj.Instrument || '').trim() : '';
}

function getStudentAssignedPairs(stu) {
  if (!stu) return [];
  const secs = String(stu.Section || stu.Instrument || '').split(',').map((s) => s.trim()).filter(Boolean);
  const cases = String(stu.Assigned_Case_ID || '').split(',').map((c) => c.trim()).filter(Boolean);
  const pairs = [];
  const len = Math.max(secs.length, cases.length);
  for (let i = 0; i < len; i++) {
    const s = secs[i] || secs[0] || '';
    const c = cases[i] || '';
    if (s && c && s !== 'Unassigned') pairs.push({ section: s, caseId: c });
  }
  return pairs;
}

function formatAssignedPairsText(stu) {
  const pairs = getStudentAssignedPairs(stu);
  return pairs.length === 0 ? 'UNASSIGNED' : pairs.map((p) => `${p.section} #${p.caseId}`).join(', ');
}

function isInstrumentAssignedToStudent(stu, section, caseId) {
  const sUp = String(section || '').trim().toUpperCase();
  const cUp = String(caseId || '').trim().toUpperCase();
  return getStudentAssignedPairs(stu).some((p) => p.section.toUpperCase() === sUp && p.caseId.toUpperCase() === cUp);
}

function getAuthoritativeInstrumentEnsemble(section, caseId) {
  const secUp = String(section || '').trim().toUpperCase();
  const caseUp = String(caseId || '').trim().toUpperCase();
  const key = `${secUp}|${caseUp}`;
  const exactMaster = AppState.instrumentsList.find((i) => i.inst_key === key && i.in_master_tab && i.Ensemble);
  if (exactMaster) return exactMaster.Ensemble;
  const secMaster = AppState.instrumentsList.find((i) => getSec(i).toUpperCase() === secUp && i.in_master_tab && i.Ensemble);
  if (secMaster) return secMaster.Ensemble;
  const anyMatch = AppState.instrumentsList.find((i) => i.inst_key === key && i.Ensemble);
  if (anyMatch) return anyMatch.Ensemble;
  const anySec = AppState.instrumentsList.find((i) => getSec(i).toUpperCase() === secUp && i.Ensemble);
  return anySec ? anySec.Ensemble : '';
}

function checkEnsembleCompatibility(student, instSection, instCaseId) {
  if (!student || isRepairShopEntity(student)) return { allowed: true, instEnsemble: 'Repair' };
  const stuEns = String(student.Ensemble || '').trim();
  const stuEnsUp = stuEns.toUpperCase();
  const instEns = getAuthoritativeInstrumentEnsemble(instSection, instCaseId) || stuEns;
  const instEnsUp = instEns.toUpperCase();
  if (stuEnsUp === 'BOTH' || stuEnsUp === 'ALL' || !instEnsUp || instEnsUp === 'BOTH' || instEnsUp === 'ALL') {
    return { allowed: true, instEnsemble: instEns || stuEns };
  }
  return { allowed: stuEnsUp === instEnsUp, stuEnsemble: stuEns, instEnsemble: instEns };
}

function getInstrumentCurrentState(section, caseId) {
  const secUp = String(section || '').trim().toUpperCase();
  const caseUp = String(caseId || '').trim().toUpperCase();
  const logs = AppState.scanHistory.filter(
    (l) => resolveLogInstrumentName(l, null).toUpperCase() === secUp && String(l.Case_ID || '').trim().toUpperCase() === caseUp
  );
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const isOut = Boolean(lastLog && lastLog.Action === 'CHECK_OUT');
  const inRepair = Boolean(isOut && String(lastLog.Status_Flag) === 'SENT_TO_REPAIR');
  return { isOut, inRepair, lastLog };
}

function injectWideCameraAndModals() {
  const style = document.createElement('style');
  style.textContent = `
    .workspace { display: flex !important; flex-direction: column !important; gap: 6px !important; padding: 0 10px 6px 10px !important; }
    .student-card { flex: 0 0 auto !important; padding: 6px 10px !important; display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important; }
    .line-display-row { display: flex !important; align-items: center !important; gap: 6px !important; }
    .line-number-value { font-size: 1.45rem !important; }
    #studentDetailsBox { flex: 1 1 115px !important; min-width: 0 !important; }
    .student-name { font-size: 0.92rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
    .student-meta { font-size: 0.7rem !important; margin-top: 0 !important; }
    .expected-case-box { padding: 4px 8px !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; }
    .expected-label { font-size: 0.56rem !important; }
    .expected-id { font-size: 0.82rem !important; }
    .candidate-list { width: 100% !important; flex-direction: row !important; margin: 2px 0 0 0 !important; }
    .candidate-btn { flex: 1 !important; padding: 4px 6px !important; font-size: 0.75rem !important; }
    .camera-card { flex: 1 1 auto !important; width: 100% !important; min-height: 175px !important; }
    .keypad-section { height: 28dvh !important; max-height: 195px !important; padding: 0 10px 8px 10px !important; }
    .keypad-grid { gap: 5px !important; }
    .key-btn { font-size: 1.25rem !important; border-radius: 8px !important; }
    .tx-hero-box { background: #0f172a; border: 2px solid #38bdf8; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 12px; }
    .tx-hero-title { font-size: 1.55rem; font-weight: 900; color: #38bdf8; line-height: 1.15; }
    .tx-hero-sub { font-size: 0.85rem; font-weight: 700; color: #cbd5e1; margin-top: 4px; }
    .tx-error-banner { background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; padding: 10px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; margin-bottom: 10px; text-align: center; }
    .tx-assign-box { background: rgba(2,132,199,0.15); border: 1px solid #0284c7; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.82rem; }
    .result-card.tappable-card { cursor: pointer; transition: border-color 0.15s, transform 0.1s; }
    .result-card.tappable-card:active { transform: scale(0.99); border-color: #38bdf8; }
    .tap-history-hint { font-size: 0.72rem; font-weight: 800; color: #38bdf8; margin-top: 4px; display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #334155; }
    .stat-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
    .stat-mini-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 8px 6px; text-align: center; }
    .stat-mini-num { font-size: 1.2rem; font-weight: 900; color: #fff; }
    .stat-mini-lbl { font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
    .timeline-list { display: flex; flex-direction: column; gap: 8px; max-height: 52dvh; overflow-y: auto; padding-right: 2px; }
    .timeline-item { background: #0f172a; border-left: 4px solid #38bdf8; border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; line-height: 1.35; }
    .timeline-item.tl-out { border-left-color: #f97316; }
    .timeline-item.tl-in { border-left-color: #22c55e; }
    .timeline-item.tl-repair { border-left-color: #a855f7; }
    .search-bar-row { display: flex; gap: 8px; align-items: stretch; }
    .btn-search-scan { background: #0284c7; color: #fff; border: 2px solid #38bdf8; border-radius: 10px; padding: 0 14px; font-weight: 800; font-size: 0.86rem; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
    .search-scan-banner { background: #0284c7; color: #fff; padding: 10px 12px; border-radius: 10px; font-weight: 800; font-size: 0.88rem; display: none; justify-content: space-between; align-items: center; margin: 0 10px 6px 10px; }
    .search-scan-banner.active { display: flex; }
  `;
  document.head.appendChild(style);

  // Wrap searchInput in a row with a "📷 Scan QR / ID" button
  if (UI.searchInput && UI.searchInput.parentElement) {
    const searchRow = document.createElement('div');
    searchRow.className = 'search-bar-row';
    UI.searchInput.parentElement.insertBefore(searchRow, UI.searchInput);
    searchRow.appendChild(UI.searchInput);

    const btnScanSearch = document.createElement('button');
    btnScanSearch.id = 'btnScanInSearch';
    btnScanSearch.type = 'button';
    btnScanSearch.className = 'btn-search-scan';
    btnScanSearch.innerHTML = '📷 Scan QR / ID';
    searchRow.appendChild(btnScanSearch);
  }

  // Add Search-Scan mode banner to viewScanner so when triggered from Search tab, it guides the user clearly
  const viewScanner = document.getElementById('viewScanner');
  if (viewScanner) {
    const banner = document.createElement('div');
    banner.id = 'searchScanBanner';
    banner.className = 'search-scan-banner';
    banner.innerHTML = `<span>🔎 Scan Instrument QR or Student ID for History...</span><button id="btnCancelSearchScan" type="button" class="btn-secondary" style="padding:4px 10px; font-size:0.78rem; background:#0f172a;">✖ Cancel</button>`;
    viewScanner.insertBefore(banner, viewScanner.firstChild);
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="txModal" class="modal-backdrop">
      <div class="modal-box">
        <div id="txHeroBox" class="tx-hero-box">
          <div id="txHeroTitle" class="tx-hero-title">🎺 TRUMPET #1</div>
          <div id="txHeroSub" class="tx-hero-sub">Ensemble: Band</div>
        </div>
        <div id="txErrorBox" class="tx-error-banner" style="display:none;"></div>
        <div id="txStudentPromptBox" style="margin-bottom:12px;">
          <label class="field-label">Checking Out To Student (Enter Line # / Student ID, or Scan Badge):</label>
          <div style="display:flex; gap:6px; margin-bottom:6px;">
            <input id="txLineInput" class="form-input" type="number" inputmode="numeric" placeholder="Line # or ID" style="width:125px; font-size:1rem; font-weight:800;">
            <select id="txEnsembleSelect" class="form-select" style="flex:1;">
              <option value="Band">Band</option>
              <option value="Orchestra">Orchestra</option>
              <option value="Repair">🔧 Repair (#900)</option>
            </select>
          </div>
          <div id="txQuickStudentChips" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;"></div>
          <div id="txSelectedStudentCard" style="margin-top:8px; padding:8px 10px; background:#0f172a; border-radius:8px; border-left:4px solid #22c55e; display:none;"></div>
        </div>
        <div id="txAssignBox" class="tx-assign-box" style="display:none;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:800; color:#38bdf8; cursor:pointer;">
            <input id="chkTxAssign" type="checkbox" style="width:18px; height:18px;">
            <span id="lblTxAssign">📌 Assign this instrument to student on Roster?</span>
          </label>
          <div id="txAssignModeRow" style="margin-top:8px; padding-left:26px; display:none; font-size:0.78rem; color:#cbd5e1;">
            <label style="cursor:pointer;"><input type="radio" name="txAssignMode" value="APPEND" checked> ➕ Add as 2nd Instrument</label>
            <label style="cursor:pointer; margin-left:10px;"><input type="radio" name="txAssignMode" value="REPLACE"> 🔄 Replace Current</label>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button id="btnTxConfirm" class="btn-success-large" style="margin-bottom:0;" type="button">✓ Confirm</button>
          <button id="btnTxCancel" class="btn-secondary" style="width:100%;" type="button">Cancel</button>
        </div>
      </div>
    </div>

    <div id="unlistedModal" class="modal-backdrop">
      <div class="modal-box">
        <div style="font-weight:900; font-size:1.1rem; color:#fcd34d; margin-bottom:6px;">⚠️ Unlisted Line Number</div>
        <div id="unlistedPromptText" style="font-size:0.86rem; color:#cbd5e1; margin-bottom:12px; line-height:1.4;"></div>
        <button id="btnUnlistedTypo" class="btn-secondary" style="width:100%; margin-bottom:12px; border:1px solid #475569;" type="button">🔙 It Was a Typo — Clear & Re-Enter Line #</button>
        <div style="font-size:0.74rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:8px; text-align:center;">— OR Add New Student to Roster —</div>
        <div class="form-row" style="margin-bottom:10px;">
          <div><label class="field-label">Line #</label><input id="newStuLineInput" class="form-input" type="number" inputmode="numeric"></div>
          <div>
            <label class="field-label">Ensemble</label>
            <select id="newStuEnsembleSelect" class="form-select">
              <option value="Band">Band</option>
              <option value="Orchestra">Orchestra</option>
              <option value="Both">Both (Band & Orch)</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:12px;"><label class="field-label">Student Full Name</label><input id="newStuNameInput" class="form-input" type="text" placeholder="e.g. Sam Carter"></div>
        <button id="btnSaveNewStudent" class="btn-primary" style="width:100%;" type="button">➕ Save Student to Roster & Continue</button>
      </div>
    </div>

    <div id="historyModal" class="modal-backdrop">
      <div class="modal-box">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div>
            <div id="histModalTitle" style="font-weight:900; font-size:1.12rem; color:#38bdf8;">📜 Full History</div>
            <div id="histModalSub" style="font-size:0.78rem; color:#94a3b8; margin-top:2px;">Active Term Log</div>
          </div>
          <button id="btnCloseHistory" class="btn-secondary" style="padding:5px 10px; font-size:0.8rem;" type="button">✖ Close</button>
        </div>
        <div class="stat-grid-3">
          <div class="stat-mini-box"><div id="histStatOut" class="stat-mini-num" style="color:#fdba74;">0</div><div class="stat-mini-lbl">Check-Outs</div></div>
          <div class="stat-mini-box"><div id="histStatIn" class="stat-mini-num" style="color:#6ee7b7;">0</div><div class="stat-mini-lbl">Check-Ins</div></div>
          <div class="stat-mini-box"><div id="histStatOther" class="stat-mini-num" style="color:#e9d5ff;">0</div><div class="stat-mini-lbl">Swaps/Repairs</div></div>
        </div>
        <div id="histTimelineList" class="timeline-list"></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  const actionRow = document.getElementById('studentActionButtons');
  if (actionRow && !document.getElementById('btnAddUnlistedStu')) {
    const addBtn = document.createElement('button');
    addBtn.id = 'btnAddUnlistedStu';
    addBtn.type = 'button';
    addBtn.className = 'mini-action-btn warn-accent';
    addBtn.style.display = 'none';
    addBtn.textContent = '➕ Add / Fix Unlisted #';
    actionRow.insertBefore(addBtn, actionRow.firstChild);
  }
}

function patchTrackerDBForInstrumentColumn() {
  window.TrackerDB.saveServerBundle = async function ({ roster = [], instruments = [], logs = [], repairs = [] }) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['roster', 'instruments', 'scan_history', 'repairs_history'], 'readwrite');
      const rosterStore = tx.objectStore('roster');
      const instStore = tx.objectStore('instruments');
      const histStore = tx.objectStore('scan_history');
      const repStore = tx.objectStore('repairs_history');
      rosterStore.clear(); instStore.clear(); histStore.clear(); repStore.clear();

      const instMap = new Map();
      const stuMap = new Map();
      let hasRepairShop = false;

      for (const rawInst of instruments) {
        const section = String(rawInst.Instrument || rawInst.Section || '').trim();
        const caseId = String(rawInst.Case_ID || rawInst.Assigned_Case_ID || '').trim();
        if (!section || !caseId) continue;
        const instKey = `${section.toUpperCase()}|${caseId.toUpperCase()}`;
        instMap.set(instKey, {
          inst_key: instKey, Ensemble: String(rawInst.Ensemble || '').trim(),
          Section: section, Instrument: section, Case_ID: caseId,
          Brand: String(rawInst.Brand || '').trim(), Model: String(rawInst.Model || '').trim(),
          Serial: String(rawInst.Serial || '').trim(), Notes: String(rawInst.Notes || '').trim(),
          Assigned_Student: 'Unassigned / Spare', Assigned_Line: null, in_master_tab: true, in_roster: false
        });
      }

      for (const raw of roster) {
        const lineNum = parseInt(raw.Line_Number, 10);
        if (isNaN(lineNum)) continue;
        const ensemble = String(raw.Ensemble || 'Band').trim();
        const section = String(raw.Instrument || raw.Section || '').trim();
        const caseId = String(raw.Assigned_Case_ID || raw.Case_ID || '').trim();
        const studentId = String(raw.Student_ID || '').trim();
        const compositeId = `${ensemble.toUpperCase()}|${lineNum}`;
        if (ensemble.toUpperCase() === 'REPAIR' || lineNum === 900) hasRepairShop = true;

        if (stuMap.has(compositeId)) {
          const prev = stuMap.get(compositeId);
          if (section && caseId) {
            prev.Section = [prev.Section, section].filter(Boolean).join(', ');
            prev.Instrument = prev.Section;
            prev.Assigned_Case_ID = [prev.Assigned_Case_ID, caseId].filter(Boolean).join(', ');
          }
          if (studentId && !prev.Student_ID) prev.Student_ID = studentId;
        } else {
          stuMap.set(compositeId, {
            composite_id: compositeId, Line_Number: lineNum, Student_Name: String(raw.Student_Name || '').trim(),
            Ensemble: ensemble, Section: section, Instrument: section, Assigned_Case_ID: caseId, Student_ID: studentId
          });
        }

        const tempStu = stuMap.get(compositeId);
        for (const pair of getStudentAssignedPairs(tempStu)) {
          if (ensemble.toUpperCase() === 'REPAIR') continue;
          const instKey = `${pair.section.toUpperCase()}|${pair.caseId.toUpperCase()}`;
          const existing = instMap.get(instKey);
          if (existing) {
            existing.Assigned_Student = tempStu.Student_Name;
            existing.Assigned_Line = lineNum;
            existing.in_roster = true;
          } else {
            let masterSecEns = '';
            for (const mInst of instMap.values()) {
              if (mInst.in_master_tab && mInst.Section.toUpperCase() === pair.section.toUpperCase() && mInst.Ensemble) {
                masterSecEns = mInst.Ensemble; break;
              }
            }
            instMap.set(instKey, {
              inst_key: instKey, Ensemble: masterSecEns || ensemble, Section: pair.section, Instrument: pair.section,
              Case_ID: pair.caseId, Brand: String(raw.Brand || '').trim(), Model: String(raw.Model || '').trim(),
              Serial: String(raw.Serial || '').trim(), Notes: '', Assigned_Student: tempStu.Student_Name,
              Assigned_Line: lineNum, in_master_tab: false, in_roster: true
            });
          }
        }
      }

      for (const stuObj of stuMap.values()) rosterStore.put(stuObj);
      if (!hasRepairShop) {
        rosterStore.put({
          composite_id: 'REPAIR|900', Line_Number: 900, Student_Name: '🔧 Repair Shop',
          Ensemble: 'Repair', Section: 'Repair Vendor', Instrument: 'Repair Vendor', Assigned_Case_ID: 'ANY', Student_ID: 'SHOP900'
        });
      }
      for (const instObj of instMap.values()) instStore.put(instObj);
      for (const log of logs) {
        const cleanSec = String(log.Section || log.Instrument || '').trim();
        histStore.add({ ...log, Section: cleanSec, Instrument: cleanSec });
      }
      for (const rep of repairs) repStore.add(rep);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  injectWideCameraAndModals();
  patchTrackerDBForInstrumentColumn();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=15').catch(() => {});
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

function normalizeAlign(val) {
  const clean = String(val || 'center').trim().toLowerCase();
  return clean === 'left' || clean === 'right' ? clean : 'center';
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
  if (typeof data.textAlignment === 'string' && data.textAlignment) {
    AppState.textAlignment = normalizeAlign(data.textAlignment);
    localStorage.setItem(STORAGE_KEYS.TEXT_ALIGN, AppState.textAlignment);
  }
  if (typeof data.footerAlignment === 'string' && data.footerAlignment) {
    AppState.footerAlignment = normalizeAlign(data.footerAlignment);
    localStorage.setItem(STORAGE_KEYS.FOOTER_ALIGN, AppState.footerAlignment);
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
      Ensemble: 'Repair', Section: 'Repair Vendor', Instrument: 'Repair Vendor', Assigned_Case_ID: 'ANY', Student_ID: 'SHOP900'
    });
  }
  UI.rosterCountText.textContent = AppState.rosterList.length;
  UI.historyCountText.textContent = AppState.scanHistory.length;
  const sections = [...new Set(AppState.instrumentsList.map((i) => getSec(i)).filter(Boolean))];
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
  } else if (AppState.currentInput.length < 10) {
    if (AppState.currentInput === '' && key === '0') return;
    AppState.currentInput += key;
  }
  lookupByLineNumber(AppState.currentInput);
}

function lookupByLineNumber(inputStr) {
  AppState.awaitingIdLink = false;
  UI.btnLinkSchoolId.textContent = '🔗 Link ID';
  UI.studentCard.classList.remove('repair-active');
  const addUnlistedBtn = document.getElementById('btnAddUnlistedStu');
  if (addUnlistedBtn) addUnlistedBtn.style.display = 'none';

  if (!inputStr) {
    UI.lineDisplay.textContent = '---';
    UI.studentName.textContent = 'Scan Case QR or Type Line #';
    UI.studentMeta.textContent = 'Scan instrument first OR enter Line # / ID';
    UI.expectedCase.textContent = '—';
    UI.candidateList.style.display = 'none';
    UI.studentActionButtons.style.display = 'none';
    UI.studentCard.classList.remove('ready-to-scan');
    UI.cameraCard.classList.remove('active-target');
    UI.cameraStatusBadge.textContent = '📷 Ready: Scan Instrument QR or Student ID';
    AppState.matchedCandidates = [];
    AppState.activeStudent = null;
    return;
  }

  const lineNum = parseInt(inputStr, 10);
  UI.lineDisplay.textContent = inputStr;

  // Match by Line_Number OR district Student_ID
  const matches = AppState.rosterList.filter((s) => {
    const idMatch = s.Student_ID && String(s.Student_ID).trim() === String(inputStr).trim();
    if (idMatch) return true;
    const lineMatch = Number(s.Line_Number) === lineNum;
    if (lineNum >= 900 || String(s.Ensemble).toUpperCase() === 'REPAIR') return lineMatch;
    return lineMatch && (AppState.ensembleFilter === 'ALL' || s.Ensemble.toUpperCase() === AppState.ensembleFilter.toUpperCase());
  });

  AppState.matchedCandidates = matches;
  if (matches.length === 1) selectActiveStudent(matches[0], false);
  else if (matches.length > 1) selectActiveStudent(matches[0], true);
  else {
    AppState.activeStudent = null;
    UI.candidateList.style.display = 'none';
    UI.studentName.textContent = `⚠️ #${inputStr} Not on Roster`;
    UI.studentMeta.textContent = 'Tap button to fix typo or add student';
    UI.expectedCase.textContent = 'UNLISTED';
    UI.studentActionButtons.style.display = 'flex';
    UI.btnManualCase.style.display = 'none';
    UI.btnLinkSchoolId.style.display = 'none';
    if (addUnlistedBtn) addUnlistedBtn.style.display = 'inline-block';
    UI.studentCard.classList.remove('ready-to-scan');
    UI.cameraCard.classList.remove('active-target');
    UI.cameraStatusBadge.textContent = `⚠️ #${inputStr} Unlisted — Tap Add/Fix Above`;
  }
}

function openUnlistedLineModal(lineNum, onStudentCreatedCallback) {
  const modal = document.getElementById('unlistedModal');
  document.getElementById('unlistedPromptText').innerHTML =
    `Line <strong>#${lineNum}</strong> is not on the Roster. Was that a typo, or would you like to add a new student to Line #${lineNum}?`;
  document.getElementById('newStuLineInput').value = lineNum;
  document.getElementById('newStuEnsembleSelect').value = AppState.ensembleFilter === 'Orchestra' ? 'Orchestra' : 'Band';
  document.getElementById('newStuNameInput').value = '';
  AppState.onUnlistedResolved = onStudentCreatedCallback || null;
  modal.classList.add('open');
}

async function handleSaveNewStudentFromModal() {
  const lineNum = parseInt(document.getElementById('newStuLineInput').value, 10);
  const ens = document.getElementById('newStuEnsembleSelect').value;
  const name = document.getElementById('newStuNameInput').value.trim();
  if (!lineNum || isNaN(lineNum)) return alert('Please enter a valid Line Number.');
  if (!name) return alert('Please enter the student name.');

  const newStu = {
    composite_id: `${ens.toUpperCase()}|${lineNum}`, Line_Number: lineNum, Student_Name: name,
    Ensemble: ens, Section: '', Instrument: '', Assigned_Case_ID: '', Student_ID: ''
  };
  AppState.rosterList.push(newStu);
  await window.TrackerDB.enqueueItem({
    Request_Type: 'ADD_STUDENT', Auth_PIN: AppState.userPin, Line_Number: lineNum,
    Student_Name: name, Ensemble: ens, Section: '', Case_ID: ''
  });

  document.getElementById('unlistedModal').classList.remove('open');
  playTone('MATCH');
  if (typeof AppState.onUnlistedResolved === 'function') {
    const cb = AppState.onUnlistedResolved;
    AppState.onUnlistedResolved = null;
    cb(newStu);
  } else {
    AppState.currentInput = String(lineNum);
    lookupByLineNumber(AppState.currentInput);
  }
  updateSyncBadge();
  flushOutboundQueue();
}

function isRepairShopEntity(student) {
  return Boolean(student && (String(student.Ensemble || '').toUpperCase() === 'REPAIR' || Number(student.Line_Number) >= 900));
}

function selectActiveStudent(student, showCandidateSwitcher) {
  AppState.activeStudent = student;
  const isRepair = isRepairShopEntity(student);
  const addUnlistedBtn = document.getElementById('btnAddUnlistedStu');
  if (addUnlistedBtn) addUnlistedBtn.style.display = 'none';
  UI.btnManualCase.style.display = 'inline-block';

  UI.studentName.textContent = student.Student_Name;
  UI.studentMeta.textContent = isRepair
    ? `Repair (${AppState.actionMode === 'CHECK_OUT' ? 'OUT to Shop' : 'IN from Shop'})`
    : `${student.Ensemble} #${student.Line_Number}${student.Student_ID ? ' • ID:' + student.Student_ID : ''}`;
  UI.expectedCase.textContent = isRepair ? 'Any Case' : formatAssignedPairsText(student);

  UI.studentActionButtons.style.display = 'flex';
  UI.btnLinkSchoolId.style.display = isRepair ? 'none' : 'inline-block';
  UI.studentCard.classList.add('ready-to-scan');
  UI.studentCard.classList.toggle('repair-active', isRepair);
  UI.cameraCard.classList.add('active-target');
  UI.cameraStatusBadge.textContent = isRepair ? '🔧 Scan Instrument Case for Repair' : `🎯 Scan Instrument QR for ${student.Student_Name}`;

  if (showCandidateSwitcher && AppState.matchedCandidates.length > 1) {
    UI.candidateList.style.display = 'flex';
    UI.candidateList.innerHTML = AppState.matchedCandidates.map((cand, idx) => {
      const isSel = cand.composite_id === student.composite_id ? 'selected' : '';
      return `<button class="candidate-btn ${isSel}" data-idx="${idx}" type="button">
        <strong>${cand.Ensemble}: ${cand.Student_Name}</strong> (${formatAssignedPairsText(cand)})
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
  document.getElementById('txModal').classList.remove('open');
  AppState.pendingTx = null;
  AppState.currentInput = '';
  AppState.postTransactionReset = false;
  lookupByLineNumber('');
}

async function startAlwaysOnCamera() {
  if (AppState.scannerStarted) return;
  AppState.scannerStarted = true;
  try {
    AppState.html5QrCode = new Html5Qrcode('reader');
    await AppState.html5QrCode.start({ facingMode: 'environment' }, { fps: 15, qrbox: { width: 220, height: 170 } }, onCodeScanned, () => {});
  } catch (err) {
    AppState.scannerStarted = false;
    UI.cameraStatusBadge.textContent = '⚠️ Allow HTTPS Camera Access';
  }
}

function isAnyModalBlockingScan() {
  if (!UI.loginOverlay.classList.contains('hidden')) return true;
  if (UI.manualCaseModal.classList.contains('open')) return true;
  if (UI.repairModal.classList.contains('open')) return true;
  if (document.getElementById('unlistedModal').classList.contains('open')) return true;
  if (document.getElementById('historyModal').classList.contains('open')) return true;
  return false;
}

/**
 * Activates Search Scan Mode: switches to the live camera viewfinder to scan an Instrument QR
 * or Student ID QR, then returns to the Search tab and pops open the Full History Modal!
 */
function startSearchScanMode() {
  AppState.searchScanActive = true;
  const banner = document.getElementById('searchScanBanner');
  if (banner) banner.classList.add('active');
  UI.navTabs.forEach((t) => t.classList.toggle('active', t.dataset.view === 'viewScanner'));
  UI.views.forEach((v) => v.classList.toggle('active', v.id === 'viewScanner'));
  UI.cameraStatusBadge.textContent = '🔎 SEARCH SCAN: Point at Instrument QR or Student ID';
}

function stopSearchScanMode(switchBackToSearch = true) {
  AppState.searchScanActive = false;
  const banner = document.getElementById('searchScanBanner');
  if (banner) banner.classList.remove('active');
  if (switchBackToSearch) {
    UI.navTabs.forEach((t) => t.classList.toggle('active', t.dataset.view === 'viewSearch'));
    UI.views.forEach((v) => v.classList.toggle('active', v.id === 'viewSearch'));
  }
}

async function onCodeScanned(rawText) {
  if (isAnyModalBlockingScan()) return;
  const now = Date.now();
  if (now - AppState.lastScanTime < 1500) return;
  const code = String(rawText || '').trim();
  if (!code) return;
  unlockAudio();

  // CASE 0: Search Scan Mode Active -> Open Search & Full History for scanned Instrument or Student ID!
  if (AppState.searchScanActive) {
    AppState.lastScanTime = now;
    if (code.toUpperCase().startsWith('INST|')) {
      const parts = code.split('|');
      const sec = (parts[1] || '').trim();
      const num = (parts[2] || '').trim();
      playTone('MATCH');
      stopSearchScanMode(true);
      UI.searchInput.value = `${sec} ${num}`;
      runStatusSearch(UI.searchInput.value);
      openFullHistoryModal('INST', sec, num);
      return;
    }
    if (code.toUpperCase().startsWith('STU|')) {
      const parts = code.split('|');
      const ens = (parts[1] || '').trim().toUpperCase();
      const lineNum = parseInt(parts[2], 10);
      const stu = AppState.rosterList.find((s) => s.Ensemble.toUpperCase() === ens && Number(s.Line_Number) === lineNum);
      if (stu) {
        playTone('MATCH');
        stopSearchScanMode(true);
        UI.searchInput.value = stu.Student_Name;
        runStatusSearch(UI.searchInput.value);
        openFullHistoryModal('STU', stu.composite_id, '');
      }
      return;
    }
    // District Student ID QR code
    const stuById = AppState.rosterList.find((s) => s.Student_ID && String(s.Student_ID).trim().toUpperCase() === code.toUpperCase());
    if (stuById) {
      playTone('MATCH');
      stopSearchScanMode(true);
      UI.searchInput.value = stuById.Student_Name;
      runStatusSearch(UI.searchInput.value);
      openFullHistoryModal('STU', stuById.composite_id, '');
      return;
    }
    playTone('WARNING');
    stopSearchScanMode(true);
    UI.searchInput.value = code;
    runStatusSearch(code);
    alert(`Scanned ID "${code}" is not linked to a student or instrument on the Roster yet.`);
    return;
  }

  const txModalOpen = document.getElementById('txModal').classList.contains('open');
  if (txModalOpen && AppState.pendingTx && AppState.pendingTx.mode === 'CHECK_OUT') {
    if (code.toUpperCase().startsWith('STU|')) {
      AppState.lastScanTime = now;
      const parts = code.split('|');
      const ens = (parts[1] || '').trim().toUpperCase();
      const lineNum = parseInt(parts[2], 10);
      const stu = AppState.rosterList.find((s) => s.Ensemble.toUpperCase() === ens && Number(s.Line_Number) === lineNum);
      if (stu) { playTone('MATCH'); setTxModalSelectedStudent(stu); }
      return;
    }
    const stuByBadge = AppState.rosterList.find((s) => s.Student_ID && String(s.Student_ID).trim().toUpperCase() === code.toUpperCase());
    if (stuByBadge) {
      AppState.lastScanTime = now;
      playTone('MATCH');
      setTxModalSelectedStudent(stuByBadge);
      return;
    }
    // If a student is already selected in txModal and has no Student_ID yet, link this scanned district ID to them!
    if (AppState.pendingTx.student && !AppState.pendingTx.student.Student_ID && !code.toUpperCase().startsWith('INST|')) {
      AppState.lastScanTime = now;
      const stu = AppState.pendingTx.student;
      stu.Student_ID = code;
      playTone('MATCH');
      await window.TrackerDB.enqueueItem({
        Request_Type: 'LINK_STUDENT_ID', Auth_PIN: AppState.userPin,
        Ensemble: stu.Ensemble, Line_Number: stu.Line_Number, Student_ID: code
      });
      setTxModalSelectedStudent(stu);
      flushOutboundQueue();
    }
    return;
  }
  if (txModalOpen) return;

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
    AppState.lastScanTime = now;
    const parts = code.split('|');
    await handleInstrumentScanFlow((parts[1] || '').trim(), (parts[2] || '').trim(), '');
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
  }
}

async function handleInstrumentScanFlow(scannedSection, scannedCaseId, initialNote = '') {
  if (AppState.currentInput && !AppState.activeStudent) {
    const unlistedNum = parseInt(AppState.currentInput, 10);
    playTone('WARNING');
    openUnlistedLineModal(unlistedNum, (createdStu) => {
      selectActiveStudent(createdStu, false);
      openTransactionConfirmationModal(scannedSection, scannedCaseId, initialNote);
    });
    return;
  }
  if (AppState.activeStudent && isRepairShopEntity(AppState.activeStudent)) {
    openRepairDetailsModal(scannedSection, scannedCaseId, initialNote);
    return;
  }
  openTransactionConfirmationModal(scannedSection, scannedCaseId, initialNote);
}

function openTransactionConfirmationModal(section, caseId, initialNote = '') {
  const instState = getInstrumentCurrentState(section, caseId);
  const authEns = getAuthoritativeInstrumentEnsemble(section, caseId) || 'Music';

  if (instState.isOut && instState.inRepair) {
    AppState.actionMode = 'CHECK_IN';
    applyModeUI('CHECK_IN');
    openRepairDetailsModal(section, caseId, initialNote);
    return;
  }

  playTone('MATCH');
  vibrateDevice('MATCH');

  const txModal = document.getElementById('txModal');
  const heroTitle = document.getElementById('txHeroTitle');
  const heroSub = document.getElementById('txHeroSub');
  const errorBox = document.getElementById('txErrorBox');
  const stuPromptBox = document.getElementById('txStudentPromptBox');
  const assignBox = document.getElementById('txAssignBox');
  const btnConfirm = document.getElementById('btnTxConfirm');
  const txLineInput = document.getElementById('txLineInput');
  const txEnsembleSelect = document.getElementById('txEnsembleSelect');
  const quickChips = document.getElementById('txQuickStudentChips');

  heroTitle.textContent = `🎺 ${section.toUpperCase()} #${caseId}`;
  errorBox.style.display = 'none';

  if (instState.isOut && instState.lastLog) {
    const outLog = instState.lastLog;
    heroSub.innerHTML = `Ensemble: <strong>${escapeHtml(authEns)}</strong><br><span style="color:#fcd34d;">Currently Checked OUT to ${escapeHtml(outLog.Student_Name)} (#${outLog.Line_Number})</span>`;
    stuPromptBox.style.display = 'none';
    assignBox.style.display = 'none';
    btnConfirm.disabled = false;
    btnConfirm.style.opacity = '1';
    btnConfirm.style.background = '#0284c7';
    btnConfirm.textContent = `📥 Confirm Check-In (${section} #${caseId})`;

    AppState.pendingTx = {
      mode: 'CHECK_IN', section, caseId: String(caseId), instEnsemble: authEns, initialNote,
      student: { Line_Number: Number(outLog.Line_Number), Student_Name: outLog.Student_Name, Ensemble: authEns, Section: section, Assigned_Case_ID: String(caseId) }
    };
    txModal.classList.add('open');
    return;
  }

  heroSub.innerHTML = `Ensemble: <strong>${escapeHtml(authEns)}</strong> • Status: <span style="color:#6ee7b7;">IN STORAGE</span>`;
  stuPromptBox.style.display = 'block';
  txEnsembleSelect.value = authEns === 'Orchestra' ? 'Orchestra' : 'Band';

  const assignedStudents = AppState.rosterList.filter((s) => !isRepairShopEntity(s) && isInstrumentAssignedToStudent(s, section, caseId));
  quickChips.innerHTML = assignedStudents.map((s) =>
    `<button type="button" class="btn-secondary tx-stu-chip" data-comp="${escapeHtml(s.composite_id)}" style="font-size:0.76rem; padding:6px 10px; border:1px solid #38bdf8;">
      👤 Assigned: ${escapeHtml(s.Student_Name)} (${s.Ensemble} #${s.Line_Number})
    </button>`
  ).join('');

  quickChips.querySelectorAll('.tx-stu-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const stu = AppState.rosterList.find((r) => r.composite_id === chip.dataset.comp);
      if (stu) setTxModalSelectedStudent(stu);
    });
  });

  AppState.pendingTx = { mode: 'CHECK_OUT', section, caseId: String(caseId), instEnsemble: authEns, initialNote, student: null };

  if (AppState.activeStudent) {
    let chosen = AppState.activeStudent;
    if (AppState.matchedCandidates.length > 1) {
      const exactCand = AppState.matchedCandidates.find((c) => isInstrumentAssignedToStudent(c, section, caseId));
      const ensCand = AppState.matchedCandidates.find((c) => c.Ensemble.toUpperCase() === authEns.toUpperCase());
      if (exactCand) chosen = exactCand;
      else if (ensCand) chosen = ensCand;
    }
    setTxModalSelectedStudent(chosen);
  } else {
    txLineInput.value = '';
    setTxModalSelectedStudent(null);
  }
  txModal.classList.add('open');
}

function setTxModalSelectedStudent(student) {
  if (!AppState.pendingTx) return;
  const { section, caseId } = AppState.pendingTx;
  const card = document.getElementById('txSelectedStudentCard');
  const errorBox = document.getElementById('txErrorBox');
  const assignBox = document.getElementById('txAssignBox');
  const chkAssign = document.getElementById('chkTxAssign');
  const lblAssign = document.getElementById('lblTxAssign');
  const assignModeRow = document.getElementById('txAssignModeRow');
  const btnConfirm = document.getElementById('btnTxConfirm');
  const txLineInput = document.getElementById('txLineInput');
  const txEnsembleSelect = document.getElementById('txEnsembleSelect');

  AppState.pendingTx.student = student;
  if (!student) {
    card.style.display = 'none';
    errorBox.style.display = 'none';
    assignBox.style.display = 'none';
    btnConfirm.disabled = true;
    btnConfirm.style.opacity = '0.5';
    btnConfirm.textContent = 'Enter Line # / ID or Scan Student Badge';
    return;
  }

  txLineInput.value = student.Line_Number;
  if (student.Ensemble === 'Band' || student.Ensemble === 'Orchestra') txEnsembleSelect.value = student.Ensemble;

  card.style.display = 'block';
  card.innerHTML = `<strong>👤 ${escapeHtml(student.Student_Name)}</strong> (${escapeHtml(student.Ensemble)} #${student.Line_Number}${student.Student_ID ? ' • ID:' + escapeHtml(student.Student_ID) : ''})<br><span style="font-size:0.76rem; color:#94a3b8;">Roster Assignment: ${escapeHtml(formatAssignedPairsText(student))}</span>`;

  const compat = checkEnsembleCompatibility(student, section, caseId);
  if (!compat.allowed) {
    playTone('WARNING');
    errorBox.style.display = 'block';
    errorBox.innerHTML = `⛔ <strong>ENSEMBLE MISMATCH:</strong> ${escapeHtml(student.Student_Name)} is in <strong>${escapeHtml(compat.stuEnsemble)}</strong>, but ${escapeHtml(section)} #${escapeHtml(caseId)} belongs to <strong>${escapeHtml(compat.instEnsemble)}</strong>.<br>Checkout blocked unless student is marked "Both" or "All" on Roster.`;
    assignBox.style.display = 'none';
    btnConfirm.disabled = true;
    btnConfirm.style.opacity = '0.4';
    btnConfirm.textContent = '⛔ Ensemble Mismatch — Blocked';
    return;
  }

  errorBox.style.display = 'none';
  btnConfirm.disabled = false;
  btnConfirm.style.opacity = '1';
  btnConfirm.style.background = '#7c3aed';
  btnConfirm.textContent = `📤 Confirm Check-Out to ${student.Student_Name}`;

  if (!isRepairShopEntity(student) && !isInstrumentAssignedToStudent(student, section, caseId)) {
    assignBox.style.display = 'block';
    const hasExisting = getStudentAssignedPairs(student).length > 0;
    chkAssign.checked = !hasExisting;
    lblAssign.textContent = `📌 Also assign ${section} #${caseId} to ${student.Student_Name}?`;
    assignModeRow.style.display = hasExisting ? 'block' : 'none';
  } else {
    assignBox.style.display = 'none';
    chkAssign.checked = false;
  }
}

function handleTxModalLineLookup() {
  if (!AppState.pendingTx) return;
  const lineStr = document.getElementById('txLineInput').value.trim();
  const ensVal = document.getElementById('txEnsembleSelect').value;
  if (!lineStr) return setTxModalSelectedStudent(null);

  const lineNum = parseInt(lineStr, 10);
  if (ensVal === 'Repair' || lineNum === 900) {
    const shop = AppState.rosterList.find((s) => isRepairShopEntity(s));
    if (shop) setTxModalSelectedStudent(shop);
    return;
  }

  // Match either district Student_ID or Line_Number + Ensemble
  const byDistrictId = AppState.rosterList.find((s) => s.Student_ID && String(s.Student_ID).trim() === lineStr);
  const found = byDistrictId || AppState.rosterList.find(
    (s) => Number(s.Line_Number) === lineNum && (s.Ensemble.toUpperCase() === ensVal.toUpperCase() || s.Ensemble.toUpperCase() === 'BOTH' || s.Ensemble.toUpperCase() === 'ALL')
  );
  if (found) setTxModalSelectedStudent(found);
  else {
    setTxModalSelectedStudent(null);
    const card = document.getElementById('txSelectedStudentCard');
    card.style.display = 'block';
    card.innerHTML = `<span style="color:#fcd34d; font-weight:800;">⚠️ #${lineNum} (${ensVal}) is not on the Roster.</span>
      <div style="margin-top:6px;"><button id="btnTxAddUnlisted" type="button" class="btn-primary" style="font-size:0.76rem; padding:6px 10px;">➕ Add New Student to Line #${lineNum}</button></div>`;
    document.getElementById('btnTxAddUnlisted').addEventListener('click', () => {
      openUnlistedLineModal(lineNum, (newStu) => setTxModalSelectedStudent(newStu));
    });
  }
}

async function executeConfirmedTransaction() {
  if (!AppState.pendingTx || !AppState.pendingTx.student) return;
  const { mode, section, caseId, instEnsemble, initialNote, student } = AppState.pendingTx;
  document.getElementById('txModal').classList.remove('open');

  if (isRepairShopEntity(student)) {
    AppState.activeStudent = student;
    AppState.actionMode = 'CHECK_OUT';
    applyModeUI('CHECK_OUT');
    openRepairDetailsModal(section, caseId, initialNote);
    return;
  }

  let statusFlag = 'DIRECT_MATCH';
  const wasAssigned = isInstrumentAssignedToStudent(student, section, caseId);
  const chkAssign = document.getElementById('chkTxAssign');
  if (mode === 'CHECK_OUT' && !wasAssigned && chkAssign && chkAssign.checked) {
    const modeRadio = document.querySelector('input[name="txAssignMode"]:checked');
    await applyStudentInstrumentAssignment(student, section, caseId, modeRadio ? modeRadio.value : 'APPEND');
    statusFlag = 'DIRECT_MATCH';
  } else if (!wasAssigned) {
    statusFlag = getStudentAssignedPairs(student).length === 0 ? 'UNASSIGNED' : 'SWAP';
  }

  const authoritativeEnsemble = getAuthoritativeInstrumentEnsemble(section, caseId) || instEnsemble || student.Ensemble;
  const logEntry = {
    Request_Type: 'SCAN_LOG', Auth_PIN: AppState.userPin, Timestamp: getLocalTimestamp(),
    Ensemble: authoritativeEnsemble, Line_Number: Number(student.Line_Number), Student_Name: student.Student_Name,
    Section: section, Instrument: section, Case_ID: String(caseId), Action: mode,
    Status_Flag: statusFlag, Volunteer_Note: initialNote, Scanned_By: `${AppState.userName} (${AppState.userRole})`
  };

  AppState.scanHistory.push(logEntry);
  const localId = await window.TrackerDB.enqueueItem(logEntry);
  AppState.lastTransaction = { ...logEntry, local_id: localId };
  AppState.postTransactionReset = true;
  AppState.pendingTx = null;

  playTone('MATCH');
  vibrateDevice('MATCH');

  UI.resultBanner.className = `result-banner visible ${statusFlag === 'DIRECT_MATCH' ? 'match' : 'swap'}`;
  UI.resultIcon.textContent = '✓';
  UI.resultTitle.textContent = mode === 'CHECK_IN' ? 'CHECKED IN' : 'CHECKED OUT';
  UI.resultSubtitle.textContent = `${section} #${caseId} (${authoritativeEnsemble}) • ${student.Student_Name}`;

  setTimeout(() => { if (AppState.postTransactionReset) resetScannerState(); }, 1200);
  updateSyncBadge();
  flushOutboundQueue();
}

async function applyStudentInstrumentAssignment(student, section, caseId, assignMode = 'APPEND') {
  const existingPairs = getStudentAssignedPairs(student);
  const updatedPairs = (assignMode === 'APPEND' && existingPairs.length > 0)
    ? [...existingPairs, { section, caseId: String(caseId) }]
    : [{ section, caseId: String(caseId) }];

  const newSecStr = updatedPairs.map((p) => p.section).join(', ');
  const newCaseStr = updatedPairs.map((p) => p.caseId).join(', ');
  student.Section = newSecStr;
  student.Instrument = newSecStr;
  student.Assigned_Case_ID = newCaseStr;

  const instKey = `${section.toUpperCase()}|${String(caseId).toUpperCase()}`;
  const authEns = getAuthoritativeInstrumentEnsemble(section, caseId) || student.Ensemble;
  const existingInst = AppState.instrumentsList.find((i) => i.inst_key === instKey);
  if (existingInst) {
    existingInst.Assigned_Student = student.Student_Name;
    existingInst.Assigned_Line = student.Line_Number;
    existingInst.in_roster = true;
  } else {
    AppState.instrumentsList.push({
      inst_key: instKey, Ensemble: authEns, Section: section, Instrument: section,
      Case_ID: String(caseId), Brand: '', Model: '', Serial: '', Notes: '',
      Assigned_Student: student.Student_Name, Assigned_Line: student.Line_Number, in_master_tab: false, in_roster: true
    });
  }

  await window.TrackerDB.enqueueItem({
    Request_Type: 'ASSIGN_INSTRUMENT', Auth_PIN: AppState.userPin,
    Ensemble: student.Ensemble, Line_Number: Number(student.Line_Number), Section: newSecStr, Case_ID: newCaseStr
  });
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
  UI.repairShopInput.value = AppState.activeStudent && isRepairShopEntity(AppState.activeStudent)
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
    Request_Type: 'REPAIR_LOG', Auth_PIN: AppState.userPin, Timestamp: getLocalTimestamp(),
    Line_Number: AppState.activeStudent ? Number(AppState.activeStudent.Line_Number) : 900,
    Repair_Action: repairAction, Section: section, Instrument: section, Case_ID: String(caseId), Shop_Name: shopName,
    Repair_Details: details || (isReturning ? 'Returned from shop' : 'Sent for repair'),
    Cost: cost, Invoice_Number: invNum, Invoice_Base64: AppState.pendingInvoiceBase64 || '',
    Invoice_MimeType: AppState.pendingInvoiceMime || '', Scanned_By: `${AppState.userName} (${AppState.userRole})`
  };

  AppState.repairsHistory.push(repairPayload);
  AppState.scanHistory.push({
    Timestamp: repairPayload.Timestamp, Ensemble: 'Repair', Line_Number: repairPayload.Line_Number,
    Student_Name: shopName, Section: section, Instrument: section, Case_ID: String(caseId),
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
  const stu = AppState.activeStudent;
  const pairs = getStudentAssignedPairs(stu);
  const isRepair = isRepairShopEntity(stu);
  if (!isRepair && pairs.length > 0) {
    UI.btnQuickConfirmAssigned.style.display = 'block';
    UI.btnQuickConfirmAssigned.textContent = `✓ Select Assigned: ${pairs[0].section} #${pairs[0].caseId} (Flag Bad QR)`;
  } else {
    UI.btnQuickConfirmAssigned.style.display = 'none';
  }
  UI.manualSectionInput.value = !isRepair && pairs.length > 0 ? pairs[0].section : '';
  UI.manualCaseNumInput.value = !isRepair && pairs.length > 0 ? pairs[0].caseId : '';
  UI.chkFlagBadQr.checked = true;
  UI.manualCaseModal.classList.add('open');
}

function formatInstSpecs(inst) {
  if (!inst) return '';
  const parts = [];
  if (inst.Brand) parts.push(inst.Brand);
  if (inst.Model) parts.push(inst.Model);
  if (inst.Serial) parts.push(`SN: ${inst.Serial}`);
  return parts.join(' • ');
}

function resolveLogInstrumentName(log, studentFallback) {
  const direct = getSec(log);
  if (direct && direct !== 'undefined') return direct;
  if (studentFallback) {
    const pairs = getStudentAssignedPairs(studentFallback);
    const matchPair = pairs.find((p) => String(p.caseId) === String(log.Case_ID));
    if (matchPair) return matchPair.section;
    if (pairs.length > 0) return pairs[0].section;
  }
  const byStu = AppState.rosterList.find((s) => Number(s.Line_Number) === Number(log.Line_Number) && String(s.Student_Name || '').toUpperCase() === String(log.Student_Name || '').toUpperCase());
  if (byStu) {
    const pairs = getStudentAssignedPairs(byStu);
    if (pairs.length > 0) return pairs[0].section;
  }
  const byCase = AppState.instrumentsList.find((i) => String(i.Case_ID) === String(log.Case_ID));
  return byCase && getSec(byCase) ? getSec(byCase) : 'Instrument';
}

function parseSearchStatusAndDate(q) {
  let statusFilter = null;
  let remaining = q;
  if (/\b(checked\s*out|check\s*out)\b/.test(remaining) || /^out(\b|\s)/.test(remaining)) {
    statusFilter = 'OUT';
    remaining = remaining.replace(/\b(checked\s*out|check\s*out|out)\b/g, '').trim();
  } else if (/\b(checked\s*in|check\s*in|in\s*storage)\b/.test(remaining)) {
    statusFilter = 'IN';
    remaining = remaining.replace(/\b(checked\s*in|check\s*in|in\s*storage)\b/g, '').trim();
  }
  remaining = remaining.replace(/^(on|for|from)\s+/i, '').trim();

  let targetDate = null;
  if (remaining === 'today') { targetDate = new Date(); remaining = ''; }
  else if (remaining === 'yesterday') { targetDate = new Date(); targetDate.setDate(targetDate.getDate() - 1); remaining = ''; }
  else if (remaining) {
    const mdMatch = remaining.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
    if (mdMatch) {
      const m = parseInt(mdMatch[1], 10) - 1, d = parseInt(mdMatch[2], 10);
      let y = mdMatch[3] ? parseInt(mdMatch[3], 10) : new Date().getFullYear();
      if (y < 100) y += 2000;
      targetDate = new Date(y, m, d);
      remaining = '';
    } else {
      const parsed = Date.parse(remaining.includes(',') ? remaining : `${remaining} ${new Date().getFullYear()}`);
      if (!isNaN(parsed) && remaining.length >= 4 && /\d/.test(remaining)) {
        targetDate = new Date(parsed);
        remaining = '';
      }
    }
  }
  return { statusFilter, targetDate, textRemainder: remaining };
}

function isSameCalendarDay(tsStr, targetDate) {
  if (!tsStr || !targetDate) return false;
  const d = new Date(tsStr);
  return !isNaN(d.getTime()) && d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth() && d.getDate() === targetDate.getDate();
}

function runStatusSearch(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (!q) {
    UI.searchResultsContainer.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">
      Type an instrument (<strong>"Trumpet 1"</strong>), student name/ID, <strong>"checked out"</strong>, <strong>"checked out today"</strong>, or tap <strong>📷 Scan QR / ID</strong> above!<br><br>
      <span style="color:#38bdf8;">💡 Tap any search result card to view its full check-out/in history!</span>
    </div>`;
    return;
  }

  const { statusFilter, targetDate, textRemainder } = parseSearchStatusAndDate(q);
  const isPureStatusOrDateQuery = (statusFilter !== null || targetDate !== null) && textRemainder === '';
  const cardsHtml = [];

  for (const inst of AppState.instrumentsList) {
    const instSec = getSec(inst);
    const authEns = getAuthoritativeInstrumentEnsemble(instSec, inst.Case_ID) || inst.Ensemble;
    const instLogs = AppState.scanHistory.filter(
      (l) => resolveLogInstrumentName(l, null).toUpperCase() === instSec.toUpperCase() && String(l.Case_ID || '').toUpperCase() === String(inst.Case_ID).toUpperCase()
    );
    const lastLog = instLogs.length > 0 ? instLogs[instLogs.length - 1] : null;
    const inRepair = lastLog && String(lastLog.Status_Flag) === 'SENT_TO_REPAIR';
    const isOut = lastLog && lastLog.Action === 'CHECK_OUT';
    const needsQr = lastLog && String(lastLog.Volunteer_Note || '').includes('[NEEDS QR TAG]');

    let includeInst = false;
    if (isPureStatusOrDateQuery) {
      if (targetDate) includeInst = instLogs.some((l) => isSameCalendarDay(l.Timestamp, targetDate) && (!statusFilter || (statusFilter === 'OUT' ? l.Action === 'CHECK_OUT' : l.Action === 'CHECK_IN')));
      else if (statusFilter === 'OUT') includeInst = Boolean(isOut);
      else if (statusFilter === 'IN') includeInst = !isOut;
    } else {
      const searchQ = textRemainder || q;
      const hay = `${instSec} ${inst.Case_ID} ${instSec} #${inst.Case_ID} ${inst.Brand || ''} ${inst.Model || ''} ${inst.Serial || ''} ${inst.Assigned_Student || ''} ${authEns} ${lastLog ? lastLog.Volunteer_Note : ''} ${lastLog ? lastLog.Status_Flag : ''}`.toLowerCase();
      includeInst = hay.includes(searchQ) && (!statusFilter || (statusFilter === 'OUT' ? isOut : !isOut));
    }
    if (!includeInst) continue;

    const badgeClass = inRepair ? 'badge-repair' : isOut ? 'badge-out' : 'badge-in';
    const badgeLabel = inRepair ? '🔧 IN REPAIR' : isOut ? 'CHECKED OUT' : 'IN STORAGE';
    const specsLine = formatInstSpecs(inst);
    let statusDetail = `Ensemble: <strong>${escapeHtml(authEns)}</strong> • Roster Assignment: <strong>${escapeHtml(inst.Assigned_Student)}</strong> (#${inst.Assigned_Line || '—'})`;
    if (specsLine) statusDetail += `<br>Specs: <strong>${escapeHtml(specsLine)}</strong>`;
    if (lastLog) {
      statusDetail += `<br>Last Action: <strong>${inRepair ? 'Sent to Repair' : lastLog.Action === 'CHECK_OUT' ? 'Checked OUT' : 'Checked IN'}</strong> — ${escapeHtml(lastLog.Student_Name)} on ${formatShortDate(lastLog.Timestamp)}${lastLog.Scanned_By ? ' (by ' + escapeHtml(lastLog.Scanned_By) + ')' : ''}`;
      if (lastLog.Volunteer_Note) statusDetail += `<br>Note: <em>${escapeHtml(lastLog.Volunteer_Note)}</em>`;
      if (needsQr) statusDetail += `<br><span style="color:#fcd34d; font-weight:800;">🔧 FLAGGED: Needs Replacement QR Tag</span>`;
    } else statusDetail += `<br>No check-in/out scans recorded yet.`;

    cardsHtml.push(`
      <div class="result-card tappable-card" data-hist-type="INST" data-sec="${escapeHtml(instSec)}" data-case="${escapeHtml(inst.Case_ID)}">
        <div class="result-card-header"><strong style="font-size:1.05rem; color:#38bdf8;">🎺 ${escapeHtml(instSec)} #${escapeHtml(inst.Case_ID)}</strong><span class="${badgeClass}">${badgeLabel}</span></div>
        <div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">${statusDetail}</div>
        <div class="tap-history-hint"><span>📜 Tap to view full instrument & repair history</span><span>${instLogs.length} logs ➔</span></div>
      </div>
    `);
  }

  for (const stu of AppState.rosterList) {
    if (isRepairShopEntity(stu)) continue;
    const stuLogs = AppState.scanHistory.filter((l) => Number(l.Line_Number) === Number(stu.Line_Number) && String(l.Student_Name || '').toUpperCase() === stu.Student_Name.toUpperCase());
    const lastLog = stuLogs.length > 0 ? stuLogs[stuLogs.length - 1] : null;
    const currentlyOut = lastLog && lastLog.Action === 'CHECK_OUT';

    let includeStu = false;
    if (isPureStatusOrDateQuery) {
      if (targetDate) includeStu = stuLogs.some((l) => isSameCalendarDay(l.Timestamp, targetDate) && (!statusFilter || (statusFilter === 'OUT' ? l.Action === 'CHECK_OUT' : l.Action === 'CHECK_IN')));
      else if (statusFilter === 'OUT') includeStu = Boolean(currentlyOut);
      else if (statusFilter === 'IN') includeStu = !currentlyOut && stuLogs.length > 0;
    } else {
      const searchQ = textRemainder || q;
      const exactLine = /^\d+$/.test(searchQ) && (Number(stu.Line_Number) === Number(searchQ) || String(stu.Student_ID || '').trim() === searchQ);
      const hay = `${stu.Student_Name} ${stu.Ensemble} ${formatAssignedPairsText(stu)} ${stu.Line_Number} ${stu.Student_ID || ''}`.toLowerCase();
      includeStu = (exactLine || hay.includes(searchQ)) && (!statusFilter || (statusFilter === 'OUT' ? currentlyOut : !currentlyOut));
    }
    if (!includeStu) continue;

    const lastOutLog = [...stuLogs].reverse().find((l) => l.Action === 'CHECK_OUT');
    const lastInLog = [...stuLogs].reverse().find((l) => l.Action === 'CHECK_IN');
    let historySummary = 'Nothing checked out yet this term.';
    if (currentlyOut) {
      const outInstName = resolveLogInstrumentName(lastLog, stu);
      historySummary = `Currently has <strong>${escapeHtml(outInstName)} #${escapeHtml(lastLog.Case_ID)}</strong> checked OUT since ${formatShortDate(lastLog.Timestamp)}`;
    } else if (lastOutLog || lastInLog) {
      const refLog = lastOutLog || lastInLog;
      const refInstName = resolveLogInstrumentName(refLog, stu);
      historySummary = `Nothing currently checked out.<br>Last Instrument: <strong>${escapeHtml(refInstName)} #${escapeHtml(refLog.Case_ID)}</strong><br>Out: ${lastOutLog ? formatShortDate(lastOutLog.Timestamp) : '—'} &nbsp;|&nbsp; In: ${lastInLog ? formatShortDate(lastInLog.Timestamp) : '—'}`;
    }

    cardsHtml.push(`
      <div class="result-card tappable-card" data-hist-type="STU" data-comp="${escapeHtml(stu.composite_id)}">
        <div class="result-card-header"><strong style="font-size:1.05rem;">👤 ${escapeHtml(stu.Student_Name)} (${escapeHtml(stu.Ensemble)} #${stu.Line_Number})</strong><span class="${currentlyOut ? 'badge-out' : 'badge-in'}">${currentlyOut ? 'HAS INSTRUMENT OUT' : 'ALL CHECKED IN'}</span></div>
        <div style="font-size:0.84rem; color:#cbd5e1; line-height:1.4;">Assigned: <strong>${escapeHtml(formatAssignedPairsText(stu))}</strong>${stu.Student_ID ? ' • ID: ' + escapeHtml(stu.Student_ID) : ''}<br>${historySummary}</div>
        <div class="tap-history-hint"><span>📜 Tap to view practice & check-out/in history</span><span>${stuLogs.length} logs ➔</span></div>
      </div>
    `);
  }

  UI.searchResultsContainer.innerHTML = cardsHtml.length > 0 ? cardsHtml.join('') : `<div style="color:var(--text-muted); text-align:center; padding:20px;">No matching students or instruments found.</div>`;
}

function openFullHistoryModal(type, secOrComp, caseId) {
  const modal = document.getElementById('historyModal');
  const titleEl = document.getElementById('histModalTitle');
  const subEl = document.getElementById('histModalSub');
  const statOutEl = document.getElementById('histStatOut');
  const statInEl = document.getElementById('histStatIn');
  const statOtherEl = document.getElementById('histStatOther');
  const listEl = document.getElementById('histTimelineList');

  let matchedLogs = [];
  let stuRef = null;

  if (type === 'STU') {
    stuRef = AppState.rosterList.find((s) => s.composite_id === secOrComp);
    if (!stuRef) return;
    titleEl.textContent = `👤 ${stuRef.Student_Name}`;
    subEl.textContent = `${stuRef.Ensemble} • Line #${stuRef.Line_Number}${stuRef.Student_ID ? ' • ID: ' + stuRef.Student_ID : ''} • Assigned: ${formatAssignedPairsText(stuRef)}`;
    matchedLogs = AppState.scanHistory.filter(
      (l) => Number(l.Line_Number) === Number(stuRef.Line_Number) && String(l.Student_Name || '').toUpperCase() === stuRef.Student_Name.toUpperCase()
    );
  } else {
    const secUp = String(secOrComp || '').toUpperCase();
    const caseUp = String(caseId || '').toUpperCase();
    const instObj = AppState.instrumentsList.find((i) => i.inst_key === `${secUp}|${caseUp}`);
    const authEns = getAuthoritativeInstrumentEnsemble(secOrComp, caseId) || (instObj && instObj.Ensemble) || 'Music';
    titleEl.textContent = `🎺 ${secOrComp} #${caseId}`;
    subEl.textContent = `${authEns} • Assigned: ${instObj ? instObj.Assigned_Student : 'Unassigned'}`;
    matchedLogs = AppState.scanHistory.filter(
      (l) => resolveLogInstrumentName(l, null).toUpperCase() === secUp && String(l.Case_ID || '').toUpperCase() === caseUp
    );
  }

  statOutEl.textContent = matchedLogs.filter((l) => l.Action === 'CHECK_OUT').length;
  statInEl.textContent = matchedLogs.filter((l) => l.Action === 'CHECK_IN').length;
  statOtherEl.textContent = matchedLogs.filter((l) => l.Status_Flag && l.Status_Flag !== 'DIRECT_MATCH').length;

  if (matchedLogs.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">No check-out or check-in history recorded yet this term.</div>`;
    modal.classList.add('open');
    return;
  }

  const reversed = [...matchedLogs].reverse();
  listEl.innerHTML = reversed.map((log) => {
    const isRepair = String(log.Status_Flag || '').includes('REPAIR') || String(log.Ensemble || '').toUpperCase() === 'REPAIR';
    const isOut = log.Action === 'CHECK_OUT';
    const tlClass = isRepair ? 'tl-repair' : isOut ? 'tl-out' : 'tl-in';
    const actionBadge = isRepair
      ? `<strong style="color:#e9d5ff;">🔧 ${escapeHtml(log.Status_Flag)}</strong>`
      : isOut
      ? `<strong style="color:#fdba74;">📤 CHECKED OUT</strong>`
      : `<strong style="color:#6ee7b7;">📥 CHECKED IN</strong>`;

    const instName = resolveLogInstrumentName(log, stuRef);
    const subjectLine = type === 'STU'
      ? `Instrument: <strong>${escapeHtml(instName)} #${escapeHtml(log.Case_ID)}</strong> (${escapeHtml(log.Ensemble || '')})`
      : `Student/Shop: <strong>${escapeHtml(log.Student_Name)}</strong> (${escapeHtml(log.Ensemble || '')} #${log.Line_Number})`;

    let invoiceLinkHtml = '';
    if (isRepair) {
      const repMatch = AppState.repairsHistory.find(
        (r) => String(r.Timestamp) === String(log.Timestamp) && String(r.Case_ID) === String(log.Case_ID)
      );
      if (repMatch && repMatch.Invoice_Drive_Link && repMatch.Invoice_Drive_Link.startsWith('http')) {
        invoiceLinkHtml = `<br><a href="${escapeHtml(repMatch.Invoice_Drive_Link)}" target="_blank" rel="noopener" style="color:#38bdf8; font-weight:800;">📄 View Scanned Invoice in Google Drive ➔</a>`;
      }
    }

    return `
      <div class="timeline-item ${tlClass}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          ${actionBadge}
          <span style="font-size:0.74rem; color:#94a3b8; font-weight:700;">${escapeHtml(formatShortDate(log.Timestamp))}</span>
        </div>
        <div style="margin-top:3px; color:#f8fafc;">${subjectLine}</div>
        ${log.Status_Flag && log.Status_Flag !== 'DIRECT_MATCH' && !isRepair ? `<div style="font-size:0.74rem; color:#fcd34d;">Flag: ${escapeHtml(log.Status_Flag)}</div>` : ''}
        ${log.Volunteer_Note ? `<div style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">Note: <em>${escapeHtml(log.Volunteer_Note)}</em></div>` : ''}
        ${invoiceLinkHtml}
        ${log.Scanned_By ? `<div style="font-size:0.68rem; color:#64748b; margin-top:2px;">Logged by: ${escapeHtml(log.Scanned_By)}</div>` : ''}
      </div>
    `;
  }).join('');

  modal.classList.add('open');
}

function formatShortDate(tsStr) {
  try {
    const d = new Date(tsStr);
    return isNaN(d.getTime()) ? tsStr : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (_) { return tsStr; }
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
      const itemSec = getSec(item);
      let isMatch = false;
      if (exactNumMatch) {
        const textPart = exactNumMatch[1].trim(), numPart = exactNumMatch[2].trim();
        if (isStudentMode) isMatch = `${item.Ensemble} ${item.Student_Name} ${itemSec}`.toLowerCase().includes(textPart) && (String(item.Line_Number).toLowerCase() === numPart || String(item.Assigned_Case_ID).toLowerCase() === numPart);
        else isMatch = `${itemSec} ${item.Ensemble} ${item.Brand || ''}`.toLowerCase().includes(textPart) && String(item.Case_ID).toLowerCase() === numPart;
      } else {
        const hay = isStudentMode
          ? `${item.Student_Name} ${item.Ensemble} ${itemSec} ${item.Line_Number} ${item.Student_ID || ''}`.toLowerCase()
          : `${itemSec} ${item.Case_ID} ${item.Ensemble} ${item.Assigned_Student || ''} ${item.Brand || ''} ${item.Model || ''} ${item.Serial || ''}`.toLowerCase();
        isMatch = hay.includes(token);
      }
      if (isMatch) { seenKeys.add(uniqueId); matchedResults.push(item); }
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
  const returnLines = Array.isArray(AppState.returnLines) && AppState.returnLines.length > 0 ? AppState.returnLines : ['If found, return to Music Room'];
  const logoPos = (AppState.logoPosition || 'LEFT').toUpperCase();
  const logoPx = Number(AppState.logoSizePx) || 48;
  const defaultQrPx = tpl === '97184' ? 132 : 104;
  const qrPx = Number(AppState.qrSizePx) > 40 ? Number(AppState.qrSizePx) : defaultQrPx;
  const textAlign = normalizeAlign(AppState.textAlignment);
  const footerAlign = normalizeAlign(AppState.footerAlignment);

  localStorage.setItem(STORAGE_KEYS.AVERY_TEMPLATE, tpl);
  const labelItems = [];
  for (let s = 0; s < emptySkipCount; s++) labelItems.push({ emptySlot: true });

  if (mode === 'SINGLE_INST') {
    const sec = UI.qrInputPrimary.value.trim() || 'Trumpet';
    const num = UI.qrInputSecondary.value.trim() || '1';
    const existing = AppState.instrumentsList.find((i) => i.inst_key === `${sec.toUpperCase()}|${num.toUpperCase()}`);
    const manualSpecs = formatInstSpecs({
      Brand: (UI.qrInputBrand && UI.qrInputBrand.value.trim()) || (existing && existing.Brand) || '',
      Model: (UI.qrInputModel && UI.qrInputModel.value.trim()) || (existing && existing.Model) || '',
      Serial: (UI.qrInputSerial && UI.qrInputSerial.value.trim()) || (existing && existing.Serial) || ''
    });
    labelItems.push({ payload: `INST|${sec}|${num}`, mainTitle: `${sec.toUpperCase()} #${num}`, subTitle: manualSpecs });
  } else if (mode === 'SINGLE_STU') {
    const name = UI.qrInputPrimary.value.trim() || 'Student', line = UI.qrInputSecondary.value.trim() || '1';
    const ens = ensFilter === 'ALL' ? 'Band' : ensFilter;
    labelItems.push({ payload: `STU|${ens}|${line}`, mainTitle: `${ens.toUpperCase()} #${line}`, subTitle: name });
  } else if (mode === 'REPAIR_SHOP_QR') {
    labelItems.push({ payload: 'SHOP|900|Repair Shop', mainTitle: 'REPAIR SHOP #900', subTitle: '' });
  } else if (mode === 'FLAGGED_BAD_QR') {
    const flaggedSet = new Set();
    for (const log of AppState.scanHistory) {
      const key = `${resolveLogInstrumentName(log, null).toUpperCase()}|${String(log.Case_ID || '').toUpperCase()}`;
      if (String(log.Volunteer_Note || '').includes('[NEEDS QR TAG]')) flaggedSet.add(key);
      else if (flaggedSet.has(key)) flaggedSet.delete(key);
    }
    for (const key of flaggedSet) {
      const [sec, num] = key.split('|');
      const matchedInst = AppState.instrumentsList.find((i) => i.inst_key === key);
      labelItems.push({ payload: `INST|${matchedInst ? getSec(matchedInst) : sec}|${matchedInst ? matchedInst.Case_ID : num}`, mainTitle: `${sec} #${num}`, subTitle: formatInstSpecs(matchedInst) });
    }
  } else if (mode === 'BATCH_MASTER_INST' || mode === 'BATCH_ROSTER_INST') {
    const hasAnyMasterRows = AppState.instrumentsList.some((i) => i.in_master_tab);
    let list = AppState.instrumentsList.filter((i) => {
      const authEns = getAuthoritativeInstrumentEnsemble(getSec(i), i.Case_ID) || i.Ensemble;
      const ensOk = ensFilter === 'ALL' || !authEns || authEns.toUpperCase() === ensFilter.toUpperCase();
      return ensOk && (mode === 'BATCH_MASTER_INST' ? (hasAnyMasterRows ? i.in_master_tab : true) : i.in_roster);
    });
    list = filterByCustomKeywords(list, customQuery, false);
    for (const inst of list) {
      const instSec = getSec(inst);
      labelItems.push({ payload: `INST|${instSec}|${inst.Case_ID}`, mainTitle: `${instSec.toUpperCase()} #${inst.Case_ID}`, subTitle: formatInstSpecs(inst) });
    }
  } else if (mode === 'BATCH_STU') {
    let list = AppState.rosterList.filter((s) => !isRepairShopEntity(s) && (ensFilter === 'ALL' || s.Ensemble.toUpperCase() === ensFilter.toUpperCase()));
    list = filterByCustomKeywords(list, customQuery, true);
    for (const stu of list) labelItems.push({ payload: `STU|${stu.Ensemble}|${stu.Line_Number}`, mainTitle: `${stu.Ensemble.toUpperCase()} #${stu.Line_Number}`, subTitle: stu.Student_Name });
  } else if (mode === 'RETURN_ONLY') {
    for (let i = 0; i < labelsPerPage - emptySkipCount; i++) labelItems.push({ returnStickerOnly: true });
  }

  UI.qrPreviewGrid.innerHTML = '';
  if (labelItems.filter((x) => !x.emptySlot).length === 0) {
    UI.qrPreviewGrid.innerHTML = `<div style="color:var(--text-muted); padding:24px; text-align:center;">No matching tags found for that filter.</div>`;
    return;
  }

  const returnLinesHtml = returnLines.map((line) => `<div class="tag-return-text" style="text-align:${textAlign};">${escapeHtml(line)}</div>`).join('');

  for (let i = 0; i < labelItems.length; i += labelsPerPage) {
    const pageSlice = labelItems.slice(i, i + labelsPerPage);
    const pageEl = document.createElement('div');
    pageEl.className = `avery-page tpl-${tpl}`;

    for (const item of pageSlice) {
      const cell = document.createElement('div');
      cell.className = 'avery-label-cell';
      if (item.emptySlot) { cell.style.borderColor = 'transparent'; pageEl.appendChild(cell); continue; }

      const inner = document.createElement('div');
      inner.className = 'tag-inner-card';
      const headerBand = document.createElement('div');
      headerBand.className = 'tag-header-band';

      if (AppState.schoolLogoDataUrl && logoPos !== 'QR_CENTER' && logoPos !== 'NONE') {
        headerBand.style.flexDirection = logoPos === 'TOP' ? 'column' : logoPos === 'RIGHT' ? 'row-reverse' : 'row';
        const logoImg = document.createElement('img');
        logoImg.className = 'tag-logo-img';
        logoImg.src = AppState.schoolLogoDataUrl;
        logoImg.style.cssText = `height:${logoPx}px; max-height:${logoPx}px; width:auto; max-width:${Math.round(logoPx * 1.8)}px; object-fit:contain; flex-shrink:0;`;
        headerBand.appendChild(logoImg);
      }

      const schoolBlock = document.createElement('div');
      schoolBlock.className = 'tag-school-block';
      schoolBlock.style.textAlign = textAlign;
      schoolBlock.innerHTML = `<div class="tag-school-name" style="text-align:${textAlign};">${escapeHtml(schoolHeader)}</div>${returnLinesHtml}`;
      headerBand.appendChild(schoolBlock);
      inner.appendChild(headerBand);

      if (item.returnStickerOnly) {
        const centerNotice = document.createElement('div');
        centerNotice.style.cssText = `padding:8px 4px; width:100%; text-align:${textAlign};`;
        centerNotice.innerHTML = `<div style="font-size:11pt; font-weight:900; margin-bottom:4px; text-align:${textAlign};">SCHOOL PROPERTY</div>${returnLinesHtml}`;
        inner.appendChild(centerNotice);
        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.style.textAlign = footerAlign;
        footerBand.innerHTML = `<div class="tag-sub-id" style="text-align:${footerAlign};">DO NOT REMOVE TAG FROM CASE</div>`;
        inner.appendChild(footerBand);
      } else {
        const qrWrap = document.createElement('div');
        qrWrap.className = 'tag-qr-wrap';
        qrWrap.style.position = 'relative';
        const canvas = document.createElement('canvas');
        new QRious({ element: canvas, value: item.payload, size: qrPx, level: 'H' });
        qrWrap.appendChild(canvas);

        if (AppState.schoolLogoDataUrl && logoPos === 'QR_CENTER') {
          const centerLogo = document.createElement('img');
          centerLogo.src = AppState.schoolLogoDataUrl;
          centerLogo.style.cssText = `position:absolute; height:${logoPx}px; max-height:${logoPx}px; width:auto; max-width:${Math.round(logoPx * 1.5)}px; object-fit:contain; background:#fff; padding:2px; border-radius:4px; border:1px solid #000;`;
          qrWrap.appendChild(centerLogo);
        }
        inner.appendChild(qrWrap);

        const footerBand = document.createElement('div');
        footerBand.className = 'tag-footer-band';
        footerBand.style.textAlign = footerAlign;
        footerBand.innerHTML = `<div class="tag-main-id" style="text-align:${footerAlign};">${escapeHtml(item.mainTitle)}</div>${item.subTitle ? `<div class="tag-sub-id" style="text-align:${footerAlign};">${escapeHtml(item.subTitle)}</div>` : ''}`;
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
  const ctx = AppState.audioCtx, now = ctx.currentTime;
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
      stopSearchScanMode(false);
      UI.navTabs.forEach((t) => t.classList.remove('active'));
      UI.views.forEach((v) => v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.view).classList.add('active');
      if (tab.dataset.view === 'viewSearch') runStatusSearch(UI.searchInput.value);
      else if (tab.dataset.view === 'viewQr') renderLabelSheets();
    });
  });

  // Search Tab "📷 Scan QR / ID" Button & Cancel Banner
  const btnScanInSearch = document.getElementById('btnScanInSearch');
  if (btnScanInSearch) btnScanInSearch.addEventListener('click', startSearchScanMode);
  const btnCancelSearchScan = document.getElementById('btnCancelSearchScan');
  if (btnCancelSearchScan) btnCancelSearchScan.addEventListener('click', () => stopSearchScanMode(true));

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

  document.getElementById('txLineInput').addEventListener('input', handleTxModalLineLookup);
  document.getElementById('txEnsembleSelect').addEventListener('change', handleTxModalLineLookup);
  document.getElementById('btnTxConfirm').addEventListener('click', executeConfirmedTransaction);
  document.getElementById('btnTxCancel').addEventListener('click', () => {
    document.getElementById('txModal').classList.remove('open');
    AppState.pendingTx = null;
  });

  const addUnlistedBtn = document.getElementById('btnAddUnlistedStu');
  if (addUnlistedBtn) {
    addUnlistedBtn.addEventListener('click', () => openUnlistedLineModal(parseInt(AppState.currentInput, 10) || 1, null));
  }
  document.getElementById('btnUnlistedTypo').addEventListener('click', () => {
    document.getElementById('unlistedModal').classList.remove('open');
    resetScannerState();
  });
  document.getElementById('btnSaveNewStudent').addEventListener('click', handleSaveNewStudentFromModal);

  UI.searchResultsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.tappable-card');
    if (!card) return;
    const type = card.dataset.histType;
    if (type === 'STU') openFullHistoryModal('STU', card.dataset.comp, '');
    else if (type === 'INST') openFullHistoryModal('INST', card.dataset.sec, card.dataset.case);
  });
  document.getElementById('btnCloseHistory').addEventListener('click', () => {
    document.getElementById('historyModal').classList.remove('open');
  });

  UI.btnManualCase.addEventListener('click', openManualCaseModal);
  UI.btnCancelManual.addEventListener('click', () => UI.manualCaseModal.classList.remove('open'));
  UI.btnQuickConfirmAssigned.addEventListener('click', async () => {
    const pairs = getStudentAssignedPairs(AppState.activeStudent);
    if (pairs.length === 0) return;
    UI.manualCaseModal.classList.remove('open');
    await handleInstrumentScanFlow(pairs[0].section, pairs[0].caseId, '[NEEDS QR TAG] Manual Entry - Damaged/Missing QR');
  });
  UI.btnSubmitManual.addEventListener('click', async () => {
    const sec = UI.manualSectionInput.value.trim(), num = UI.manualCaseNumInput.value.trim();
    if (!sec || !num) return alert('Please enter both Instrument Section and Case #.');
    UI.manualCaseModal.classList.remove('open');
    await handleInstrumentScanFlow(sec, num, UI.chkFlagBadQr.checked ? '[NEEDS QR TAG] Manual Entry - Damaged/Missing QR' : 'Manual Entry');
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
