import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { Entities } from '../../services/Entities';
import { Systems } from '../../services/Systems';
import { Frames } from '../../services/Frames';
import { EventDispatcher } from '../../services';
import { OnEventListeners } from '../../types/Events';
import Animations from '../../services/Animations';
import { runOnUI } from 'react-native-reanimated';
import { RNGE_System_Args } from '@/systems/types';

/**
 * Options for the useGameLoop hook
 * @property {boolean} [initialRunning=true] whether the game loop should be running initially
 */
export type UseGameLoopOptions = {
  initialRunning?: boolean;
};

/**
 * Default options for the useGameLoop hook
 */
export const DEFAULT_USE_GAME_LOOP_OPTIONS: UseGameLoopOptions = {
  initialRunning: true,
};

/**
 * A React hook that manages the game loop, responsible for updating entities and systems
 * on each frame. The hook integrates with the `requestAnimationFrame` API to provide a smooth
 * update loop running at approximately 60 frames per second (or based on actual frame timing).
 *
 * @param {MutableRefObject<Entities>} entities - A reference to the Entities instance managing all game entities.
 * @param {MutableRefObject<Systems>} systems - A reference to the Systems instance managing all game systems.
 * @param {MutableRefObject<EventDispatcher>} dispatcher - A reference to the EventDispatcher instance for handling events.
 * @param {MutableRefObject<Animations>} animations - A reference to the Animations instance managing all game animations.
 * @param {OnEventListeners} onEventListeners - An object containing event listeners to be added to the dispatcher.
 * @param {UseGameLoopOptions} [options={}] - Options for the useGameLoop hook.
 *
 * @returns {{
 *   frames: MutableRefObject<Frames>
 * }} - An object containing a reference to the `Frames` instance, which tracks the frame updates.
 *
 * @example
 * const { frames } = useGameLoop(entitiesRef, systemsRef, dispatcherRef);
 *
 * // Access the current frame number:
 * const currentFrame = frames.current.currentFrame;
 */
export function useGameLoop(
  entities: MutableRefObject<Entities>,
  systems: MutableRefObject<Systems>,
  dispatcher: MutableRefObject<EventDispatcher>,
  animations: MutableRefObject<Animations>,
  onEventListeners: OnEventListeners,
  options: UseGameLoopOptions = DEFAULT_USE_GAME_LOOP_OPTIONS
) {
  const frames = useRef<Frames>(new Frames());
  const events = useRef<any[]>([]);

  const running = useRef<boolean>(options.initialRunning ?? false);

  const update = useCallback((deltaTime: number, now: number, then: number) => {
    if (running.current) {
      const args: RNGE_System_Args = {
        events: events.current,
        dispatcher: dispatcher.current,
        time: {
          delta: deltaTime,
          current: now,
          previous: then,
        },
        touches: [],
        screen: {},
        layout: {},
      };
      systems.current.update(entities.current, args);

      animations.current.updateAnimations({ now });
      events.current.forEach((event) => {
        if (onEventListeners && onEventListeners[event.type]) {
          onEventListeners[event.type](event);
        }
      });

      events.current = [];
      frames.current.updateFrame(60, deltaTime);
    }
  }, []);

  const gameLoop = useCallback((now: number, then: number) => {
    const deltaTime = now - then; // Calculate time difference between frames
    const start = global.nativePerformanceNow();
    update(deltaTime, now, then); // Run the update
    const time = global.nativePerformanceNow() - start;
    setTimeout(
      () => requestAnimationFrame((nextTime) => gameLoop(nextTime, now)),
      time < 100 / 60 ? 100 / 60 - time : 0
    ); // Loop
  }, []);

  const start = useCallback(() => {
    if (!running.current) {
      running.current = true;
    }
  }, []);

  const stop = useCallback(() => {
    running.current = false;
  }, []);

  useEffect(() => {
    // Add a listener to capture all events dispatched during the game loop
    const listener = dispatcher.current.addListenerToAllEvents((data) => {
      setTimeout(() => events.current.push(data), 10);
    });

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      dispatcher.current.removeListenerToAllEvents(listener);
    };
  }, [entities, systems, dispatcher]);

  useEffect(() => {
    requestAnimationFrame((nextTime) => gameLoop(nextTime, nextTime));
  }, []);

  return { frames, start, stop };
}
