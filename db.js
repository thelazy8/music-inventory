/**
 * db.js - Local-First IndexedDB Wrapper (v3 with Repairs Store)
 */

const DB_NAME = 'MSMusicInventoryDB_v3';
const DB_VERSION = 1;
const STORE_ROSTER = 'roster';
const STORE_INSTRUMENTS = 'instruments';
const STORE_HISTORY = 'scan_history';
const STORE_REPAIRS = 'repairs_history';
const STORE_QUEUE = 'sync_queue';

window.TrackerDB = {
  dbInstance: null,

  async init() {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_ROSTER)) {
          db.createObjectStore(STORE_ROSTER, { keyPath: 'composite_id' });
        }
        if (!db.objectStoreNames.contains(STORE_INSTRUMENTS)) {
          db.createObjectStore(STORE_INSTRUMENTS, { keyPath: 'inst_key' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: 'hist_id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_REPAIRS)) {
          db.createObjectStore(STORE_REPAIRS, { keyPath: 'rep_id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'local_id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        this.dbInstance = event.target.result;
        resolve(this.dbInstance);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  },

  async saveServerBundle({ roster = [], instruments = [], logs = [], repairs = [] }) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORE_ROSTER, STORE_INSTRUMENTS, STORE_HISTORY, STORE_REPAIRS],
        'readwrite'
      );
      const rosterStore = tx.objectStore(STORE_ROSTER);
      const instStore = tx.objectStore(STORE_INSTRUMENTS);
      const histStore = tx.objectStore(STORE_HISTORY);
      const repStore = tx.objectStore(STORE_REPAIRS);

      rosterStore.clear();
      instStore.clear();
      histStore.clear();
      repStore.clear();

      const seenInstruments = new Set();
      let hasRepairShop = false;

      for (const raw of roster) {
        const lineNum = parseInt(raw.Line_Number, 10);
        if (isNaN(lineNum)) continue;
        const ensemble = String(raw.Ensemble || 'Band').trim();
        const section = String(raw.Section || '').trim();
        const caseId = String(raw.Assigned_Case_ID || '').trim();
        const studentId = String(raw.Student_ID || '').trim();
        const compositeId = `${ensemble.toUpperCase()}|${lineNum}`;

        if (ensemble.toUpperCase() === 'REPAIR' || lineNum === 900) {
          hasRepairShop = true;
        }

        rosterStore.put({
          composite_id: compositeId,
          Line_Number: lineNum,
          Student_Name: String(raw.Student_Name || '').trim(),
          Ensemble: ensemble,
          Section: section,
          Assigned_Case_ID: caseId,
          Student_ID: studentId
        });

        if (section && caseId && ensemble.toUpperCase() !== 'REPAIR') {
          const instKey = `${section.toUpperCase()}|${caseId.toUpperCase()}`;
          seenInstruments.add(instKey);
          instStore.put({
            inst_key: instKey,
            Ensemble: ensemble,
            Section: section,
            Case_ID: caseId,
            Assigned_Student: String(raw.Student_Name || '').trim(),
            Assigned_Line: lineNum
          });
        }
      }

      // Auto-seed default Line #900 Repair Shop if not explicitly in Roster
      if (!hasRepairShop) {
        rosterStore.put({
          composite_id: 'REPAIR|900',
          Line_Number: 900,
          Student_Name: '🔧 Repair Shop',
          Ensemble: 'Repair',
          Section: 'Repair Vendor',
          Assigned_Case_ID: 'ANY',
          Student_ID: 'SHOP900'
        });
      }

      for (const rawInst of instruments) {
        const section = String(rawInst.Section || '').trim();
        const caseId = String(rawInst.Case_ID || '').trim();
        if (!section || !caseId) continue;
        const instKey = `${section.toUpperCase()}|${caseId.toUpperCase()}`;
        if (!seenInstruments.has(instKey)) {
          instStore.put({
            inst_key: instKey,
            Ensemble: String(rawInst.Ensemble || '').trim(),
            Section: section,
            Case_ID: caseId,
            Assigned_Student: 'Unassigned / Spare',
            Assigned_Line: null
          });
        }
      }

      for (const log of logs) histStore.add(log);
      for (const rep of repairs) repStore.add(rep);

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllStore(storeName) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async enqueueItem(payload) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const req = tx.objectStore(STORE_QUEUE).add(payload);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async updateQueuedNote(localId, noteText) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const getReq = store.get(localId);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) return resolve(false);
        record.Volunteer_Note = noteText;
        store.put(record);
        resolve(true);
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  },

  async removeQueueItem(localId) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const req = tx.objectStore(STORE_QUEUE).delete(localId);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }
};
