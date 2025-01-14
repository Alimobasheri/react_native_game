import { SharedValue } from 'react-native-reanimated';

export interface IGameState {
  isRunning: SharedValue<boolean>;
  isGameOver: SharedValue<boolean>;
  isPaused: SharedValue<boolean>;
  isGamePlayExited: SharedValue<boolean>;
  isHomeScene: SharedValue<boolean>;
}

export interface IVanillaGameState {
  isRunning: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  isGamePlayExited: boolean;
  isHomeScene: boolean;
}

export class State {
  _isRunning: SharedValue<boolean>;
  _isGameOver: SharedValue<boolean>;
  _isPaused: SharedValue<boolean>;
  _isGamePlayExited: SharedValue<boolean>;
  _isHomeScene: SharedValue<boolean>;

  constructor(initialState: IGameState) {
    this._isRunning = initialState.isRunning;
    this._isGameOver = initialState.isGameOver;
    this._isPaused = initialState.isPaused;
    this._isGamePlayExited = initialState.isGamePlayExited;
    this._isHomeScene = initialState.isHomeScene;
  }

  get state(): IVanillaGameState {
    return {
      isRunning: this._isRunning.value,
      isGameOver: this._isGameOver.value,
      isPaused: this._isPaused.value,
      isGamePlayExited: this._isGamePlayExited.value,
      isHomeScene: this._isHomeScene.value,
    };
  }

  set state(value: IVanillaGameState) {
    this._isRunning.value = value.isRunning;
    this._isGameOver.value = value.isGameOver;
    this._isPaused.value = value.isPaused;
    this._isGamePlayExited.value = value.isGamePlayExited;
    this._isHomeScene.value = value.isHomeScene;
  }
}
