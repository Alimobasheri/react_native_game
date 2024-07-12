import { VEHICLE_TYPE_IDENTIFIERS } from "@/constants/vehicle";
import { Vehicle } from "../Vehicle/Vehicle";
import { BoatConfig, BoatTrail, IBoat } from "./types";
import { DIRECTION, ENTITIES_KEYS } from "@/constants/configs";
import Matter from "matter-js";
import { Ship } from "../Ship/Ship";
import { getDirection } from "@/utils/getDirection";
import { RNGE_Entities } from "@/systems/types";
import { BoatView } from "@/components/BoatView";
import { CollisionsSystem } from "@/systems/CollisionsSystem/CollisionsSystem";
import { GameLoopSystem } from "@/systems/GameLoopSystem/GameLoopSystem";
import { Sea } from "../Sea/Sea";

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
    if (!!this._body && !!ship.body) {
      const direction = getDirection(this._body, ship.body);
      this._direction = direction;
      this._move(sea);
    }
  }

  protected _move(sea: Sea) {
    if (!this._body) return;
    // Check if the boat is over water and at a stable angle
    const boatPosition = this._body.position;
    const waterSurfaceAtBoat = sea.getWaterSurfaceAndMaxHeightAtPoint(
      boatPosition.x
    ).y;
    const isOverWater =
      boatPosition.y + this.getSize()[1] / 2 >= waterSurfaceAtBoat;
    const angleThreshold = Math.PI / 12; // 15 degrees threshold
    const isStable = Math.abs(this._body.angle) < angleThreshold;

    if (!(isOverWater && isStable)) return;
    const currentVelocityX = this._body.velocity.x;
    let newVelocityX = currentVelocityX;
    if (this._direction === DIRECTION.LEFT) {
      newVelocityX =
        currentVelocityX <= 0 ? currentVelocityX - this._acceleration : 0;
      if (Math.abs(newVelocityX) >= this._maxVelocityX)
        newVelocityX = -this._maxVelocityX;
      Matter.Body.setVelocity(this._body, {
        x: newVelocityX,
        y: this._body.velocity.y,
      });
    } else if (this._direction === DIRECTION.RIGHT) {
      newVelocityX =
        currentVelocityX >= 0 ? currentVelocityX + this._acceleration : 0;
      if (Math.abs(newVelocityX) >= this._maxVelocityX)
        newVelocityX = this._maxVelocityX;
      Matter.Body.setVelocity(this._body, {
        x: newVelocityX,
        y: this._body.velocity.y,
      });
    }
    this._applyTilt();
  }

  protected _applyTilt(): void {
    if (!this._body) return;
    if (Math.abs(this._body.velocity.x) > 5) {
      const maxTiltAngle = Math.PI / 8; // Adjust the tilt angle as needed
      const tiltFactor = 0.01; // Adjust the factor to control the tilting effect
      const targetTilt = this._body.velocity.x * tiltFactor; // Reverse the tilt direction
      const clampedTilt = Math.max(
        -maxTiltAngle,
        Math.min(maxTiltAngle, targetTilt)
      );
      Matter.Body.setAngle(this._body, -clampedTilt);
    }
  }

  protected _onUpdate(entities: RNGE_Entities): void {
    if (this.isSinked) return;
    const sea: Sea = entities[ENTITIES_KEYS.SEA_GROUP].entities["sea"];
    const ship: Ship = entities[ENTITIES_KEYS.SEA_GROUP].entities["ship"];
    const gameLoopSystem: GameLoopSystem =
      entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    const currentFrame = gameLoopSystem.currentFrame;
    const collisionsSystem: CollisionsSystem =
      entities[ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE];
    const shipBoatCollisionsInFrame = collisionsSystem.collisionsInFrame;
    const hasThisBoatCollided = shipBoatCollisionsInFrame.find(
      (collision) =>
        collision.frame === currentFrame && collision.boatLabel === this._label
    );
    // console.log(
    //   "🚀 ~ Boat ~ _onUpdate ~ this._body.velocity.y:",
    //   this._body?.velocity.y
    // );
    if (hasThisBoatCollided) {
      this.takeDamage(100);
      this.isSinked = true;
      this._isAttacking = false;
    } else if (!!ship) {
      this._attackShip(ship, sea);
      this._isAttacking = true;
    }
  }

  renderer = BoatView;
}
