export interface IGameState {
  isRunning: boolean;
  isGameOver: boolean;
  isPaused: boolean;
}

export class State {
  private _isRunning: boolean;
  private _isGameOver: boolean;
  private _isPaused: boolean;

  constructor(initialState: IGameState) {
    this._isRunning = initialState.isRunning;
    this._isGameOver = initialState.isGameOver;
    this._isPaused = initialState.isPaused;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  set isRunning(value: boolean) {
    if (this._isRunning !== value) {
      this._isRunning = value;
    }
  }

  get isGameOver(): boolean {
    return this._isGameOver;
  }

  set isGameOver(value: boolean) {
    if (this._isGameOver !== value) {
      this._isGameOver = value;
    }
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  set isPaused(value: boolean) {
    if (this._isPaused !== value) {
      this._isPaused = value;
    }
  }
}
