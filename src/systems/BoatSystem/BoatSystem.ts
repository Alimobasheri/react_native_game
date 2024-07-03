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
    this._killedBoatsInFrame = [];
    const boats = this._findBoatsInEntities(entities);
    if (!this.isAnyBoatAttacking(boats)) {
      this.spawnBoat(entities);
    } else {
      boats.forEach((boat) => {
        if (this.isBoatKilled(boat)) {
          this._killedBoatsInFrame.push(boat);
        } else {
          boat.update(entities, args);
        }
      });
    }
    return this.removeKilledBoatsFromEntitiesAndPhysics(entities);
  }

  protected _findBoatsInEntities(entities: RNGE_Entities): Boat[] {
    return Object.keys(entities)
      .map((key) => entities[key])
      .filter((entitiy) => entitiy?.type === VEHICLE_TYPE_IDENTIFIERS.BOAT);
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
    const newEntitiesKeys = Object.keys(entities).filter(
      (key) => !killedBoatsLabels.includes(key)
    );
    const updatedEntities = newEntitiesKeys.reduce((acc: any, key) => {
      acc[key] = entities[key];
      return acc;
    }, {});
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
      entities[boat.label] = boat;
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
