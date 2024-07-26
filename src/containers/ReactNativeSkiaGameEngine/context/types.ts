import { MutableRefObject } from "react";
import { Entities, EventDispatcher, Frames, Systems } from "../services";

export interface IRNSGEContextValue {
  entities: MutableRefObject<Entities>;
  systems: MutableRefObject<Systems>;
  frames: MutableRefObject<Frames>;
  dispatcher: MutableRefObject<EventDispatcher>;
}
