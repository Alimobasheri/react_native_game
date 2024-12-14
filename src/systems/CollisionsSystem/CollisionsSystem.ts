import { ENTITIES_KEYS } from '@/constants/configs';
import { RNGE_Entities, RNGE_System_Args } from '../types';
import { ICollisionsSystem, ShipBoatCollisionList } from './types';
import { Boat } from '@/Game/Entities/Boat/Boat';
import { Ship } from '@/Game/Entities/Ship/Ship';
import Matter from 'matter-js';
import { GAME_OVER_EVENT } from '@/constants/events';
import { Entities, Entity } from '@/containers/ReactNativeSkiaGameEngine';
import { State } from '@/Game/Entities/State/State';

export class CollisionsSystem implements ICollisionsSystem {
  protected _collisionsInFrame: ShipBoatCollisionList = [];

  public get collisionsInFrame(): ShipBoatCollisionList {
    return this._collisionsInFrame;
  }

  public systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    this.update(entities, args);
    return entities;
  }

  systemInstanceRNSGE(entities: Entities, args: RNGE_System_Args) {
    this.update(entities, args);
  }

  public systemManager(entities: RNGE_Entities, args: RNGE_System_Args) {
    const collisionsSystem: CollisionsSystem =
      entities[ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE];
    return collisionsSystem.systemInstance(entities, args);
  }

  protected update(entities: Entities, args: RNGE_System_Args): void {
    const stateEntity: Entity<State> | undefined = entities.getEntityByLabel(
      ENTITIES_KEYS.STATE
    );
    if (stateEntity?.data?.isGamePlayExited || !stateEntity?.data?.isRunning)
      return;
    const attackingBoats = this.findAttackingBoats(entities);
    const ship: Entity<Ship> | undefined = entities.getEntityByLabel(
      ENTITIES_KEYS.SHIP
    );
    if (attackingBoats.length > 0 && !!ship?.data.body) {
      const collisions = this.getAttackingBoatsCollision(
        attackingBoats,
        ship.data
      );
      if (collisions.length > 0) {
        args.dispatcher.emitEvent(GAME_OVER_EVENT);
      }
    }
  }

  protected getAttackingBoatsCollision(
    attackingBoats: Entity<Boat>[],
    ship: Ship
  ): Matter.Collision[] {
    const attackingBoatsWithBodies: any[] = [];
    for (let i = 0; i < attackingBoats.length; i++) {
      if (attackingBoats[i].data.body !== null)
        attackingBoatsWithBodies.push(attackingBoats[i].data.body);
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
        this._collisionsInFrame.push({
          frame,
          boatLabel: boatBody.label,
          matterCollision: collision,
        });
      }
    });
  }

  protected findAttackingBoats(entities: Entities): Entity<Boat>[] {
    return entities.getEntitiesByGroup(ENTITIES_KEYS.BOAT_GROUP);
  }
}
