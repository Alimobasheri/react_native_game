import { ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { GAME_STATE, IGameLoopSystem } from "./types";
import { MountainBackground } from "@/Game/Entities/MountainBackground/MountainBackground";

export class GameLoopSystem implements IGameLoopSystem {
  protected _currentFrame: number;
  protected _gameState: GAME_STATE;

  constructor(gameState: GAME_STATE) {
    this._gameState = gameState;
    this._currentFrame = 0;
  }

  public get currentFrame(): number {
    return this._currentFrame;
  }

  public get gameState(): GAME_STATE {
    return this._gameState;
  }

  public systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    this.update(entities, args);
    return entities;
  }

  public systemManager(entities: RNGE_Entities, args: RNGE_System_Args) {
    const gameLoopSystem: GameLoopSystem =
      entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    return gameLoopSystem.systemInstance(entities, args);
  }

  protected update(entities: RNGE_Entities, args: RNGE_System_Args) {
    this._currentFrame = this._currentFrame + args.time.delta / 16;
    this._checkStateEvents(args);
  }

  protected _checkStateEvents(args: RNGE_System_Args): void {
    const events = args.events;
    events.forEach((event) => {
      if (event === "shipSinked") {
        this._gameState = GAME_STATE.GAME_OVER;
        args.dispatch("gameOver");
      } else if (event === "startGame") {
        this._gameState = GAME_STATE.RUNNING;
      } else if (event === "startPreview") {
        this._gameState = GAME_STATE.PREVIEW;
      }
    });
  }
}
