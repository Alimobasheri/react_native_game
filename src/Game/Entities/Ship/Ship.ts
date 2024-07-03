import { ShipView } from "@/components/ShipView";
import { Vehicle } from "../Vehicle/Vehicle";
import { IShip, ShipConfig } from "./types";
import { VEHICLE_TYPE_IDENTIFIERS } from "@/constants/vehicle";

export class Ship extends Vehicle implements IShip {
  protected _isShip: boolean = true;

  /**
   * Creates an Instance of a ship.
   * @param {ShipConfig} config Initialization config for ship
   */
  constructor(config: ShipConfig) {
    super({ ...config, isBuoyant: true, type: VEHICLE_TYPE_IDENTIFIERS.SHIP });
  }

  public get isShip(): boolean {
    return this.isShip;
  }

  getSize(): number[] {
    return [];
  }

  renderer = ShipView;
}
