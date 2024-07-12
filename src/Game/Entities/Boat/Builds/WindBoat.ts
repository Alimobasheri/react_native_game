import { Boat } from "../Boat";
import { BoatConfig, commonBoatBuildsConfig } from "../types";

export class WindBoat extends Boat {
  protected _sizeRatio = 714 / 919;
  protected _windowWidth: number;
  protected _imageSource: string = "wind-boat-red-orange-stripe.png";
  constructor(config: commonBoatBuildsConfig) {
    super(config);
    this._windowWidth = config.windowWidth;
    this.initialize();
    this._acceleration = 1;
  }
  public getSize(): number[] {
    return [this._windowWidth * 0.1, this._windowWidth * 0.1 * this._sizeRatio];
  }
  public get imageSource() {
    return require(`../../../../../assets/wind-boat-red-orange-stripe.png`);
  }
}
