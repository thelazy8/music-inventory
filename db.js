/**
 * db.js - Local-First IndexedDB Wrapper
 * Supports composite keys for overlapping Band/Orchestra Line Numbers and Section Case IDs.
 */

const DB_NAME = 'MSMusicInventoryDB_v2';
const DB_VERSION = 1;
const STORE_ROSTER = 'roster';
const STORE_INSTRUMENTS = 'instruments';
const STORE_HISTORY = 'scan_history';
const STORE_QUEUE = 'sync_queue';

window.TrackerDB = {
  dbInstance: null,

  async init() {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Composite key: "BAND|1", "ORCHESTRA|1"
        if (!db.objectStoreNames.contains(STORE_ROSTER)) {
          db.createObjectStore(STORE_ROSTER, { keyPath: 'composite_id' });
        }
        // Composite key: "TRUMPET|1", "VIOLIN|1"
        if (!db.objectStoreNames.contains(STORE_INSTRUMENTS)) {
          db.createObjectStore(STORE_INSTRUMENTS, { keyPath: 'inst_key' });
        }
        // Historical logs from Google Sheet
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: 'hist_id', autoIncrement: true });
        }
        // Outbound offline queue
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

  async saveServerBundle({ roster = [], instruments = [], logs = [] }) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_ROSTER, STORE_INSTRUMENTS, STORE_HISTORY], 'readwrite');
      const rosterStore = tx.objectStore(STORE_ROSTER);
      const instStore = tx.objectStore(STORE_INSTRUMENTS);
      const histStore = tx.objectStore(STORE_HISTORY);

      rosterStore.clear();
      instStore.clear();
      histStore.clear();

      const seenInstruments = new Set();

      // 1. Save Roster & Auto-Derive Instruments from Roster
      for (const raw of roster) {
        const lineNum = parseInt(raw.Line_Number, 10);
        if (isNaN(lineNum)) continue;
        const ensemble = String(raw.Ensemble || 'Band').trim();
        const section = String(raw.Section || '').trim();
        const caseId = String(raw.Assigned_Case_ID || '').trim();
        const studentId = String(raw.Student_ID || '').trim();
        const compositeId = `${ensemble.toUpperCase()}|${lineNum}`;

        rosterStore.put({
          composite_id: compositeId,
          Line_Number: lineNum,
          Student_Name: String(raw.Student_Name || '').trim(),
          Ensemble: ensemble,
          Section: section,
          Assigned_Case_ID: caseId,
          Student_ID: studentId
        });

        if (section && caseId) {
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

      // 2. Merge any extra Spare/Loaner Instruments from the Instruments Tab
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

      // 3. Save Scan_Log History for 0ms Status Queries
      for (const log of logs) {
        histStore.add(log);
      }

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