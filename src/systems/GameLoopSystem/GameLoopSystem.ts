import { ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { IGameLoopSystem } from "./types";

export class GameLoopSystem implements IGameLoopSystem {
  protected _currentFrame: number;
  constructor() {
    this._currentFrame = 0;
  }

  public get currentFrame(): number {
    return this._currentFrame;
  }

  public systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    this.update();
    return entities;
  }

  public systemManger(entities: RNGE_Entities, args: RNGE_System_Args) {
    const gameLoopSystem: GameLoopSystem =
      entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    return gameLoopSystem.systemInstance(entities, args);
  }

  protected update() {
    this._currentFrame++;
  }
}
