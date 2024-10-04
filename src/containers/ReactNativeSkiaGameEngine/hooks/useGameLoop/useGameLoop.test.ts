import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGameLoop } from './useGameLoop';
import { Entities } from '../../services/Entities';
import { Systems } from '../../services/Systems';
import { EventDispatcher } from '../../services/EventDispatcher';
import {
  advanceTime,
  mockRequestAnimationFrame,
  resetTestTimers,
} from '../../utils/testUtils';
import { GameEvent } from '../../types/Events';
import Animations, { Animation } from '../../services/Animations';
import { runOnJS, runOnUI } from 'react-native-reanimated';

jest.mock('react-native-reanimated', () => {
  return {
    ...jest.requireActual('react-native-reanimated'),
    runOnUI: jest.fn((fn) => fn),
  };
});

describe('useGameLoop', () => {
  let entities: { current: Entities };
  let systems: { current: Systems };
  let dispatcher: { current: EventDispatcher };
  let animations: { current: Animations };

  beforeEach(() => {
    entities = { current: new Entities() };
    systems = { current: new Systems() };
    dispatcher = { current: new EventDispatcher() };
    animations = { current: new Animations() };

    mockRequestAnimationFrame();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });

  test('should initialize frames correctly', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    expect(result.current.frames.current.currentFrame).toBe(0);
  });

  test('should start the game loop and update frames on each iteration', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    // Simulate the first frame
    act(() => {
      advanceTime(1000 / 60);
    });

    expect(result.current.frames.current.currentFrame).toBe(0);

    // Simulate the second frame
    act(() => {
      advanceTime(1000 / 60);
    });

    expect(result.current.frames.current.currentFrame).toBe(1);
  });

  test('should call system update with correct parameters on each loop iteration', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(entities.current, {
      events: [],
      dispatcher: dispatcher.current,
      time: expect.objectContaining({
        delta: expect.any(Number),
        current: expect.any(Number),
        previous: expect.any(Number),
      }),
      touches: [],
      screen: {},
      layout: {},
    });

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  test('should correctly accumulate and clear events between frames', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    const mockEvent: GameEvent = { type: 'TEST_EVENT' };

    act(() => {
      dispatcher.current.emitEvent(mockEvent);
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        events: [mockEvent],
      })
    );

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(systems.current.update).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        events: [],
      })
    );
  });

  test('should register and unregister event listeners correctly', () => {
    const addListenerSpy = jest.spyOn(
      dispatcher.current,
      'addListenerToAllEvents'
    );
    const removeListenerSpy = jest.spyOn(
      dispatcher.current,
      'removeListenerToAllEvents'
    );

    const { unmount } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    expect(addListenerSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });

  test('should handle multiple event emissions within a single frame', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    const mockEvent1 = { type: 'EVENT_1' };
    const mockEvent2 = { type: 'EVENT_2' };

    act(() => {
      dispatcher.current.emitEvent(mockEvent1);
      dispatcher.current.emitEvent(mockEvent2);
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        events: [mockEvent1, mockEvent2],
      })
    );
  });

  test('should correctly calculate deltaTime and update time in system', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        time: expect.objectContaining({
          delta: expect.closeTo(16.7, 2),
          current: expect.any(Number),
          previous: expect.any(Number),
        }),
      })
    );
  });

  test('should start the game loop correctly on mount', () => {
    const requestAnimationFrameSpy = jest.spyOn(
      window,
      'requestAnimationFrame'
    );
    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
  });

  test('should stop the game loop and clean up on unmount', () => {
    const removeListenerSpy = jest.spyOn(
      dispatcher.current,
      'removeListenerToAllEvents'
    );
    const { unmount } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalled();
  });

  test('should handle onEventListeners correctly', () => {
    const mockListener = jest.fn();
    const mockEvent: GameEvent = { type: 'TestEvent', data: { key: 'value' } };

    const onEventListeners = {
      TestEvent: mockListener,
    };

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, onEventListeners)
    );

    act(() => {
      dispatcher.current.emitEvent(mockEvent);
      advanceTime(16.7);
    });

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(mockEvent);
  });

  test('should process multiple events and clear them after update', () => {
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();

    const mockEvent1: GameEvent = { type: 'Event1', data: { key: 'value1' } };
    const mockEvent2: GameEvent = { type: 'Event2', data: { key: 'value2' } };

    const onEventListeners = {
      Event1: mockListener1,
      Event2: mockListener2,
    };

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, onEventListeners)
    );

    act(() => {
      dispatcher.current.emitEvent(mockEvent1);
      dispatcher.current.emitEvent(mockEvent2);
      advanceTime(16.7);
    });

    expect(mockListener1).toHaveBeenCalledTimes(1);
    expect(mockListener1).toHaveBeenCalledWith(mockEvent1);
    expect(mockListener2).toHaveBeenCalledTimes(1);
    expect(mockListener2).toHaveBeenCalledWith(mockEvent2);
  });

  test('should not call listeners for events not present in onEventListeners', () => {
    const mockListener = jest.fn();
    const mockEvent: GameEvent = { type: 'TestEvent', data: { key: 'value' } };

    const onEventListeners = {
      DifferentEvent: mockListener,
    };

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, onEventListeners)
    );

    act(() => {
      dispatcher.current.emitEvent(mockEvent);
      advanceTime(16.7);
    });

    expect(mockListener).not.toHaveBeenCalled();
  });

  test('should start the game loop if initialRunning is true', () => {
    const { result } = renderHook(() =>
      useGameLoop(
        entities,
        systems,
        dispatcher,
        animations,
        {},
        { initialRunning: true }
      )
    );

    // Initially, the frame count should be 0
    expect(result.current.frames.current.currentFrame).toBe(0);

    // Simulate time passing for several frames
    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
      advanceTime(16.7);
    });

    // Expect the frame count to have advanced (e.g., to 2)
    expect(result.current.frames.current.currentFrame).toBe(2);
  });

  test('should not start the game loop if initialRunning is false', () => {
    const { result } = renderHook(() =>
      useGameLoop(
        entities,
        systems,
        dispatcher,
        animations,
        {},
        { initialRunning: false }
      )
    );

    // Initially, the frame count should be 0
    expect(result.current.frames.current.currentFrame).toBe(0);

    // Simulate time passing for several frames
    act(() => {
      advanceTime(16.7); // Simulate three frames
      advanceTime(16.7);
      advanceTime(16.7);
    });

    // The frame count should still be 0 because the loop has not started
    expect(result.current.frames.current.currentFrame).toBe(0);

    // Start the game loop manually
    act(() => {
      result.current.start();
    });

    // Simulate more time passing
    act(() => {
      advanceTime(16.7); // Simulate three more frames
      advanceTime(16.7);
      advanceTime(16.7);
    });

    // Now the frame count should have advanced
    expect(result.current.frames.current.currentFrame).toBe(3);
  });

  test('should start the game loop when start is called', () => {
    const { result } = renderHook(() =>
      useGameLoop(
        entities,
        systems,
        dispatcher,
        animations,
        {},
        { initialRunning: false }
      )
    );

    // Initially, the frame count should be 0
    expect(result.current.frames.current.currentFrame).toBe(0);

    // Simulate time passing without starting the loop
    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
      advanceTime(16.7); // Simulate a third frame
    });

    // Frame count should still be 0 since the loop hasn't started
    expect(result.current.frames.current.currentFrame).toBe(0);

    // Now start the game loop
    act(() => {
      result.current.start();
    });

    // Simulate more time passing
    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
      advanceTime(16.7); // Simulate a third frame
    });

    // Now the frame count should have advanced
    expect(result.current.frames.current.currentFrame).toBe(3);
  });

  test('should stop the game loop when stop is called', () => {
    const { result } = renderHook(() =>
      useGameLoop(
        entities,
        systems,
        dispatcher,
        animations,
        {},
        { initialRunning: true }
      )
    );

    // Initially, the frame count should be 0
    expect(result.current.frames.current.currentFrame).toBe(0);

    // Simulate time passing to advance frames
    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
      advanceTime(16.7);
    });

    // Frame count should have advanced
    expect(result.current.frames.current.currentFrame).toBe(2);

    // Now stop the game loop
    act(() => {
      result.current.stop();
    });

    // Simulate more time passing
    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
      advanceTime(16.7);
    });

    // Frame count should not have changed after stopping
    expect(result.current.frames.current.currentFrame).toBe(2);
  });

  test('should trigger animations update on each frame', () => {
    const spyUpdateAnimations = jest.spyOn(
      animations.current,
      'updateAnimations'
    );

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(1000 / 60); // Simulate a frame
    });

    expect(spyUpdateAnimations).toHaveBeenCalledTimes(1);

    act(() => {
      advanceTime(1000 / 60); // Simulate another frame
    });

    expect(spyUpdateAnimations).toHaveBeenCalledTimes(2);
  });

  test('should pause animations when stopped and resume when started', () => {
    const spyUpdateAnimations = jest.spyOn(
      animations.current,
      'updateAnimations'
    );

    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(1000 / 60); // Simulate first frame
    });
    expect(spyUpdateAnimations).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stop();
      advanceTime(1000 / 60); // Simulate another frame
    });
    expect(spyUpdateAnimations).toHaveBeenCalledTimes(1); // Should not update since loop is stopped

    act(() => {
      result.current.start();
      advanceTime(1000 / 60); // Simulate another frame
    });
    expect(spyUpdateAnimations).toHaveBeenCalledTimes(2); // Should update after resuming
  });

  test('should update animation progress based on time', async () => {
    const sharedValue = { value: 0 };
    const mockAnimation: Animation = {
      update: jest.fn(
        (now, sharedValue, progress, isBackward, onAnimateDone) => {
          'worklet';
          sharedValue.value = progress * 100;
          const done = progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };

    const { rerender } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    const config = { duration: 500 };
    animations.current.registerAnimation(sharedValue, mockAnimation, config);

    advanceTime(250); // Halfway through animation
    act(() => {
      rerender({});
    });

    expect(mockAnimation.update).toHaveBeenCalled();

    await waitFor(() => {
      expect(sharedValue.value).toBe(50); // Animation is halfway
    });

    act(() => {
      advanceTime(250); // Complete the animation
    });

    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Animation completed
    });
  });

  test('should handle looping animations', async () => {
    const sharedValue = { value: 0 };
    const mockAnimation = {
      update: jest.fn(
        (now, sharedValue, progress, isBackward, onAnimateDone) => {
          'worklet';
          sharedValue.value = progress * 100;
          const done = progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };

    const config = { duration: 500, loop: 2 };
    animations.current.registerAnimation(sharedValue, mockAnimation, config);

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(500); // First loop completes
    });
    await waitFor(() => {
      expect(sharedValue.value).toBe(100);
    });

    act(() => {
      advanceTime(500); // Second loop completes
    });
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // End of second loop
    });
  });

  test('should handle infinite looping animations', async () => {
    const sharedValue = { value: 0 };
    const mockAnimation = {
      update: jest.fn(
        (now, sharedValue, progress, isBackward, onAnimateDone) => {
          'worklet';
          sharedValue.value = progress * 100;
          const done = progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };

    const config = { duration: 500, loop: -1 };
    animations.current.registerAnimation(sharedValue, mockAnimation, config);

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    for (let i = 0; i < 5; i++) {
      act(() => {
        advanceTime(500); // Keep looping infinitely
      });
      await waitFor(() => {
        expect(sharedValue.value).toBe(100); // Each loop should complete
      });
    }
  });

  test('should stop and remove animations upon completion if configured', () => {
    const sharedValue = { value: 0 };
    const mockAnimation = {
      update: jest.fn(
        (now, sharedValue, progress, isBackward, onAnimateDone) => {
          sharedValue.value = progress * 100;
          const done = progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };

    const config = { duration: 500, removeOnComplete: true };
    animations.current.registerAnimation(sharedValue, mockAnimation, config);

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(500); // Animation completes
    });

    expect(
      animations.current.getAnimationById('unique-id-mock1')
    ).toBeUndefined(); // Should be removed
  });

  test('should retain final value after completion if retainFinalValue is true', async () => {
    const sharedValue = { value: 0 };
    const mockAnimation = {
      update: jest.fn(
        (now, sharedValue, progress, isBackward, onAnimateDone) => {
          sharedValue.value = progress * 100;
          const done = progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };

    const config = { duration: 500, retainFinalValue: true };
    animations.current.registerAnimation(sharedValue, mockAnimation, config);

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(500); // Animation completes
    });

    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Final value retained
    });
  });

  test('should handle yoyo animations correctly', async () => {
    const sharedValue = { value: 0 };
    const mockAnimation = {
      update: jest.fn(
        (now, sharedValue, progress, isBackward, onAnimateDone) => {
          sharedValue.value = progress * 100;
          const done = isBackward ? progress <= 0 : progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };

    const config = { duration: 500, loop: 2, yoyo: true };
    animations.current.registerAnimation(sharedValue, mockAnimation, config);

    renderHook(() =>
      useGameLoop(entities, systems, dispatcher, animations, {})
    );

    act(() => {
      advanceTime(500); // First forward pass
    });
    await waitFor(() => {
      expect(sharedValue.value).toBe(100);
    });

    act(() => {
      advanceTime(500); // First backward pass
    });
    await waitFor(() => {
      expect(sharedValue.value).toBe(0);
    });

    act(() => {
      advanceTime(500); // Second forward pass
    });
    await waitFor(() => {
      expect(sharedValue.value).toBe(100);
    });
  });
});
