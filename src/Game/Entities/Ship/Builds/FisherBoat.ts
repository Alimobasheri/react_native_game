import { Ship } from '../Ship';
import { commonShipBuildsConfig } from '../types';

export class FisherBoat extends Ship {
  protected _shipRatio = 512 / 512;
  protected _windowWidth: number;

  constructor(config: commonShipBuildsConfig) {
    super({ ...config, label: 'fisherboat' });
    this._windowWidth = config.windowWidth;
    this.initialize();
  }
  getSize(): number[] {
    return [this._windowWidth * 0.1, this._windowWidth * 0.1 * this._shipRatio];
  }
  public getPosition(): number[] {
    const size = this.getSize();
    return [this._x - size[0] / 2, this._y - size[1] / 2];
  }
}
