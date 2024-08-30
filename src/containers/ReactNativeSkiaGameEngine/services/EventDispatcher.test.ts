import { EventDispatcher } from './EventDispatcher';
import { uid } from './Entity';
import { EmitterSubscription } from 'react-native';
import { GameEvent } from '../types/Events';

let mockUidCounter = 0;

jest.mock('./Entity', () => ({
  uid: jest.fn(() => `mocked-uid-${mockUidCounter++}`),
}));

describe('EventDispatcher', () => {
  let eventDispatcher: EventDispatcher;

  let testEvent: GameEvent = { type: 'TestEvent', data: { key: 'value' } };

  beforeEach(() => {
    eventDispatcher = new EventDispatcher();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockUidCounter = 0; // Reset counter after each test
  });

  test('should emit an event and trigger specific listeners', () => {
    const eventListener = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener);

    eventDispatcher.emitEvent(testEvent);

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledWith(testEvent);
  });

  test('should emit an event and trigger global listeners', () => {
    const globalListener = jest.fn();
    eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.emitEvent(testEvent);

    expect(globalListener).toHaveBeenCalledTimes(1);
    expect(globalListener).toHaveBeenCalledWith(testEvent);
  });

  test('should trigger both specific and global listeners', () => {
    const eventListener = jest.fn();
    const globalListener = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener);
    eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.emitEvent(testEvent);

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(globalListener).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledWith(testEvent);
    expect(globalListener).toHaveBeenCalledWith(testEvent);
  });

  test('should add a global listener and return a unique ID', () => {
    const globalListener = jest.fn();
    const id = eventDispatcher.addListenerToAllEvents(globalListener);

    expect(id).toBe('mocked-uid-0');
    expect(uid).toHaveBeenCalledTimes(1);
    expect(eventDispatcher['_subscribersToAllEvents'].size).toBe(1);
    expect(eventDispatcher['_subscribersToAllEvents'].get(id)).toBe(
      globalListener
    );
  });

  test('should remove a global listener by ID', () => {
    const globalListener = jest.fn();
    const id = eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.removeListenerToAllEvents(id);

    expect(eventDispatcher['_subscribersToAllEvents'].size).toBe(0);
    expect(eventDispatcher['_subscribersToAllEvents'].has(id)).toBe(false);
  });

  test('should not throw error when removing a non-existent global listener', () => {
    expect(() =>
      eventDispatcher.removeListenerToAllEvents('non-existent-id')
    ).not.toThrow();
  });

  test('should handle multiple global listeners correctly', () => {
    const globalListener1 = jest.fn();
    const globalListener2 = jest.fn();
    eventDispatcher.addListenerToAllEvents(globalListener1);
    eventDispatcher.addListenerToAllEvents(globalListener2);

    const mockGlobalEvent: GameEvent = {
      type: 'GlobalTestEvent',
      data: { key: 'value' },
    };

    eventDispatcher.emitEvent(mockGlobalEvent);

    expect(globalListener1).toHaveBeenCalledTimes(1);
    expect(globalListener2).toHaveBeenCalledTimes(1);
    expect(globalListener1).toHaveBeenCalledWith(mockGlobalEvent);
    expect(globalListener2).toHaveBeenCalledWith(mockGlobalEvent);
  });

  test('should handle emitting events without data', () => {
    const eventListener = jest.fn();
    const globalListener = jest.fn();
    eventDispatcher.addListener('NoDataEvent', eventListener);
    eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.emitEvent({ type: 'NoDataEvent' });

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledWith({ type: 'NoDataEvent' });
    expect(globalListener).toHaveBeenCalledTimes(1);
    expect(globalListener).toHaveBeenCalledWith({ type: 'NoDataEvent' });
  });

  test('should return an EmitterSubscription when adding a listener', () => {
    const eventListener = jest.fn();
    const subscription: EmitterSubscription = eventDispatcher.addListener(
      'TestEvent',
      eventListener
    );

    expect(subscription.remove).toBeDefined();
  });

  test('should remove a listener using the EmitterSubscription object', () => {
    const eventListener = jest.fn();
    const subscription = eventDispatcher.addListener(
      'TestEvent',
      eventListener
    );

    subscription.remove();
    eventDispatcher.emitEvent({ type: 'TestEvent', data: { key: 'value' } });

    expect(eventListener).not.toHaveBeenCalled();
  });

  test('should remove all listeners for a specific event', () => {
    const eventListener1 = jest.fn();
    const eventListener2 = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener1);
    eventDispatcher.addListener('TestEvent', eventListener2);

    eventDispatcher.removeAllListenersForEvent('TestEvent');
    eventDispatcher.emitEvent({ type: 'TestEvent', data: { key: 'value' } });

    expect(eventListener1).not.toHaveBeenCalled();
    expect(eventListener2).not.toHaveBeenCalled();
  });

  test('should remove all listeners for a specific event', () => {
    const eventListener1 = jest.fn();
    const eventListener2 = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener1);
    eventDispatcher.addListener('TestEvent', eventListener2);

    eventDispatcher.removeAllListenersForEvent('TestEvent');
    eventDispatcher.emitEvent({ type: 'TestEvent', data: { key: 'value' } });

    expect(eventListener1).not.toHaveBeenCalled();
    expect(eventListener2).not.toHaveBeenCalled();
  });

  test('should allow multiple listeners for the same event and call all of them', () => {
    const eventListener1 = jest.fn();
    const eventListener2 = jest.fn();
    eventDispatcher.addListener('MultiEvent', eventListener1);
    eventDispatcher.addListener('MultiEvent', eventListener2);

    const mockMultiEvent: GameEvent = {
      type: 'MultiEvent',
      data: { key: 'value' },
    };

    eventDispatcher.emitEvent(mockMultiEvent);

    expect(eventListener1).toHaveBeenCalledTimes(1);
    expect(eventListener2).toHaveBeenCalledTimes(1);
    expect(eventListener1).toHaveBeenCalledWith(mockMultiEvent);
    expect(eventListener2).toHaveBeenCalledWith(mockMultiEvent);
  });
});
