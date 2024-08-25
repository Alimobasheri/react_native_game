import Matter from 'matter-js';
import { IVehicle, VehicleConfig } from './types';
import {
  DEFAULT_MIN_FRAMES_BEFORE_INITIALIZATION,
  DEFAULT_MIN_TIME_BEFORE_INITIALIZATION,
  DEFAULT_VEHICLE_ACCELERATION,
  DEFAULT_VEHICLE_HEALTH,
  DEFAULT_VEHICLE_MAX_VELOCITY_X,
  VEHICLE_TYPE_IDENTIFIERS,
} from '@/constants/vehicle';
import { RNGE_Entities, RNGE_System_Args } from '@/systems/types';
import { GameLoopSystem } from '@/systems/GameLoopSystem/GameLoopSystem';
import { ENTITIES_KEYS } from '@/constants/configs';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { Entities } from '@/containers/ReactNativeSkiaGameEngine';

export class Vehicle extends EventEmitter implements IVehicle {
  protected _x: number;
  protected _y: number;
  protected _isBuoyant: boolean;
  protected _createdFrame: number = 0;
  protected _createdTime: number;
  protected _isSinked: boolean | undefined;
  protected _isInitialized: boolean = false;
  protected _body: Matter.Body | null = null;
  protected _health: number;
  protected _isDestroyed: boolean = false;
  protected _size: number[] = [NaN, NaN];
  protected _mass: number = 1;
  protected _type: VEHICLE_TYPE_IDENTIFIERS;
  protected _label: string;
  protected _maxVelocityX: number;
  protected _acceleration: number = DEFAULT_VEHICLE_ACCELERATION;
  protected _minFramesBeforeInitialization: number =
    DEFAULT_MIN_FRAMES_BEFORE_INITIALIZATION;
  protected _minTimeBeforeInitialization: number =
    DEFAULT_MIN_TIME_BEFORE_INITIALIZATION;
  protected _previousVelocity: Matter.Vector = { x: 0, y: 0 };
  protected _currentAcceleration: Matter.Vector = { x: 0, y: 0 };

  /**
   * Creates a vehicle instance
   * @param {VehicleConfig} config - The initial config to initialize vehicle.
   */
  constructor({
    x,
    y,
    isBuoyant,
    createdFrame,
    isSinked,
    isInitialized,
    initialHealth,
    type,
    label,
    maxVelocityX,
    acceleration,
    mass,
    createdTime,
  }: VehicleConfig) {
    super();
    this._x = x;
    this._y = y;
    this._isBuoyant = isBuoyant;
    this._createdFrame = createdFrame ?? this._createdFrame;
    this._isSinked = isSinked;
    this._isInitialized = isInitialized ?? this._isInitialized;
    this._health = initialHealth ?? DEFAULT_VEHICLE_HEALTH;
    this._type = type;
    this._label = label;
    this._maxVelocityX = maxVelocityX || DEFAULT_VEHICLE_MAX_VELOCITY_X;
    this._acceleration = acceleration || DEFAULT_VEHICLE_ACCELERATION;
    this._mass = mass ?? this._mass;
    this._createdTime = createdTime;
  }

  protected initialize(): void {
    this._body = this.createBody();
  }

  public get type(): VEHICLE_TYPE_IDENTIFIERS {
    return this._type;
  }

  public get body(): Matter.Body | null {
    return this._body;
  }

  public getAcceleration(deltaTime: number): Matter.Vector | undefined {
    if (!this._body) return;

    return this._currentAcceleration;
  }

  public get isBuoyant(): boolean {
    return this._isBuoyant;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get createdFrame(): number | undefined {
    return this._createdFrame;
  }

  public get isSinked(): boolean {
    if (typeof this._isSinked === 'undefined') return false;
    return this._isSinked;
  }

  public set isSinked(value: boolean) {
    if (this._isSinked === value) return;
    this._isSinked = value;
    this.emit('isSinkedChange', value);
  }

  public get size(): number[] {
    return this.getSize();
  }

  public get label(): string {
    return this._label;
  }

  public update(entities: Entities, { time }: RNGE_System_Args): void {
    const { delta } = time;
    // const gameLoopSystem: GameLoopSystem =
    //   entities[ENTITIES_KEYS.GAME_LOOP_SYSTEM];
    this._size = this.getSize();
    if (!!this._body) {
      this._currentAcceleration = {
        x: (this._body.velocity.x - this._previousVelocity.x) / delta,
        y: (this._body.velocity.y - this._previousVelocity.y) / delta,
      };
    }
    // if (this._type === VEHICLE_TYPE_IDENTIFIERS.BOAT) {
    //   console.log(
    //     "=====",
    //     this._createdTime,
    //     this._minTimeBeforeInitialization
    //   );
    // }
    if (!this._isInitialized && !!this._body) {
      this.keepBodyStable();
      if (
        time.current - this._createdTime >=
        this._minTimeBeforeInitialization
      ) {
        this._isInitialized = true;
      }
    } else {
      this._onUpdate(entities);
    }
  }

  public get health(): number {
    return this._health;
  }

  public get maxVelocityX(): number {
    return this._maxVelocityX;
  }

  public get acceleration(): number {
    return this._acceleration;
  }

  public getPosition(): number[] {
    return [this._x, this._y];
  }

  protected _onUpdate(entities: RNGE_Entities): void {}

  protected createBody(): Matter.Body {
    const size = this.getSize();
    const position = this.getPosition();
    const vehicleBody = Matter.Bodies.rectangle(
      position[0],
      position[1],
      size[0],
      size[1],
      { label: this._label, density: 0.004, restitution: 0.5 }
    );
    return vehicleBody;
  }

  protected keepBodyStable() {
    if (this._body) {
      const position = this.getPosition();
      Matter.Body.setPosition(this._body, {
        x: position[0],
        y: position[1],
      });
      Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(this._body, 0);
    }
  }

  /**
   * Given an amount of damage, decrease this vehicle's health by that amount.
   * Make sure, negative values aren't used for health.
   * If health reaches 0, this vehicle is destroyed.
   * @param damageAmount How much damage is applied to this vehicle?
   */
  protected takeDamage(damageAmount: number): void {
    const healthValueAfterDamage = this._health - damageAmount;
    if (healthValueAfterDamage > 0) this._health = healthValueAfterDamage;
    else {
      this._health = 0;
      this._isDestroyed = true;
    }
  }

  public getSize(): number[] {
    return [];
  }
}
