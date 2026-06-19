export class RecordingState {
  constructor(context) {
    this.context = context;
  }

  enter() {
    this.context.stateLabel.textContent = '狀態：錄音中';
  }

  update() {}

  exit() {}
}
