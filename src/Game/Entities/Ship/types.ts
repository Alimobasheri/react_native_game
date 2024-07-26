import Matter from "matter-js";
import { VehicleConfig, IVehicle } from "../Vehicle/types";
import { IGameConfig } from "@/Game/Master/GameConfig/types";

export interface IShip extends IVehicle {
  /**
   * Flag used by other services to realize this is a ship.
   * @todo remove this and use a different way.
   */
  get isShip(): boolean;
}

export type ShipConfig = Omit<VehicleConfig, "isBuoyant" | "type">;

export type commonShipBuildsConfig = {
  x: number;
  y: number;
  createdTime: number;
} & Pick<IGameConfig, "windowWidth">;
