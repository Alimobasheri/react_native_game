import { ENTITIES_KEYS } from "@/constants/configs";
import { IShipSystem } from "./types";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { IShip } from "@/Game/Entities/Ship/types";

/**
 * The ship system is responsible for keeping the main sheep stable.
 * Clamp physic features and display correct visuals to keep the s
 */
export class ShipSystem implements IShipSystem {
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    const ship: IShip = entities[ENTITIES_KEYS.SHIP];
    ship.update(entities, args);
    return entities;
  }
  systemManger(entities: RNGE_Entities, args: RNGE_System_Args) {
    const shipSystem: ShipSystem = entities[ENTITIES_KEYS.SHIP_SYSTEM_INSTANCE];
    return shipSystem.systemInstance(entities, args);
  }
}
