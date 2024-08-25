import { MutableRefObject, useEffect, useRef } from 'react';
import { Entities } from '../../services/Entities';
import { Systems } from '../../services/Systems';
import { Frames } from '../../services/Frames';
import { EventDispatcher } from '../../services';

/**
 * A React hook that manages the game loop, responsible for updating entities and systems
 * on each frame. The hook integrates with the `requestAnimationFrame` API to provide a smooth
 * update loop running at approximately 60 frames per second (or based on actual frame timing).
 *
 * @param {MutableRefObject<Entities>} entities - A reference to the Entities instance managing all game entities.
 * @param {MutableRefObject<Systems>} systems - A reference to the Systems instance managing all game systems.
 * @param {MutableRefObject<EventDispatcher>} dispatcher - A reference to the EventDispatcher instance for handling events.
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
  dispatcher: MutableRefObject<EventDispatcher>
) {
  const frames = useRef<Frames>(new Frames());
  const events = useRef<string[]>([]);

  useEffect(() => {
    const globalStartTime = global.nativePerformanceNow();
    // Add a listener to capture all events dispatched during the game loop
    const listener = dispatcher.current.addListenerToAllEvents((data) => {
      events.current.push(data);
    });

    // Update function that runs on every frame
    const update = (deltaTime: number, now: number, then: number) => {
      systems.current.update(entities.current, {
        events: events.current,
        dispatch: dispatcher.current,
        time: {
          delta: deltaTime,
          current: now,
          previous: then,
          globalStartTime,
        },
        touches: [],
        screen: {},
        layout: {},
      });
      events.current = []; // Clear events after processing
      frames.current.updateFrame(60, deltaTime); // Update the frame counter
    };

    // Game loop function driven by requestAnimationFrame
    const gameLoop = (now: number, then: number) => {
      const deltaTime = now - then; // Calculate time difference between frames
      update(deltaTime, now, then); // Run the update
      requestAnimationFrame((nextTime) => gameLoop(nextTime, now)); // Loop
    };

    // Start the game loop
    requestAnimationFrame((nextTime) => gameLoop(nextTime, nextTime));

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      dispatcher.current.removeListenerToAllEvents(listener);
    };
  }, [entities, systems, dispatcher]);

  return { frames };
}
