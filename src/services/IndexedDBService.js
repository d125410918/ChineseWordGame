export class IndexedDBService {
  constructor() {
    this.dbName = 'ChineseWordGameDB';
    this.version = 1;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', {
            keyPath: 'id'
          });
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
  }
}
