import { Boat } from "../Boat";
import { BoatConfig, commonBoatBuildsConfig } from "../types";

export class RedPirateHeadSkull extends Boat {
  protected _sizeRatio = 308 / 512;
  protected _windowWidth: number;
  protected _imageSource: string = "skull-head-pirate-shark-red.png";
  constructor(config: commonBoatBuildsConfig) {
    super(config);
    this._windowWidth = config.windowWidth;
    this.initialize();
    this._acceleration = 2.3;
  }
  public getSize(): number[] {
    return [
      this._windowWidth * 0.08,
      this._windowWidth * 0.08 * this._sizeRatio,
    ];
  }

  public get imageSource() {
    return require(`../../../../../assets/skull-head-pirate-shark-red.png`);
  }
}
