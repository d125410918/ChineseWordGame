export class RecordList {
  constructor(root) {
    this.root = root;
    this.records = [];
    this.deleteMode = false;
    this.onPlay = null;
    this.onToggleDelete = null;
  }

  setDeleteMode(enabled) {
    this.deleteMode = enabled;
    this.render();
  }

  setRecords(records) {
    this.records = records;
    this.render();
  }

  setHandlers({ onPlay, onToggleDelete }) {
    this.onPlay = onPlay;
    this.onToggleDelete = onToggleDelete;
  }

  render() {
    this.root.innerHTML = '';

    if (this.records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-records';
      empty.textContent = '目前沒有錄音';
      this.root.appendChild(empty);
      return;
    }

    this.records.forEach((record, index) => {
      const item = document.createElement('article');
      item.className = `record-item${record.pendingDelete ? ' pending-delete' : ''}`;
      item.innerHTML = `
        <span class="record-index">${index + 1}</span>
        <button class="play-button" type="button" aria-label="播放第 ${index + 1} 個錄音">▶</button>
        <div class="record-meta">
          <strong>${record.fileName}</strong>
          <span>${new Date(record.createdAt).toLocaleString('zh-TW')}</span>
        </div>
      `;

      item.querySelector('.play-button').addEventListener('click', event => {
        event.stopPropagation();
        this.onPlay?.(record);
      });

      if (this.deleteMode) {
        item.addEventListener('click', () => {
          record.pendingDelete = !record.pendingDelete;
          this.onToggleDelete?.(record);
          this.render();
        });
      }

      this.root.appendChild(item);
    });
  }
}
