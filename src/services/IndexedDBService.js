export class IndexedDBService {
  constructor() {
    this.dbName = 'ChineseWordGameDB';
    this.version = 1;
    this.db = null;
  }

  async initialize() {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('recordings')) {
          const store = db.createObjectStore('recordings', {
            keyPath: 'id'
          });
          store.createIndex('speakerPhonetic', ['speakerId', 'phonetic'], { unique: false });
        }

        if (!db.objectStoreNames.contains('speakers')) {
          db.createObjectStore('speakers', {
            keyPath: 'id'
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.db;
  }

  async put(storeName, value) {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordingsBySpeakerAndPhonetic(speakerId, phonetic) {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('recordings', 'readonly');
      const store = transaction.objectStore('recordings');
      const index = store.index('speakerPhonetic');
      const request = index.getAll([speakerId, phonetic]);

      request.onsuccess = () => resolve(request.result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async ensureDb() {
    if (this.db) return this.db;
    return this.initialize();
  }
}
