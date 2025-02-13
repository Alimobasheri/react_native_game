import { VEHICLE_TYPE_IDENTIFIERS } from '@/constants/vehicle';
import { Vehicle } from '../Vehicle/Vehicle';
import { BoatConfig, BoatTrail, IBoat } from './types';
import { DIRECTION, ENTITIES_KEYS } from '@/constants/configs';
import Matter from 'matter-js';
import { Ship } from '../Ship/Ship';
import { getDirection } from '@/utils/getDirection';
import { RNGE_Entities } from '@/systems/types';
import { BoatView } from '@/components/BoatView';
import { CollisionsSystem } from '@/systems/CollisionsSystem/CollisionsSystem';
import { GameLoopSystem } from '@/systems/GameLoopSystem/GameLoopSystem';
import { Sea } from '../Sea/Sea';
import { Entities, Entity } from '@/containers/ReactNativeSkiaGameEngine';

export class Boat extends Vehicle implements IBoat {
  protected _isAttacking: boolean = false;
  protected _isBoat: boolean = true;
  protected _direction: DIRECTION;
  protected _trail: BoatTrail[] = [];

  /**
   * Creates a Boat instance with configs.
   * @param {BoatConfig} config Configuration for the boat to be created.
   */
  constructor({
    x,
    y,
    createdFrame,
    isSinked,
    isInitialized,
    isAttacking,
    direction,
    label,
    createdTime,
  }: BoatConfig) {
    super({
      x,
      y,
      isBuoyant: true,
      createdFrame,
      isSinked,
      isInitialized,
      type: VEHICLE_TYPE_IDENTIFIERS.BOAT,
      label,
      createdTime,
    });
    this._isAttacking = isAttacking ?? this._isAttacking;
    this._direction = direction;
  }

  public get isAttacking(): boolean {
    return this._isAttacking;
  }

  public get direction(): DIRECTION {
    return this._direction;
  }

  public get isBoat(): boolean {
    return this._isBoat;
  }

  public set trail(trail: BoatTrail[]) {
    this._trail = trail;
  }

  public get trail(): BoatTrail[] {
    return this._trail;
  }

  public getPosition(): number[] {
    const position: number[] = [this._x, this._y];
    const size = this.getSize();
    if (this._direction == DIRECTION.RIGHT) {
      position[0] = position[0] - size[0] / 2;
    } else {
      position[1] = position[1] + size[1] / 2;
    }
    return position;
  }

  protected _attackShip(ship: Ship, sea: Sea): void {
    if (!!this.body && !!ship.body) {
      const direction = getDirection(this.body, ship.body);
      this._direction = direction;
      this._move(sea);
    }
  }

  protected _move(sea: Sea) {
    if (!this.body) return;
    // Check if the boat is over water and at a stable angle
    const boatPosition = this.body.position;
    const waterSurfaceAtBoat = sea.getWaterSurfaceAndMaxHeightAtPoint(
      boatPosition.x
    ).y;
    const isOverWater =
      boatPosition.y + this.getSize()[1] / 2 >= waterSurfaceAtBoat;
    const angleThreshold = Math.PI / 12; // 15 degrees threshold
    const isStable = Math.abs(this.body.angle) < angleThreshold;

    if (!(isOverWater && isStable)) return;
    const currentVelocityX = this.body.velocity.x;
    let newVelocityX = currentVelocityX;
    if (this._direction === DIRECTION.LEFT) {
      newVelocityX =
        currentVelocityX <= 0 ? currentVelocityX - this._acceleration : 0;
      if (Math.abs(newVelocityX) >= this._maxVelocityX)
        newVelocityX = -this._maxVelocityX;
      Matter.Body.setVelocity(this.body, {
        x: newVelocityX,
        y: this.body.velocity.y,
      });
    } else if (this._direction === DIRECTION.RIGHT) {
      newVelocityX =
        currentVelocityX >= 0 ? currentVelocityX + this._acceleration : 0;
      if (Math.abs(newVelocityX) >= this._maxVelocityX)
        newVelocityX = this._maxVelocityX;
      Matter.Body.setVelocity(this.body, {
        x: newVelocityX,
        y: this.body.velocity.y,
      });
    }
    this._applyTilt();
  }

  protected _applyTilt(): void {
    if (!this.body) return;
    if (Math.abs(this.body.velocity.x) > 5) {
      const maxTiltAngle = Math.PI / 8; // Adjust the tilt angle as needed
      const tiltFactor = 0.01; // Adjust the factor to control the tilting effect
      const targetTilt = this.body.velocity.x * tiltFactor; // Reverse the tilt direction
      const clampedTilt = Math.max(
        -maxTiltAngle,
        Math.min(maxTiltAngle, targetTilt)
      );
      Matter.Body.setAngle(this.body, -clampedTilt);
    }
  }

  protected _onUpdate(entities: Entities): void {
    if (this.isSinked) return;
    const sea: Entity<Sea> | undefined = entities.getEntityByLabel(
      ENTITIES_KEYS.SEA
    );
    const ship: Entity<Ship> | undefined = entities.getEntityByLabel(
      ENTITIES_KEYS.SHIP
    );
    // const gameLoopSystem: GameLoopSystem =
    //   entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    // const currentFrame = gameLoopSystem.currentFrame;
    // const collisionsSystem: CollisionsSystem =
    //   entities[ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE];
    // const shipBoatCollisionsInFrame = collisionsSystem.collisionsInFrame;
    const hasThisBoatCollided = false;
    // shipBoatCollisionsInFrame.find(
    //   (collision) =>
    //     collision.frame === currentFrame && collision.boatLabel === this._label
    // );
    // console.log(
    //   "🚀 ~ Boat ~ _onUpdate ~ this.body.velocity.y:",
    //   this.body?.velocity.y
    // );
    if (hasThisBoatCollided) {
      this.takeDamage(100);
      this.isSinked = true;
      this._isAttacking = false;
    } else if (!!ship) {
      this._attackShip(ship!.data, sea!.data);
      this._isAttacking = true;
    }
  }

  renderer = BoatView;
}
