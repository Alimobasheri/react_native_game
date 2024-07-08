import { ENTITIES_KEYS } from "@/constants/configs";
import { IShipSystem } from "./types";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { IShip } from "@/Game/Entities/Ship/types";
import { Ship } from "@/Game/Entities/Ship/Ship";

/**
 * The ship system is responsible for keeping the main sheep stable.
 * Clamp physic features and display correct visuals to keep the s
 */
export class ShipSystem implements IShipSystem {
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    const ship: Ship = entities[ENTITIES_KEYS.SEA_GROUP].entities["ship"];
    ship.update(entities, args);
    ship.removeAllListeners("isSinkedChange");
    ship.addListener("isSinkedChange", (isSinked) => {
      if (isSinked) {
        args.dispatch("shipSinked");
      }
    });
    return entities;
  }
  systemManger(entities: RNGE_Entities, args: RNGE_System_Args) {
    const shipSystem: ShipSystem = entities[ENTITIES_KEYS.SHIP_SYSTEM_INSTANCE];
    return shipSystem.systemInstance(entities, args);
  }
}
