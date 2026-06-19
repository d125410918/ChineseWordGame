export class DeleteModeState {
  constructor(context) {
    this.context = context;
  }

  enter() {
    this.context.deleteHint.hidden = false;
  }

  update() {}

  exit() {
    this.context.deleteHint.hidden = true;
  }
}
