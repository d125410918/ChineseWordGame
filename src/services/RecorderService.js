export class RecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async initialize() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    this.mediaRecorder = new MediaRecorder(stream);
  }

  start() {
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = event => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.start();
  }

  stop() {
    return new Promise(resolve => {
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.audioChunks, {
          type: 'audio/webm'
        }));
      };

      this.mediaRecorder.stop();
    });
  }
}
