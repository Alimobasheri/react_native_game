import { ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { IBackgroundSystem } from "./types";
import { MountainBackground } from "@/Game/Entities/MountainBackground/MountainBackground";
import { Moon } from "@/Game/Entities/BackgroundEntities/Moon/Moon";

export class BackgroundSystem implements IBackgroundSystem {
  constructor() {}

  public systemInstance(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    return this.update(entities, args);
  }

  public systemManager(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    const backgroundSystem: BackgroundSystem =
      entities[ENTITIES_KEYS.BACKGROUND_SYSTEM_INSTANCE];
    return backgroundSystem.systemInstance(entities, args);
  }

  private update(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    const moon: Moon = entities[ENTITIES_KEYS.MOON];
    const mountainBackground: MountainBackground =
      entities[ENTITIES_KEYS.MOUNTAIN_BACKGROUND];

    moon.update(0.0005, args.time.delta);
    mountainBackground.update(0.005, args.time.delta);

    return entities;
  }
}
