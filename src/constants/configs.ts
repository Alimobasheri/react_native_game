import { SeaConfig } from "@/Game/Entities/Sea/types";
import { WATER_GRADIENT_COLORS } from "./waterConfigs";

export const TRAIL_FADE_DURATION = 1000;

export enum ENTITIES_KEYS {
  STARS = "stars",
  MOON = "moon",
  CLOUDS = "clouds",
  SEA = "sea",
  SHIP = "ship",
  BOAT_LABEL = "boat_",
  SEA_GROUP = "sea_group",
  MOUNTAIN_BACKGROUND = "mountain_background",
  GAME_LOOP_SYSTEM = "game_loop_system",
  TOUCH_SYSTEM_INSTANCE = "touch_system_instance",
  BACKGROUND_SYSTEM_INSTANCE = "background_system_instance",
  SEA_SYSTEM_INSTANCE = "sea_system_instance",
  SHIP_SYSTEM_INSTANCE = "ship_system_instance",
  PHYSICS_SYSTEM_INSTANCE = "physics_system_instance",
  COLLISIONS_SYSTEM_INSTANCE = "collisions_system_instanc",
  BOAT_SYSTEM_INSTANCE = "boat_system_instance",
  UI_SYSTEM_INSTANCE = "ui_system_instance",
  SCREEN_TOP_UI = "screen_top_ui",
}

export const VEHICLES_GROUP = "vehicles";
export const BUOYANTS_GROUP = "buoyants";

export function getSeaConfigDefaults(
  windowWidth: number,
  windowHeight: number
): SeaConfig {
  const width = windowWidth * 1.2;
  return {
    x: width / 2,
    y: windowHeight * 0.7,
    width: width,
    height: windowHeight * 0.3,
    layersCount: 3,
    mainLayerIndex: 1,
    gradientColors: WATER_GRADIENT_COLORS[0],
  };
}

export enum DIRECTION {
  UP = "up",
  DOWN = "down",
  LEFT = "left",
  RIGHT = "right",
}
