import Matter from "matter-js";
import { VehicleConfig, IVehicle } from "../Vehicle/types";
import { IGameConfig } from "@/Game/Master/GameConfig/types";
import { DIRECTION } from "@/constants/configs";

export type BoatTrail = {
  x: number;
  y: number;
  timestamp: number;
  render: boolean;
  velocityX: number;
};

export interface IBoat extends IVehicle {
  /**
   * Is this boat attacking the main ship?
   * If true, then the boat will be accelerating towards the ship.
   */
  get isAttacking(): boolean;
  /**
   * Flag used by other services to realize this is a boat.
   * @todo remove this and use a different way.
   */
  get isBoat(): boolean;
  /**
   * Direction, the boat should move to attack the ship.
   * Current value is either 1 or -1.
   * @todo should reimplement this, by letting the boat trace the ship, instead of hardcoding the behavior.
   */
  get direction(): DIRECTION;
  /**
   * An array of trail lines that follow a ship while speeding.
   * @todo define trail class and interface. Trails shoudl be created inside boat class by each update of frame.
   */
  get trail(): BoatTrail[];
}

export type BoatConfig = {
  /**
   * Override default value for isAttacking
   */
  isAttacking?: boolean;
  /**
   * Direction, the boat should move to attack the ship.
   * Current value is either 1 or -1.
   * @todo should reimplement this, by letting the boat trace the ship, instead of hardcoding the behavior.
   */
  direction: DIRECTION;
} & Omit<VehicleConfig, "isBuoyant" | "type">;

export type commonBoatBuildsConfig = {
  x: number;
  y: number;
  direction: DIRECTION;
  label: string;
} & Pick<IGameConfig, "windowWidth">;
