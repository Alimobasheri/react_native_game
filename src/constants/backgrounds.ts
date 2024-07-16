import { MoonConfig } from "@/Game/Entities/BackgroundEntities/Moon/types";

export const DEFAULT_MOON_RADIUS = 40;
export const DEFAULT_MOON_PATH_AMPLITUDE = 100;

export const getDefaultMoonConfig = (
  screenWidth: number,
  screenHeight: number
): MoonConfig => ({
  screenWidth,
  screenHeight,
  radius: DEFAULT_MOON_RADIUS,
  startingCenterX: DEFAULT_MOON_RADIUS,
  startingCenterY: screenHeight / 2 - DEFAULT_MOON_RADIUS / 2,
  moonPathAmplitude: DEFAULT_MOON_PATH_AMPLITUDE,
});
