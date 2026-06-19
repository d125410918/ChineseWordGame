export class RecordList {
  constructor(root) {
    this.root = root;
    this.records = [];
    this.deleteMode = false;
  }

  setDeleteMode(enabled) {
    this.deleteMode = enabled;
    this.render();
  }

  setRecords(records) {
    this.records = records;
    this.render();
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
        <button class="play-button" type="button">▶</button>
        <div class="record-meta">
          <strong>${record.fileName}</strong>
          <span>${new Date(record.createdAt).toLocaleString('zh-TW')}</span>
        </div>
      `;

      if (this.deleteMode) {
        item.addEventListener('click', () => {
          record.pendingDelete = !record.pendingDelete;
          this.render();
        });
      }

      this.root.appendChild(item);
    });
  }
}
