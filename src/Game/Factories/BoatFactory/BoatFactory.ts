import { Boat } from "@/Game/Entities/Boat/Boat";
import { RedPirateHeadSkull } from "@/Game/Entities/Boat/Builds/RedPirateHeadSkull";
import { SpeedBoat } from "@/Game/Entities/Boat/Builds/SpeedBoat";
import { WindBoat } from "@/Game/Entities/Boat/Builds/WindBoat";
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
      case BOAT_BUILDS.WIND_BOAT_STRIPED:
        return new WindBoat({ ...config, windowWidth: this._windowWidth });
      case BOAT_BUILDS.RED_PIRATE_SKULL_HEAD:
        return new RedPirateHeadSkull({
          ...config,
          windowWidth: this._windowWidth,
        });
      default:
        return null;
    }
  }
}
