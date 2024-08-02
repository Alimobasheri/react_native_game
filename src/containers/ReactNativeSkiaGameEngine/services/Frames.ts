import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

export const FrameUpdateEvent = "FrameUpdateEvent";

export class Frames extends EventEmitter {
  private _currentFrame: number = 0;

  constructor() {
    super();
  }

  public get currentFrame(): number {
    return this._currentFrame;
  }

  public updateFrame(fps: number, delta: number) {
    this._currentFrame += Math.floor(1 / fps / delta);
    this.emit(FrameUpdateEvent, delta);
  }
}
