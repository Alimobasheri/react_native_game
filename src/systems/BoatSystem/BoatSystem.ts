import {
  BUOYANTS_GROUP,
  DIRECTION,
  ENTITIES_KEYS,
  TRAIL_FADE_DURATION,
  VEHICLES_GROUP,
} from '@/constants/configs';
import { RNGE_Entities, RNGE_System_Args } from '../types';
import { BoatSystemConfig, IBoatSystem } from './types';
import { Boat } from '@/Game/Entities/Boat/Boat';
import Matter from 'matter-js';
import { BoatFactory } from '@/Game/Factories/BoatFactory/BoatFactory';
import { BOAT_BUILDS } from '@/constants/boats';
import { PhysicsSystem } from '../PhysicsSystem/PhysicsSystem';
import { VEHICLE_TYPE_IDENTIFIERS } from '@/constants/vehicle';
import { GameLoopSystem } from '../GameLoopSystem/GameLoopSystem';
import { GAME_STATE } from '../GameLoopSystem/types';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { Entities, Entity } from '@/containers/ReactNativeSkiaGameEngine';
import { MutableRefObject } from 'react';
import { State } from '@/Game/Entities/State/State';
import { BOAT_SINKED_EVENT } from '@/constants/events';

export class BoatSystem implements IBoatSystem {
  protected _boatFactory: BoatFactory;
  protected _windowWidth: number;
  protected _windowHeight: number;
  protected _originalWaterSurfaceY: number;
  protected _killedBoatsInFrame: Entity<Boat>[] = [];

  constructor(config: BoatSystemConfig) {
    this._boatFactory = new BoatFactory({ windowWidth: config.windowWidth });
    this._windowWidth = config.windowWidth;
    this._windowHeight = config.windowHeight;
    this._originalWaterSurfaceY = config.originalWaterSUrfaceY;
  }
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    return this.update(entities, args);
  }
  systemInstanceRNSGE(entities: Entities, args: RNGE_System_Args) {
    this.update(entities, args);
  }
  systemManager(entities: RNGE_Entities, args: RNGE_System_Args) {
    const boatSystem: IBoatSystem =
      entities[ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE];
    return boatSystem.systemInstance(entities, args);
  }
  protected update(entities: Entities, args: RNGE_System_Args) {
    const state: State = entities.getEntityByLabel(ENTITIES_KEYS.STATE)!.data;
    if (!state.isRunning) return;
    // const gameLoopSystem: GameLoopSystem =
    //   entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    const sea: Sea = entities.getEntityByLabel(ENTITIES_KEYS.SEA)!.data;
    // const { gameState } = gameLoopSystem;
    let gameState = GAME_STATE.RUNNING;
    this._killedBoatsInFrame = [];
    const boats = this._findBoatsInEntities(entities);
    if (!this.isAnyBoatAttacking(boats) && gameState === GAME_STATE.RUNNING) {
      this.spawnBoat(entities, args);
    } else {
      boats.forEach((boat) => {
        if (gameState !== GAME_STATE.RUNNING) boat.data.isSinked = true;
        if (this.isBoatKilled(boat.data)) {
          this._killedBoatsInFrame.push(boat);
        } else {
          boat.data.update(entities, args);
          this.generateBoatTrailPath(boat.data, sea);
          boat.removeAllListeners('isSinkedChange');
          boat.addListener('isSinkedChange', (isSinked) => {
            if (isSinked) {
              args.dispatcher.emitEvent(BOAT_SINKED_EVENT(boat.data));
            }
          });
        }
      });
    }
    return this.removeKilledBoatsFromEntitiesAndPhysics(entities);
  }

  protected _findBoatsInEntities(entities: Entities): Entity<Boat>[] {
    const baotsEntities = entities.getEntitiesByGroup(ENTITIES_KEYS.BOAT_GROUP);
    return baotsEntities.map((boatEntity) => boatEntity);
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

  protected removeKilledBoatsFromEntitiesAndPhysics(entities: Entities) {
    const physicsSystem: Entity<MutableRefObject<PhysicsSystem>> | undefined =
      entities.getEntityByLabel(ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE);
    if (!physicsSystem?.data?.current) return;
    this._killedBoatsInFrame.forEach((boat) => {
      if (!!boat.data.body) {
        physicsSystem.data.current.removeBodyFromWorld(boat.data.body);
        entities.removeEntity(boat.id);
      }
    });
  }

  protected isAnyBoatAttacking(boats: Entity<Boat>[]): boolean {
    return boats.length > 0;
  }
  protected spawnBoat(entities: Entities, args: RNGE_System_Args) {
    const physicsSystem: Entity<MutableRefObject<PhysicsSystem>> | undefined =
      entities.getEntityByLabel(ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE);
    if (!physicsSystem?.data?.current) return;

    // const gameLoopSystem: GameLoopSystem =
    //   entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    const boat = this.createBoat({
      createdTime: args.time.current,
      // gameLoopSystem.currentFrame
    });
    if (boat?.body) {
      physicsSystem.data.current.addBodyToWorld(boat?.body);
      entities.addEntity(new Entity<Boat>(boat), {
        groups: [ENTITIES_KEYS.BOAT_GROUP, BUOYANTS_GROUP, VEHICLES_GROUP],
      });
    }
  }

  protected createBoat({ createdTime }: { createdTime: number }): Boat | null {
    console.log('🚀 ~ BoatSystem ~ createBoat ~ createdTime:', createdTime);
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
      type: BOAT_BUILDS.RED_PIRATE_SKULL_HEAD,
      x,
      y: this._originalWaterSurfaceY,
      direction,
      label,
      createdTime,
    });
    console.log(
      '🚀 ~ BoatSystem ~ createBoat ~ boat:',
      boat?.body?.density,
      boat?.body?.restitution,
      boat?.body?.frictionAir
    );

    return boat;
  }

  protected generateBoatTrailPath(boat: Boat, sea: Sea) {
    const { body } = boat;
    if (!body) return;
    const size = boat.getSize();
    const waterSurfaceAtX = sea.getWaterSurfaceAndMaxHeightAtPoint(
      body.position.x
    ).y;
    if (
      body.position.y <= waterSurfaceAtX + size[1] / 2 &&
      body.position.y >= waterSurfaceAtX - size[1] / 2
    ) {
      const isAdjacentToWater =
        body.position.y <= waterSurfaceAtX + size[1] / 2 &&
        body.position.y >= waterSurfaceAtX - size[1] / 2;
      boat.trail.push({
        x: body.position.x,
        y: body.position.y,
        timestamp: Date.now(),
        render: isAdjacentToWater,
        velocityX: Math.abs(body.velocity.x),
      });
    }
    if (boat.trail.length > 20) boat.trail.shift(); // Limit the boat.trail length
    // Update the y-coordinate of each boat.trail point based on the water surface
    boat.trail.forEach((trailPoint) => {
      trailPoint.y = sea.getWaterSurfaceAndMaxHeightAtPoint(trailPoint.x).y;
    });
    // Remove boat.trail points that are older than TRAIL_FADE_DURATION
    const now = Date.now();
    boat.trail = boat.trail.filter(
      (trailPoint) => now - trailPoint.timestamp < TRAIL_FADE_DURATION
    );
  }
}
