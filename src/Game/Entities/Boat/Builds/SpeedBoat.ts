import { Boat } from "../Boat";
import { BoatConfig, commonBoatBuildsConfig } from "../types";

export class SpeedBoat extends Boat {
  protected _sizeRatio = 59.5 / 256;
  protected _windowWidth: number;
  protected _imageSource: string = "speedboat-png.png";
  constructor(config: commonBoatBuildsConfig) {
    super(config);
    this._windowWidth = config.windowWidth;
    this.initialize();
    this._acceleration = 1;
  }
  public getSize(): number[] {
    return [
      this._windowWidth * 0.08,
      this._windowWidth * 0.08 * this._sizeRatio,
    ];
  }

  public get imageSource() {
    return require(`../../../../../assets/speedboat-png.png`);
  }
}
