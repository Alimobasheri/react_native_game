import { Skia, SkPaint, TileMode } from "@shopify/react-native-skia";
import { MoonConfig } from "./types";
import MoonView from "@/components/MoonView";

export class Moon {
  private _screenWidth: number;
  private _screenHeight: number;
  private _startingCenterX: number;
  private _startingCenterY: number;
  private _radius: number;
  private _centerX: number;
  private _centerY: number;
  private _moonPaint: SkPaint;
  private _glowPaint: SkPaint;
  private _moonPathAmplitude: number = 100;
  constructor({
    screenWidth,
    screenHeight,
    radius,
    startingCenterX,
    startingCenterY,
    moonPathAmplitude,
  }: MoonConfig) {
    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    this._radius = radius;
    this._startingCenterX = startingCenterX;
    this._startingCenterY = startingCenterY;
    this._centerX = this._startingCenterX;
    this._centerY = this._startingCenterY;

    this._moonPaint = this._createMoonPaint();
    this._glowPaint = this._createGlowPaint();

    this._moonPathAmplitude = moonPathAmplitude ?? this._moonPathAmplitude;
  }

  public get centerX(): number {
    return this._centerX;
  }

  public get centerY(): number {
    return this._centerY;
  }

  public get radius(): number {
    return this._radius;
  }

  public get moonPaint(): SkPaint {
    return this._moonPaint;
  }

  public get glowPaint(): SkPaint {
    return this._glowPaint;
  }

  public update(speed: number, timeDelta: number) {
    this._centerX = this.centerX + speed * timeDelta;
    this._centerY =
      this._startingCenterY -
      this._moonPathAmplitude *
        Math.sin((this._centerX / this._screenWidth) * Math.PI);
    this._updateMoonPaints();
  }

  private _updateMoonPaints() {
    this._moonPaint = this._createMoonPaint();
    this._glowPaint = this._createGlowPaint();
  }

  private _createMoonPaint(): SkPaint {
    const moonShader = Skia.Shader.MakeRadialGradient(
      { x: this._centerX, y: this._centerY },
      this._radius,
      [Skia.Color("#B0C4DE"), Skia.Color("#FFFFFF")],
      [0, 1],
      TileMode.Clamp
    );

    const moonPaint = Skia.Paint();
    moonPaint.setShader(moonShader);
    moonPaint.setAntiAlias(true);

    return moonPaint;
  }

  private _createGlowPaint(): SkPaint {
    const glowShader = Skia.Shader.MakeRadialGradient(
      { x: this._centerX, y: this._centerY },
      this._radius,
      [Skia.Color("#FFFFFF00"), Skia.Color("#F0E68C")],
      [0.85, 1],
      TileMode.Clamp
    );

    const glowPaint = Skia.Paint();
    glowPaint.setShader(glowShader);
    glowPaint.setAntiAlias(true);

    return glowPaint;
  }

  renderer = MoonView;
}
