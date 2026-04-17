import React, { useMemo, useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import { TouchInputEventType } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/touchSystem';
import {
  GestureKinds,
  TouchEventTypes,
  TouchInputEvent,
} from '../../internal/components/touch';
import { EventQueueContextType } from '../../hooks-ecs/useEventQueue/useEventQueue';

const pushEvent = (eventQueue: any, evt: any) => {
  'worklet';
  try {
    if (typeof eventQueue.addEvent === 'function') {
      eventQueue.addEvent(evt);
      return;
    }
  } catch {
    console.warn('[RNTGE] Failed to push event to event queue in UI thread');
  }
};

export const TouchOverlay: React.FC<{ eventQueue: EventQueueContextType }> = ({
  eventQueue,
}) => {
  if (!eventQueue) {
    throw new Error('TouchOverlay must be used inside EventQueueProvider');
  }

  // PAN gesture
  const pan = useMemo(() => {
    return Gesture.Pan()
      .onBegin((ev) => {
        const evt: TouchInputEvent = {
          type: TouchInputEventType,
          payload: {
            pointerId: ev.handlerTag ?? 0,
            eventType: TouchEventTypes.Start,
            timestamp: Date.now(),
            gesture: { kind: GestureKinds.Pan, data: ev },
          },
        };
        pushEvent(eventQueue, evt);
      })
      .onUpdate((ev) => {
        const evt: TouchInputEvent = {
          type: TouchInputEventType,
          payload: {
            pointerId: ev.handlerTag ?? 0,
            eventType: TouchEventTypes.Move,
            timestamp: Date.now(),
            gesture: { kind: GestureKinds.Pan, data: ev },
          },
        };
        pushEvent(eventQueue, evt);
      })
      .onEnd((ev) => {
        const evt: TouchInputEvent = {
          type: TouchInputEventType,
          payload: {
            pointerId: ev.handlerTag ?? 0,
            eventType: TouchEventTypes.End,
            timestamp: Date.now(),
            gesture: { kind: GestureKinds.Pan, data: ev },
          },
        };
        pushEvent(eventQueue, evt);
      })
      .onTouchesCancelled((ev) => {
        const evt: TouchInputEvent = {
          type: TouchInputEventType,
          payload: {
            pointerId: ev.handlerTag ?? 0,
            eventType: TouchEventTypes.Cancel,
            timestamp: Date.now(),
            gesture: { kind: GestureKinds.Pan, data: ev },
          },
        };
        pushEvent(eventQueue, evt);
      });
  }, [eventQueue]);

  // TAP gesture
  const tap = useMemo(() => {
    return Gesture.Tap().onStart((ev) => {
      const evt: TouchInputEvent = {
        type: TouchInputEventType,
        payload: {
          eventType: TouchEventTypes.Tap,
          timestamp: Date.now(),
          gesture: { kind: GestureKinds.Tap, data: ev },
        },
      };
      pushEvent(eventQueue, evt);
    });
  }, [eventQueue]);

  // PRESS gesture (long-press)
  const press = useMemo(() => {
    return Gesture.LongPress()
      .minDuration(300)
      .onStart((ev) => {
        const evt: TouchInputEvent = {
          type: TouchInputEventType,
          payload: {
            pointerId: ev.handlerTag ?? 0,
            eventType: TouchEventTypes.LongPress,
            timestamp: Date.now(),
            gesture: { kind: GestureKinds.LongPress, data: ev },
          },
        };
        pushEvent(eventQueue, evt);
      });
  }, [eventQueue]);

  // Combine gestures
  const gesture = tap;

  useEffect(() => {
    // on unmount: flush pointer cancel to system so it can clear state
    return () => {
      const evt: TouchInputEvent = {
        type: TouchInputEventType,
        payload: {
          pointerId: -1,
          eventType: TouchEventTypes.Cancel,
          timestamp: Date.now(),
          gesture: { kind: GestureKinds.Generic, data: {} },
        },
      };
      pushEvent(eventQueue, evt);
    };
  }, [eventQueue]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={gesture}>
        <View style={styles.full} />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
