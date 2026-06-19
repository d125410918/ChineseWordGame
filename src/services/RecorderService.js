export class RecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
    this.stopPromise = null;
    this.stopResolver = null;
  }

  async initialize() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('此瀏覽器不支援麥克風錄音');
    }

    if (this.stream) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  }

  start() {
    if (!this.stream) {
      throw new Error('麥克風尚未初始化');
    }

    if (this.mediaRecorder?.state === 'recording') {
      throw new Error('目前已經在錄音中');
    }

    this.audioChunks = [];
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.stopPromise = new Promise((resolve, reject) => {
      this.stopResolver = resolve;

      this.mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = event => {
        reject(event.error || new Error('錄音發生錯誤'));
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, {
          type: this.mediaRecorder.mimeType || mimeType || 'audio/webm'
        });

        resolve(blob);
      };
    });

    this.mediaRecorder.start(250);
  }

  async stop() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      throw new Error('目前沒有正在進行的錄音');
    }

    this.mediaRecorder.requestData();
    this.mediaRecorder.stop();

    const blob = await this.stopPromise;

    if (!blob || blob.size === 0) {
      throw new Error('錄音檔沒有內容，請確認麥克風是否有收到聲音');
    }

    return blob;
  }

  getSupportedMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4'
    ];

    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }
}
