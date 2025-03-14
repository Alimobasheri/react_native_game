import { renderHook } from '@testing-library/react-native';
import { useDispatcher } from './useDispatcher';
import { EventDispatcher } from '../../services';
import { GameEvent } from '../../types/Events';

describe('useDispatcher', () => {
  test('should return a reference to an EventDispatcher instance', () => {
    const { result } = renderHook(() => useDispatcher());

    // Ensure that the returned value is a ref object with a current property of type EventDispatcher
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeInstanceOf(EventDispatcher);
  });

  test('should provide a stable EventDispatcher instance across renders', () => {
    const { result, rerender } = renderHook(() => useDispatcher());

    // Capture the initial instance of EventDispatcher
    const initialDispatcherInstance = result.current.current;

    // Re-render the component and check that the EventDispatcher instance is the same
    rerender({});

    expect(result.current.current).toBe(initialDispatcherInstance);
  });

  test('should allow dispatching events using the EventDispatcher instance', () => {
    const { result } = renderHook(() => useDispatcher());

    const dispatcher = result.current.current;
    const mockListener = jest.fn();

    // Add a listener to the dispatcher
    dispatcher.addListener('TestEvent', mockListener);

    const testEvent: GameEvent = { type: 'TestEvent', data: { key: 'value' } };

    // Dispatch an event
    dispatcher.emitEvent(testEvent);

    // The listener should have been called with the correct event data
    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(testEvent);
  });

  test('should allow adding and removing global listeners using EventDispatcher', () => {
    const { result } = renderHook(() => useDispatcher());

    const dispatcher = result.current.current;
    const mockGlobalListener = jest.fn();

    // Add a global listener
    const listenerId = dispatcher.addListenerToAllEvents(mockGlobalListener);

    const anotherEventOne: GameEvent = {
      type: 'AnotherEvent',
      data: { foo: 'bar' },
    };

    const anotherEventtwo: GameEvent = {
      type: 'AnotherEvent',
      data: { foo: 'baz' },
    };

    // Dispatch an event
    dispatcher.emitEvent(anotherEventOne);

    // The global listener should have been called with the event data
    expect(mockGlobalListener).toHaveBeenCalledTimes(1);
    expect(mockGlobalListener).toHaveBeenCalledWith(anotherEventOne);

    // Remove the global listener
    dispatcher.removeListenerToAllEvents(listenerId);

    // Dispatch another event
    dispatcher.emitEvent(anotherEventtwo);

    // The global listener should not be called again
    expect(mockGlobalListener).toHaveBeenCalledTimes(1); // Still 1, as it was removed
  });

  test('should return different EventDispatcher instances for multiple hook calls', () => {
    const { result: result1 } = renderHook(() => useDispatcher());
    const { result: result2 } = renderHook(() => useDispatcher());

    // The instances returned by the two hooks should be different
    expect(result1.current.current).not.toBe(result2.current.current);
  });
});
