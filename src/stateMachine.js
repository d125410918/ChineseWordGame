export class StateMachine {
  constructor(initialState) {
    this.currentState = initialState;
    this.states = new Map();
  }

  register(name, state) {
    this.states.set(name, state);
  }

  change(name, payload = null) {
    if (this.currentState && this.states.has(this.currentState)) {
      this.states.get(this.currentState).exit?.();
    }

    this.currentState = name;

    if (this.states.has(name)) {
      this.states.get(name).enter?.(payload);
    }
  }

  update(deltaTime) {
    const state = this.states.get(this.currentState);
    state?.update?.(deltaTime);
  }
}
