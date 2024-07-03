import { Boat } from "@/Game/Entities/Boat/Boat";
import { SpeedBoat } from "@/Game/Entities/Boat/Builds/SpeedBoat";
import { BOAT_BUILDS } from "@/constants/boats";
import { DIRECTION } from "@/constants/configs";

export type BoatFactoryConfig = {
  windowWidth: number;
};

export type BoatFactoryCreatorConfig = {
  type: BOAT_BUILDS;
  x: number;
  y: number;
  direction: DIRECTION;
  label: string;
};

export class BoatFactory {
  protected _windowWidth: number;
  constructor(config: BoatFactoryConfig) {
    this._windowWidth = config.windowWidth;
  }
  create(config: BoatFactoryCreatorConfig): Boat | null {
    switch (config.type) {
      case BOAT_BUILDS.SPEED_BOAT:
        return new SpeedBoat({ ...config, windowWidth: this._windowWidth });
      default:
        return null;
    }
  }
}
