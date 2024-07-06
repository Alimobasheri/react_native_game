import { ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { IUISystem } from "./types";
import { ScreenTopUI } from "@/Game/Entities/ScreenTopUI/ScreenTopUI";

export class UISystem implements IUISystem {
  constructor() {}
  public systemInstance(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    return this._update(entities, args);
  }
  public systemManger(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    const uiSystem: UISystem = entities[ENTITIES_KEYS.UI_SYSTEM_INSTANCE];
    return uiSystem.systemInstance(entities, args);
  }

  protected _update(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): RNGE_Entities {
    const screenTopUI: ScreenTopUI = entities[ENTITIES_KEYS.SCREEN_TOP_UI];
    const boatSinkEvents = args.events.filter(
      (event) => event === "boatSinked"
    );
    if (boatSinkEvents.length > 0) {
      screenTopUI.boatsDestroyed += boatSinkEvents.length;
    }
    return entities;
  }
}
