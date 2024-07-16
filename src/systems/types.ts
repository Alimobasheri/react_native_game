export type RNGE_Touch_Event = {
  pageX: number;
  pageY: number;
};
export type RNGE_Touch_Item = {
  event: RNGE_Touch_Event;
  type: "start" | "end";
};

export type RNGE_Time = {
  current: number;
  previous: number;
  delta: number;
  previousDelta: number;
};

export type RNGE_System_Args = {
  touches: RNGE_Touch_Item[];
  screen: any;
  layout: any;
  events: any[];
  dispatch: any;
  time: RNGE_Time;
};

export type RNGE_Entities = Record<string, any>;

export interface IGameSystem {
  systemInstance: (
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ) => RNGE_Entities;
  systemManager: (
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ) => RNGE_Entities;
}
