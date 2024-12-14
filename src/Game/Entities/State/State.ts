export interface IGameState {
  isRunning: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  isGamePlayExited: boolean;
  isHomeScene: boolean;
}

export class State {
  private _isRunning: boolean;
  private _isGameOver: boolean;
  private _isPaused: boolean;
  private _isGamePlayExited: boolean;
  private _isHomeScene: boolean;

  constructor(initialState: IGameState) {
    this._isRunning = initialState.isRunning;
    this._isGameOver = initialState.isGameOver;
    this._isPaused = initialState.isPaused;
    this._isGamePlayExited = initialState.isGamePlayExited;
    this._isHomeScene = initialState.isHomeScene;
  }

  get state(): IGameState {
    return {
      isRunning: this._isRunning,
      isGameOver: this._isGameOver,
      isPaused: this._isPaused,
      isGamePlayExited: this._isGamePlayExited,
      isHomeScene: this._isHomeScene,
    };
  }

  set state(value: IGameState) {
    this._isRunning = value.isRunning;
    this._isGameOver = value.isGameOver;
    this._isPaused = value.isPaused;
    this._isGamePlayExited = value.isGamePlayExited;
    this._isHomeScene = value.isHomeScene;
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

  get isGamePlayExited(): boolean {
    return this._isGamePlayExited;
  }

  set isGamePlayExited(value: boolean) {
    if (this._isGamePlayExited !== value) {
      this._isGamePlayExited = value;
    }
  }

  get isHomeScene(): boolean {
    return this._isHomeScene;
  }

  set isHomeScene(value: boolean) {
    if (this._isHomeScene !== value) {
      this._isHomeScene = value;
    }
  }
}
