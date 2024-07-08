import { DIRECTION, ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { BoatSystemConfig, IBoatSystem } from "./types";
import { Boat } from "@/Game/Entities/Boat/Boat";
import Matter from "matter-js";
import { BoatFactory } from "@/Game/Factories/BoatFactory/BoatFactory";
import { BOAT_BUILDS } from "@/constants/boats";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem";
import { VEHICLE_TYPE_IDENTIFIERS } from "@/constants/vehicle";
import { GameLoopSystem } from "../GameLoopSystem/GameLoopSystem";
import { GAME_STATE } from "../GameLoopSystem/types";

export class BoatSystem implements IBoatSystem {
  protected _boatFactory: BoatFactory;
  protected _windowWidth: number;
  protected _windowHeight: number;
  protected _originalWaterSurfaceY: number;
  protected _killedBoatsInFrame: Boat[] = [];

  constructor(config: BoatSystemConfig) {
    this._boatFactory = new BoatFactory({ windowWidth: config.windowWidth });
    this._windowWidth = config.windowWidth;
    this._windowHeight = config.windowHeight;
    this._originalWaterSurfaceY = config.originalWaterSUrfaceY;
  }
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    return this.update(entities, args);
  }
  systemManger(entities: RNGE_Entities, args: RNGE_System_Args) {
    const boatSystem: IBoatSystem =
      entities[ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE];
    return boatSystem.systemInstance(entities, args);
  }
  protected update(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    const gameLoopSystem: GameLoopSystem =
      entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    const { gameState } = gameLoopSystem;
    this._killedBoatsInFrame = [];
    const boats = this._findBoatsInEntities(entities);
    if (!this.isAnyBoatAttacking(boats) && gameState === GAME_STATE.RUNNING) {
      this.spawnBoat(entities);
    } else {
      boats.forEach((boat) => {
        if (gameState !== GAME_STATE.RUNNING) boat.isSinked = true;
        if (this.isBoatKilled(boat)) {
          this._killedBoatsInFrame.push(boat);
        } else {
          boat.update(entities, args);
          boat.removeAllListeners("isSinkedChange");
          boat.addListener("isSinkedChange", (isSinked) => {
            if (isSinked) {
              args.dispatch("boatSinked");
            }
          });
        }
      });
    }
    return this.removeKilledBoatsFromEntitiesAndPhysics(entities);
  }

  protected _findBoatsInEntities(entities: RNGE_Entities): Boat[] {
    const keys = Object.keys(entities[ENTITIES_KEYS.SEA_GROUP].entities);
    const result = keys
      .map((key) => entities[ENTITIES_KEYS.SEA_GROUP].entities[key])
      .filter((entitiy) => entitiy?.type === VEHICLE_TYPE_IDENTIFIERS.BOAT);
    return result;
  }

  protected isBoatKilled(boat: Boat): boolean {
    if (!boat?.body) return false;
    if (boat.isSinked) {
      if (boat.body.position.y > this._windowHeight + boat.getSize()[1]) {
        return true;
      }
    }
    return false;
  }

  protected removeKilledBoatsFromEntitiesAndPhysics(
    entities: RNGE_Entities
  ): RNGE_Entities {
    const physicsSystem: PhysicsSystem =
      entities[ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE];
    this._killedBoatsInFrame.forEach((boat) => {
      if (!!boat.body) {
        physicsSystem.removeBodyFromWorld(boat.body);
      }
    });
    const killedBoatsLabels = this._killedBoatsInFrame
      .filter((boat) => !!boat.body)
      .map((boat) => boat.body?.label);
    const newSeaGroupEntitiesKeys = Object.keys(
      entities[ENTITIES_KEYS.SEA_GROUP].entities
    ).filter((key) => !killedBoatsLabels.includes(key));
    const updatedSeaGroupEntities = newSeaGroupEntitiesKeys.reduce(
      (acc: any, key) => {
        acc[key] = entities[ENTITIES_KEYS.SEA_GROUP].entities[key];
        return acc;
      },
      {}
    );

    const updatedEntities = entities;
    updatedEntities[ENTITIES_KEYS.SEA_GROUP].entities = updatedSeaGroupEntities;
    return updatedEntities;
  }

  protected isAnyBoatAttacking(boats: Boat[]): boolean {
    return boats.length > 0;
  }
  protected spawnBoat(entities: RNGE_Entities) {
    const physicsSystem: PhysicsSystem =
      entities[ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE];
    const gameLoopSystem: GameLoopSystem =
      entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    const boat = this.createBoat({ createdFrame: gameLoopSystem.currentFrame });
    if (boat?.body) {
      physicsSystem.addBodyToWorld(boat?.body);
      entities[ENTITIES_KEYS.SEA_GROUP].entities[boat.label] = boat;
    }
  }

  protected createBoat({
    createdFrame,
  }: {
    createdFrame?: number;
  }): Boat | null {
    const label = `${ENTITIES_KEYS.BOAT_LABEL}${Matter.Common.random(
      10 ** 6,
      10 ** 20
    )}`;
    const direction: DIRECTION = Matter.Common.choose([
      DIRECTION.LEFT,
      DIRECTION.RIGHT,
    ]);
    const x = direction === DIRECTION.LEFT ? this._windowWidth : 0;
    const boat = this._boatFactory.create({
      type: BOAT_BUILDS.SPEED_BOAT,
      x,
      y: this._originalWaterSurfaceY,
      direction,
      label,
    });

    return boat;
  }
}
