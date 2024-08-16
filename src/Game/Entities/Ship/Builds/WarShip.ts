import { Ship } from '../Ship';
import { commonShipBuildsConfig } from '../types';

export class WarShip extends Ship {
  protected _shipRatio = 451 / 942;
  protected _windowWidth: number;

  constructor(config: commonShipBuildsConfig) {
    super({ ...config, label: 'warship' });
    this._windowWidth = config.windowWidth;
    this.initialize();
  }
  getSize(): number[] {
    return [this._windowWidth * 0.2, this._windowWidth * 0.2 * this._shipRatio];
  }
  public getPosition(): number[] {
    const size = this.getSize();
    return [this._x - size[0] / 2, this._y - size[1] / 2];
  }
}
