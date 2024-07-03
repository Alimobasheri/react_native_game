import { WarShip } from "@/Game/Entities/Ship/Builds/WarShip";
import { Ship } from "@/Game/Entities/Ship/Ship";
import { SHIP_BUILDS } from "@/constants/ships";

export type ShipFactoryConfig = {
  windowWidth: number;
};

export type ShipFactoryCreatorConfig = {
  type: SHIP_BUILDS;
  x: number;
  y: number;
};

export class ShipFactory {
  protected _windowWidth: number;
  constructor(config: ShipFactoryConfig) {
    this._windowWidth = config.windowWidth;
  }
  create(config: ShipFactoryCreatorConfig): Ship | null {
    switch (config.type) {
      case SHIP_BUILDS.WAR_SHIP:
        return new WarShip({ ...config, windowWidth: this._windowWidth });
      default:
        return null;
    }
  }
}
