import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";
import { Entities } from "./Entities";
import { RNGE_System_Args } from "@/systems/types";

export type system = (entities: Entities, args: RNGE_System_Args) => void;

export class Systems extends EventEmitter {
  protected _systems: system[] = [];
  constructor() {
    super();
  }

  public addSystem(system: system) {
    this._systems.push(system);
  }

  public update(entities: Entities, args: RNGE_System_Args) {
    for (const system of this._systems) {
      system(entities, args);
    }
  }
}
