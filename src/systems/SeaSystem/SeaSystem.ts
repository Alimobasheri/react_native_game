import { ENTITIES_KEYS } from "@/constants/configs";
import { TouchProps } from "../TouchSystem/types";
import {
  ENGINES,
  RNGE_Entities,
  RNGE_System_Args,
  RNGE_Time,
  RNGE_Touch_Item,
} from "../types";
import { ISeaSystem } from "./types";
import { ISea, WaveSource } from "@/Game/Entities/Sea/types";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { Entity } from "@/containers/ReactNativeSkiaGameEngine";

export class SeaSystem implements ISeaSystem {
  private _engine: ENGINES;
  constructor(engine: ENGINES) {
    this._engine = engine;
  }
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    const sea: ISea = entities[ENTITIES_KEYS.SEA_GROUP].entities["sea"];
    sea.update();
    return entities;
  }
  systemManager(entities: RNGE_Entities, args: RNGE_System_Args) {
    const seaSystem: ISeaSystem = entities[ENTITIES_KEYS.SEA_SYSTEM_INSTANCE];
    return seaSystem.systemInstance(entities, args);
  }

  systemInstanceRNSGE(seaEntity: Entity<Sea>, args: RNGE_System_Args) {
    seaEntity.data.update(args.time.delta);
  }
}
