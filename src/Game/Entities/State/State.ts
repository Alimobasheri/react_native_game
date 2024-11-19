export interface IGameState {
  isRunning: boolean;
}

export class State {
  private _isRunning: boolean;
  constructor(isRunning: boolean) {
    this._isRunning = isRunning;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  set isRunning(value: boolean) {
    if (this._isRunning !== value) {
      this._isRunning = value;
    }
  }
}
