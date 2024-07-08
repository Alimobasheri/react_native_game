import { ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { ICollisionsSystem, ShipBoatCollisionList } from "./types";
import { VEHICLE_TYPE_IDENTIFIERS } from "@/constants/vehicle";
import { Boat } from "@/Game/Entities/Boat/Boat";
import { Ship } from "@/Game/Entities/Ship/Ship";
import Matter from "matter-js";
import { GameLoopSystem } from "../GameLoopSystem/GameLoopSystem";

export class CollisionsSystem implements ICollisionsSystem {
  protected _collisionsInFrame: ShipBoatCollisionList = [];

  public get collisionsInFrame(): ShipBoatCollisionList {
    return this._collisionsInFrame;
  }

  public systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    this.update(entities);
    return entities;
  }
  public systemManger(entities: RNGE_Entities, args: RNGE_System_Args) {
    const collisionsSystem: CollisionsSystem =
      entities[ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE];
    return collisionsSystem.systemInstance(entities, args);
  }

  protected update(entities: RNGE_Entities): void {
    const gameLoopSystem: GameLoopSystem =
      entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    const currentFrame = gameLoopSystem.currentFrame;
    const attackingBoats = this.findAttackingBoats(entities);
    const ship: Ship = entities[ENTITIES_KEYS.SEA_GROUP].entities["ship"];
    if (attackingBoats.length > 0 && !!ship?.body) {
      const collisions = this.getAttackingBoatsCollision(attackingBoats, ship);
      this.saveShipBoatCollisionsInFrame(
        entities,
        collisions,
        ship,
        currentFrame
      );
    }
  }

  protected getAttackingBoatsCollision(
    attackingBoats: Boat[],
    ship: Ship
  ): Matter.Collision[] {
    const attackingBoatsWithBodies: any[] = [];
    for (let i = 0; i < attackingBoats.length; i++) {
      if (attackingBoats[i].body !== null)
        attackingBoatsWithBodies.push(attackingBoats[i].body);
    }
    const collisionsDetector = Matter.Detector.create({
      bodies: [
        ship?.body,
        ...attackingBoatsWithBodies.map((attackingBoat) => attackingBoat),
      ],
    });
    const collisions = Matter.Detector.collisions(collisionsDetector);
    return collisions;
  }

  protected saveShipBoatCollisionsInFrame(
    entities: RNGE_Entities,
    collisions: Matter.Collision[],
    ship: Ship,
    frame: number
  ): void {
    this._collisionsInFrame = [];
    collisions.forEach((collision) => {
      if (
        collision.bodyA.label === ship.label ||
        collision.bodyB.label === ship.label
      ) {
        // entities.health.value -= 10;
        const boatBody =
          collision.bodyA.label === ship.label
            ? collision.bodyB
            : collision.bodyA;
        // Matter.Body.setAngularVelocity(boatBody, 0.1);
        const boat: Boat = entities[boatBody.label];
        // boat.isSinked = true;
        // boat.isAttacking = false;
        this._collisionsInFrame.push({
          frame,
          boatLabel: boatBody.label,
          matterCollision: collision,
        });
      }
    });
  }

  protected findAttackingBoats(entities: RNGE_Entities): Boat[] {
    return Object.keys(entities)
      .map((key) => entities[key])
      .filter(
        (entity) =>
          entity?.type === VEHICLE_TYPE_IDENTIFIERS.BOAT && entity.isAttacking
      );
  }
}
