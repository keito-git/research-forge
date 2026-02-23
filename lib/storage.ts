const DB_NAME = 'research-forge';
const DB_VERSION = 1;
const STORES = ['savedTools', 'communityTools', 'chatHistory'] as const;
type StoreName = (typeof STORES)[number];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function put<T>(store: StoreName, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putAll<T>(store: StoreName, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const item of items) os.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clear(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Migrate from localStorage to IndexedDB (one-time)
export async function migrateFromLocalStorage(): Promise<void> {
  const MIGRATED_KEY = 'research-forge-idb-migrated';
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATED_KEY)) return;

  try {
    const savedToolsRaw = localStorage.getItem('research-forge-saved-tools');
    if (savedToolsRaw) {
      const items = JSON.parse(savedToolsRaw);
      if (Array.isArray(items) && items.length > 0) {
        await putAll('savedTools', items);
      }
    }

    const communityRaw = localStorage.getItem('research-forge-community');
    if (communityRaw) {
      const items = JSON.parse(communityRaw);
      if (Array.isArray(items) && items.length > 0) {
        await putAll('communityTools', items);
      }
    }

    const chatRaw = localStorage.getItem('research-forge-chat');
    if (chatRaw) {
      const msgs = JSON.parse(chatRaw);
      if (Array.isArray(msgs) && msgs.length > 0) {
        await put('chatHistory', { id: 'current', messages: msgs });
      }
    }

    localStorage.setItem(MIGRATED_KEY, '1');
  } catch (e) {
    console.warn('Migration from localStorage failed:', e);
  }
}
