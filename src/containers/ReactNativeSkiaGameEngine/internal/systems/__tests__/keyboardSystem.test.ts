import { keyboardSystem } from '../../systems/keyboardSystem';
import {
  KeyboardComponentName,
  KeyboardEventTypes,
  KeyboardInputEventType,
  type KeyboardComponentData,
} from '../../components/keyboard';
import type { SystemProcessArgs } from '../../../services-ecs/system';

const makeArgs = (overrides: {
  entities: number[];
  keyboardDataByEntity: Record<number, KeyboardComponentData>;
  events: Array<{ type: string; payload: Record<string, unknown> }>;
}): SystemProcessArgs => {
  const store = {
    get: (entityId: number) => overrides.keyboardDataByEntity[entityId],
  };

  return {
    entities: overrides.entities,
    components: {
      [KeyboardComponentName]: store,
    },
    eventQueue: {
      readEvents: () => overrides.events,
      addAwaitingExternalEvent: jest.fn(),
    } as unknown as SystemProcessArgs['eventQueue'],
    deltaTime: 16,
    ecs: {} as SystemProcessArgs['ecs'],
    dimensions: { value: { width: 400, height: 800 } } as SystemProcessArgs['dimensions'],
    safeAreaInsets: {
      value: { top: 0, bottom: 0, left: 0, right: 0 },
    } as SystemProcessArgs['safeAreaInsets'],
  };
};

describe('keyboardSystem', () => {
  it('invokes onKeyDown only for keys in the component filter', () => {
    const onKeyDown = jest.fn();
    const onKeyUp = jest.fn();

    const args = makeArgs({
      entities: [1],
      keyboardDataByEntity: {
        1: {
          keys: ['ArrowLeft', 'ArrowRight'],
          onKeyDown,
          onKeyUp,
        },
      },
      events: [
        {
          type: KeyboardInputEventType,
          payload: {
            eventType: KeyboardEventTypes.Down,
            key: 'a',
            code: 'KeyA',
            repeat: false,
            timestamp: 1000,
          },
        },
        {
          type: KeyboardInputEventType,
          payload: {
            eventType: KeyboardEventTypes.Down,
            key: 'ArrowLeft',
            code: 'ArrowLeft',
            repeat: false,
            timestamp: 1001,
          },
        },
      ],
    });

    keyboardSystem.process(args);

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 1,
        key: 'ArrowLeft',
        timestamp: 1001,
      })
    );
    expect(onKeyUp).not.toHaveBeenCalled();
  });

  it('invokes onKeyUp for Up events when filter matches', () => {
    const onKeyDown = jest.fn();
    const onKeyUp = jest.fn();

    const args = makeArgs({
      entities: [2],
      keyboardDataByEntity: {
        2: {
          keys: ['ArrowRight'],
          onKeyDown,
          onKeyUp,
        },
      },
      events: [
        {
          type: KeyboardInputEventType,
          payload: {
            eventType: KeyboardEventTypes.Up,
            key: 'ArrowRight',
            code: 'ArrowRight',
            repeat: false,
            timestamp: 2000,
          },
        },
      ],
    });

    keyboardSystem.process(args);

    expect(onKeyDown).not.toHaveBeenCalled();
    expect(onKeyUp).toHaveBeenCalledTimes(1);
    expect(onKeyUp).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 2,
        key: 'ArrowRight',
      })
    );
  });

  it('receives all keys when keys filter is omitted', () => {
    const onKeyDown = jest.fn();

    const args = makeArgs({
      entities: [3],
      keyboardDataByEntity: {
        3: { onKeyDown },
      },
      events: [
        {
          type: KeyboardInputEventType,
          payload: {
            eventType: KeyboardEventTypes.Down,
            key: 'Escape',
            code: 'Escape',
            repeat: false,
            timestamp: 3000,
          },
        },
      ],
    });

    keyboardSystem.process(args);

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Escape' })
    );
  });
});
