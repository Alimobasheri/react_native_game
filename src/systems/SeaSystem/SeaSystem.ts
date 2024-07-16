import { ENTITIES_KEYS } from "@/constants/configs";
import { TouchProps } from "../TouchSystem/types";
import {
  RNGE_Entities,
  RNGE_System_Args,
  RNGE_Time,
  RNGE_Touch_Item,
} from "../types";
import { ISeaSystem } from "./types";
import { ISea, WaveSource } from "@/Game/Entities/Sea/types";

export class SeaSystem implements ISeaSystem {
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    const sea: ISea = entities[ENTITIES_KEYS.SEA_GROUP].entities["sea"];
    sea.update();
    return entities;
  }
  systemManager(entities: RNGE_Entities, args: RNGE_System_Args) {
    const seaSystem: ISeaSystem = entities[ENTITIES_KEYS.SEA_SYSTEM_INSTANCE];
    return seaSystem.systemInstance(entities, args);
  }
}
