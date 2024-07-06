import { TopUIView } from "@/components/TopUIView";

export class ScreenTopUI {
  protected _coinsCount: number;
  protected _boatsDestroyed: number;

  constructor(coinsCount: number, boatsDestroyed: number) {
    this._coinsCount = coinsCount;
    this._boatsDestroyed = boatsDestroyed;
  }

  public get coinsCount(): number {
    return this._coinsCount;
  }

  public get boatsDestroyed(): number {
    return this._boatsDestroyed;
  }

  public set boatsDestroyed(value: number) {
    this._boatsDestroyed = value;
  }

  renderer = TopUIView;
}
