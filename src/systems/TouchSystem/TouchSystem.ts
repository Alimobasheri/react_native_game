import { ENTITIES_KEYS } from "@/constants/configs";
import {
  RNGE_Entities,
  RNGE_System_Args,
  RNGE_Time,
  RNGE_Touch_Item,
} from "../types";
import {
  ISea,
  InitiateWaveConfig,
  WaveSource,
} from "@/Game/Entities/Sea/types";
import { ITouchSystem, TouchProps } from "./types";
import {
  MAXIMUM_INITIAL_AMPLITUDE,
  MAXIMUM_INITIAL_FREQUENCY,
  MINIMUM_INITIAL_FREQUENCY,
} from "@/constants/waterConfigs";

export class TouchSystem implements ITouchSystem {
  protected _touchStart: TouchProps | null = null;

  constructor() {}
  systemInstance(
    entities: RNGE_Entities,
    { touches, time }: RNGE_System_Args
  ): RNGE_Entities {
    const sea: ISea = entities[ENTITIES_KEYS.SEA_GROUP].entities["sea"];
    this._captureStartTouches(touches, time);
    this._captureEndTouches(touches, time, sea);
    return entities;
  }
  systemManger(entities: RNGE_Entities, args: RNGE_System_Args): RNGE_Entities {
    const touchSystemInstance: ITouchSystem =
      entities[ENTITIES_KEYS.TOUCH_SYSTEM_INSTANCE];
    return touchSystemInstance.systemInstance(entities, args);
  }
  protected _captureStartTouches(touches: RNGE_Touch_Item[], time: RNGE_Time) {
    touches
      .filter((touch) => touch.type === "start")
      .forEach((touch) => {
        this._touchStart = {
          x: touch.event.pageX,
          y: touch.event.pageY,
          time: time.current,
        };
      });
  }
  protected _captureEndTouches(
    touches: RNGE_Touch_Item[],
    time: RNGE_Time,
    sea: ISea
  ) {
    touches
      .filter((t) => t.type === "end")
      .forEach((t) => {
        if (this._touchStart) {
          const endTouch: TouchProps = {
            x: t.event.pageX,
            y: t.event.pageY,
            time: time.current,
          };
          const waveConfig: InitiateWaveConfig | null =
            this.createWaveConfigFromSwipe(this._touchStart, endTouch);

          if (!!waveConfig) sea.initiateWave(waveConfig);

          this._touchStart = null;
        }
      });
  }
  protected createWaveConfigFromSwipe(
    startTouch: TouchProps,
    endTouch: TouchProps
  ): InitiateWaveConfig | null {
    const dx = endTouch.x - startTouch.x;
    const dy = endTouch.y - startTouch.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = (endTouch.time - startTouch.time) / 1000;

    if (duration > 0) {
      const speed = distance / duration;
      const amplitude = Math.min(distance, MAXIMUM_INITIAL_AMPLITUDE); // Scale down amplitude
      const frequency = Math.max(
        MAXIMUM_INITIAL_FREQUENCY,
        Math.min(MINIMUM_INITIAL_FREQUENCY, speed / 500)
      ); // Scale frequency to a reasonable range
      const config: InitiateWaveConfig = {
        x: endTouch.x,
        amplitude,
        frequency,
        phase: 2,
        source: WaveSource.TOUCH,
      };
      return config;
    } else return null;
  }
}
