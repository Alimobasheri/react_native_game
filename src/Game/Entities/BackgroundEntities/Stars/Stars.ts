import { StarsView } from "@/components/StarsView";
import { Star, StarsConfig } from "./types";

export class Stars {
  private _screenWidth: number;
  private _screenHeight: number;
  private _stars: Star[] = [];
  constructor({ screenWidth, screenHeight, initialStarsCount }: StarsConfig) {
    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    this._stars = this.generateStars(initialStarsCount);
  }

  public get stars(): Star[] {
    return this._stars;
  }

  public generateStars = (count: number): Star[] => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this._screenWidth;
      const y = Math.random() * this._screenHeight * 0.2;
      const radius =
        Math.random() < 0.8 ? Math.random() * 1 : Math.random() * 1 + 1;
      stars.push({ x, y, radius });
    }
    return stars;
  };

  renderer = StarsView;
}
