import { GameConfigParams, IGameConfig } from "./types";

export class GameConfig implements IGameConfig {
  protected _windowWidth: number;
  protected _windowHeight: number;

  constructor(params: GameConfigParams) {
    this._windowWidth = params.windowWidth;
    this._windowHeight = params.windowHeight;
  }

  get windowWidth(): number {
    return this._windowWidth;
  }
  get windowHeight(): number {
    return this._windowHeight;
  }
}
