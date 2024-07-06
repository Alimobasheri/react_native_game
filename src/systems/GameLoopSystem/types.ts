import { IGameSystem } from "../types";

export enum GAME_STATE {
  PREVIEW = "preview",
  RUNNING = "running",
  GAME_OVER = "game_over",
}

export interface IGameLoopSystem extends IGameSystem {
  /**
   * Current Frame number in game loop, update in each frame.
   */
  get currentFrame(): number;
}
