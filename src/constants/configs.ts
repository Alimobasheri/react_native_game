import { SeaConfig } from "@/Game/Entities/Sea/types";

export const TRAIL_FADE_DURATION = 1000;

export enum ENTITIES_KEYS {
  SEA = "sea",
  SHIP = "ship",
  BOAT_LABEL = "boat_",
  GAME_LOOP_SYSTEM = "game_loop_system",
  TOUCH_SYSTEM_INSTANCE = "touch_system_instance",
  SEA_SYSTEM_INSTANCE = "sea_system_instance",
  SHIP_SYSTEM_INSTANCE = "ship_system_instance",
  PHYSICS_SYSTEM_INSTANCE = "physics_system_instance",
  COLLISIONS_SYSTEM_INSTANCE = "collisions_system_instanc",
  BOAT_SYSTEM_INSTANCE = "boat_system_instance",
}

export function getSeaConfigDefaults(
  windowWidth: number,
  windowHeight: number
): SeaConfig {
  const width = windowWidth * 1.2;
  return {
    x: width / 2,
    y: windowHeight * 0.8,
    width: width,
    height: windowHeight * 0.2,
  };
}

export enum DIRECTION {
  UP = "up",
  DOWN = "down",
  LEFT = "left",
  RIGHT = "right",
}
