import { VEHICLE_TYPE_IDENTIFIERS } from "@/constants/vehicle";
import { RNGE_Entities, RNGE_System_Args } from "@/systems/types";

/**
 * Reperesents a vehicle's must general features.
 * A vehicle has a size and a flag that indicates if it's buoyant or not.
 * Ships and boats are examples of buoyants, that float over water are affected by waves.
 * @interface IVehicle
 */
export interface IVehicle {
  /**
   * The Matter physical body of the ship.
   */
  get body(): Matter.Body | null;
  /**
   * Is the vehicle affected by buoyant force inside water?
   * @returns {boolean}
   */
  get isBuoyant(): boolean;
  /**
   * What frame was this vehicle created in?
   * @returns {number} FrameNumber
   */
  get createdFrame(): number | undefined;
  /**
   * Is this vehicle sinked in water?
   * This is useful to prevent buoyancy and floating over water.
   * Sinked vehicle might be neglected for collision detection too.
   * @returns {boolean | undefined}
   */
  get isSinked(): boolean | undefined;
  set isSinked(boolean);
  /**
   * Remaining amount of this vehicle's health.
   */
  get health(): number;
  /**
   * Width and height of item to render.
   */
  get size(): number[];
  /**
   * Type of vehicle.
   */
  get type(): VEHICLE_TYPE_IDENTIFIERS;
  /**
   * Matter body label and entities_key
   */
  get label(): string;
  /**
   * Maximum velocity the vehicle can reach in x direction
   */
  get maxVelocityX(): number;
  /**
   * Velocity / frame
   */
  get acceleration(): number;
  /**
   * Updates property values for size and other properties.
   */
  update(entities: RNGE_Entities, args: RNGE_System_Args): void;
}

/**
 * Initial config to create a vehicle instance.
 */
export type VehicleConfig = {
  /**
   * Label to be ued for Matter body and as Entity key
   */
  label: string;
  /**
   * Initial position x.
   */
  x: number;
  /**
   * Initial position y.
   */
  y: number;
  /**
   * Is affected by buoyancy forces?
   * @type {boolean}
   */
  isBuoyant: boolean;
  /**
   * At what frame number was this vehicle created?
   * @type {number | undefined}
   */
  createdFrame?: number;
  /**
   * Is this vehicle sinked in water and not moving?
   * @type {number }
   */
  isSinked?: boolean;
  /**
   * Is this vehicle's status in physics world stable and initialized?
   * @type {boolean}
   */
  isInitialized?: boolean;
  /**
   * The initial value for this vehicle's health.
   * @default 100
   */
  initialHealth?: number;
  /**
   * Type of vehicle, to be able to identify and differentiate.
   */
  type: VEHICLE_TYPE_IDENTIFIERS;
  /**
   * The maximum x velocity the vehicle can reach.
   */
  maxVelocityX?: number;
  /**
   * Velocity / frame value.
   */
  acceleration?: number;
};
