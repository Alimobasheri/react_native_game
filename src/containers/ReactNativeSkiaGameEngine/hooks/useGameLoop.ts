import { MutableRefObject, useEffect, useRef } from "react";
import { Entities } from "../services/Entities";
import { Systems } from "../services/Systems";
import { Frames } from "../services/Frames";
import { EventDispatcher } from "../services";

export function useGameLoop(
  entities: MutableRefObject<Entities>,
  systems: MutableRefObject<Systems>,
  dispatcher: MutableRefObject<EventDispatcher>
) {
  const frames = useRef<Frames>(new Frames());
  const events = useRef<string[]>([]);

  useEffect(() => {
    const listener = dispatcher.current.addListenerToAllEvents((data) => {
      events.current.push(data);
    });
    const update = (deltaTime: number, now: number, then: number) => {
      systems.current.update(entities.current, {
        events: events.current,
        dispatch: dispatcher.current.emit,
        time: { delta: deltaTime, current: now, previous: then },
      });
      events.current = [];
      frames.current.updateFrame(60, deltaTime);
    };

    const gameLoop = (now: number, then: number) => {
      const deltaTime = now - then; // for 60fps
      update(deltaTime, now, then);
      requestAnimationFrame((nextTime) => gameLoop(nextTime, now));
    };

    requestAnimationFrame((nextTime) => gameLoop(nextTime, nextTime));

    return () => {
      dispatcher.current.removeListenerToAllEvents(listener);
    };
  }, []);

  return { frames };
}
