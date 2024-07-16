import { Skia, SkPaint, TileMode } from "@shopify/react-native-skia";
import { Cloud, CloudsConfig } from "./types";
import CloudsView from "@/components/CloudsView";

export class Clouds {
  private _screenWidth: number;
  private _screenHeight: number;
  private _clouds: Cloud[] = [];

  constructor({ screenWidth, screenHeight }: CloudsConfig) {
    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    this._clouds = this.generateClouds(10);
  }

  public get clouds(): Cloud[] {
    return this._clouds;
  }

  public createGradientPaint = (
    x: number,
    y: number,
    width: number,
    height: number
  ): SkPaint => {
    const paint = Skia.Paint();
    const shader = Skia.Shader.MakeLinearGradient(
      { x, y },
      { x: x, y: y + height },
      [
        Skia.Color("rgba(255, 255, 255, 0.5)"),
        Skia.Color("rgba(255, 255, 255, 0.5)"),
        Skia.Color("rgba(169, 169, 169, 0.2)"),
        Skia.Color("rgba(169, 169, 169, 0.2)"),
      ],
      [0, y + height / 2, y + height / 2, y + height],
      TileMode.Clamp
    );
    paint.setShader(shader);
    return paint;
  };

  public generateClouds = (count: number): Cloud[] => {
    const clouds = [];
    for (let i = 0; i < count; i++) {
      const width =
        Math.random() * (this._screenWidth * 0.1) + this._screenWidth * 0.05; // Random width
      const height = width * 0.33;
      const x = Math.random() * this._screenWidth * 2; // Random X position
      const y = Math.random() * (this._screenHeight * 0.3); // Random Y position (upper half of the screen)

      clouds.push({
        id: i,
        x,
        y,
        width,
        height,
        paint: this.createGradientPaint(x, y, width, height),
      });
    }
    return clouds;
  };

  update(speed: number, timeDelta: number): void {
    let cloudsToRemove: number[] = [];
    let newClouds: Cloud[] = [];

    this._clouds.forEach((cloud, index) => {
      cloud.x -= speed * timeDelta;

      if (cloud.x + cloud.width < 0) {
        cloudsToRemove.push(index);
        const newCloud = this.generateClouds(1)[0];
        newCloud.x =
          this._screenWidth + Math.random() * (this._screenWidth * 0.1);
        newClouds.push(newCloud);
      }
    });

    for (let i = cloudsToRemove.length - 1; i >= 0; i--) {
      this._clouds.splice(cloudsToRemove[i], 1);
    }

    this._clouds.push(...newClouds);
    newClouds = null;
    cloudsToRemove = null;
  }

  renderer = CloudsView;
}
