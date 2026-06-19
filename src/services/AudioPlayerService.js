export class AudioPlayerService {
  constructor() {
    this.currentAudio = null;
    this.currentUrl = null;
  }

  playBlob(blob) {
    this.stop();

    this.currentUrl = URL.createObjectURL(blob);
    this.currentAudio = new Audio(this.currentUrl);

    return this.currentAudio.play();
  }

  async playQueue(records) {
    for (const record of records) {
      if (!record.blob) continue;
      await this.playBlob(record.blob);
      await this.waitForEnd();
    }
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }

  waitForEnd() {
    return new Promise(resolve => {
      if (!this.currentAudio) {
        resolve();
        return;
      }

      this.currentAudio.onended = resolve;
      this.currentAudio.onerror = resolve;
    });
  }
}
