// Stockage des relevés de température (IndexedDB), conservés 5 ans glissants.
const DB = (() => {
  const DB_NAME = "cyclamens-db";
  const STORE = "readings";
  const RETENTION_MS = 5 * 365 * 24 * 60 * 60 * 1000;

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function isoDate(ts) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function addReading(temperature) {
    const db = await open();
    const timestamp = Date.now();
    const record = { timestamp, date: isoDate(timestamp), temperature };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await pruneOld(db);
    return record;
  }

  async function pruneOld(db) {
    const cutoff = Date.now() - RETENTION_MS;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(cutoff);
      index.openCursor(range).onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).index("timestamp").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return { addReading, getAll };
})();
