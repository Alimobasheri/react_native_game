import { IGameSystem } from "../types";

export interface IGameLoopSystem extends IGameSystem {
  /**
   * Current Frame number in game loop, update in each frame.
   */
  get currentFrame(): number;
}
