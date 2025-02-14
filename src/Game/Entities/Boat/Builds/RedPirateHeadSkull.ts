import { Boat } from '../Boat';
import { BoatConfig, commonBoatBuildsConfig } from '../types';

export class RedPirateHeadSkull extends Boat {
  protected _sizeRatio = 1;
  protected _windowWidth: number;
  protected _imageSource: string = 'skull-head-pirate-shark-red.png';
  constructor(config: commonBoatBuildsConfig) {
    super(config);
    this._windowWidth = config.windowWidth;
    this.initialize();
    this.acceleration = 0.6;
  }
  public getSize(): number[] {
    const size = [
      this._windowWidth * 0.08,
      this._windowWidth * 0.08 * this._sizeRatio,
    ];
    return size;
  }

  public get imageSource() {
    return require(`../../../../../assets/small_attacking_speed_boat.png`);
  }
}
