import { renderHook, act } from '@testing-library/react-native';
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

describe('useGameLoop', () => {
  let entities: { current: Entities };
  let systems: { current: Systems };
  let dispatcher: { current: EventDispatcher };

  beforeEach(() => {
    entities = { current: new Entities() };
    systems = { current: new Systems() };
    dispatcher = { current: new EventDispatcher() };

    mockRequestAnimationFrame();

    // @ts-ignore
    global.nativePerformanceNow = jest.fn(() => 0);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });

  test('should initialize frames correctly', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, {})
    );

    expect(result.current.frames.current.currentFrame).toBe(0);
  });

  test('should start the game loop and update frames on each iteration', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, {})
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
      useGameLoop(entities, systems, dispatcher, {})
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
      useGameLoop(entities, systems, dispatcher, {})
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
      useGameLoop(entities, systems, dispatcher, {})
    );

    expect(addListenerSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });

  test('should handle multiple event emissions within a single frame', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, {})
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
      useGameLoop(entities, systems, dispatcher, {})
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
    renderHook(() => useGameLoop(entities, systems, dispatcher, {}));

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
  });

  test('should stop the game loop and clean up on unmount', () => {
    const removeListenerSpy = jest.spyOn(
      dispatcher.current,
      'removeListenerToAllEvents'
    );
    const { unmount } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, {})
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
      useGameLoop(entities, systems, dispatcher, onEventListeners)
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
      useGameLoop(entities, systems, dispatcher, onEventListeners)
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
      useGameLoop(entities, systems, dispatcher, onEventListeners)
    );

    act(() => {
      dispatcher.current.emitEvent(mockEvent);
      advanceTime(16.7);
    });

    expect(mockListener).not.toHaveBeenCalled();
  });

  test('should start the game loop if initialRunning is true', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher, {}, { initialRunning: true })
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
      useGameLoop(entities, systems, dispatcher, {}, { initialRunning: false })
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
      useGameLoop(entities, systems, dispatcher, {}, { initialRunning: false })
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
      useGameLoop(entities, systems, dispatcher, {}, { initialRunning: true })
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
});
