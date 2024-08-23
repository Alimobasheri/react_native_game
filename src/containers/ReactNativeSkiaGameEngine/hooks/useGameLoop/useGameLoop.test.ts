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

describe('useGameLoop', () => {
  let entities: { current: Entities };
  let systems: { current: Systems };
  let dispatcher: { current: EventDispatcher };

  beforeEach(() => {
    entities = { current: new Entities() };
    systems = { current: new Systems() };
    dispatcher = { current: new EventDispatcher() };

    mockRequestAnimationFrame();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });

  test('should initialize frames correctly', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    expect(result.current.frames.current.currentFrame).toBe(0);
  });

  test('should start the game loop and update frames on each iteration', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
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
      useGameLoop(entities, systems, dispatcher)
    );

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(entities.current, {
      events: [],
      dispatch: dispatcher.current,
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
      useGameLoop(entities, systems, dispatcher)
    );

    const mockEvent = { type: 'TEST_EVENT' };

    act(() => {
      dispatcher.current.emitEvent('TEST_EVENT', mockEvent);
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
      useGameLoop(entities, systems, dispatcher)
    );

    expect(addListenerSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });

  test('should handle multiple event emissions within a single frame', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    const mockEvent1 = { type: 'EVENT_1' };
    const mockEvent2 = { type: 'EVENT_2' };

    act(() => {
      dispatcher.current.emitEvent('EVENT_1', mockEvent1);
      dispatcher.current.emitEvent('EVENT_2', mockEvent2);
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
      useGameLoop(entities, systems, dispatcher)
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
    renderHook(() => useGameLoop(entities, systems, dispatcher));

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
  });

  test('should stop the game loop and clean up on unmount', () => {
    const removeListenerSpy = jest.spyOn(
      dispatcher.current,
      'removeListenerToAllEvents'
    );
    const { unmount } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalled();
  });
});
