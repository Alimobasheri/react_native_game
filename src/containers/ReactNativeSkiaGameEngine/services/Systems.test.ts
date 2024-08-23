import { RNGE_System_Args, RNGE_Time, RNGE_Touch_Item } from '@/systems/types';
import { Entities } from './Entities';
import { system, Systems } from './Systems';

describe('Systems', () => {
  let systems: Systems;
  let mockEntities: Entities;
  let mockArgs: RNGE_System_Args;

  beforeEach(() => {
    systems = new Systems();
    mockEntities = new Entities();

    const mockTouchEvent: RNGE_Touch_Item = {
      event: { pageX: 100, pageY: 200 },
      type: 'start',
    };

    const mockTime: RNGE_Time = {
      current: 1000,
      previous: 983.34,
      delta: 16.66,
    };

    mockArgs = {
      touches: [mockTouchEvent],
      screen: { width: 1920, height: 1080 },
      layout: { x: 0, y: 0, width: 1920, height: 1080 },
      events: [],
      dispatch: jest.fn(),
      time: mockTime,
    };
  });

  test('should execute systems with the correct entities and args', () => {
    const mockSystem: system = jest.fn();

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
    expect(mockSystem).toHaveBeenCalledWith(mockEntities, mockArgs);
  });

  test('should correctly handle touch events in systems', () => {
    const mockSystem: system = jest.fn((entities, args) => {
      expect(args.touches.length).toBe(1);
      expect(args.touches[0].event.pageX).toBe(100);
      expect(args.touches[0].event.pageY).toBe(200);
      expect(args.touches[0].type).toBe('start');
    });

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
  });

  test('should handle timing information correctly in systems', () => {
    const mockSystem: system = jest.fn((entities, args) => {
      expect(args.time.current).toBe(1000);
      expect(args.time.previous).toBe(983.34);
      expect(args.time.delta).toBe(16.66);
    });

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
  });

  test('should allow systems to dispatch events', () => {
    const mockDispatch = jest.fn();
    const mockSystem: system = jest.fn((entities, args) => {
      args.dispatch({ type: 'TEST_EVENT' });
    });

    mockArgs.dispatch = mockDispatch;

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TEST_EVENT' });
  });

  test('should handle multiple systems interacting with the same entities', () => {
    const mockSystem1: system = jest.fn((entities, args) => {
      entities.addEntity({ id: 'entity1' } as any, { label: 'entity1' });
    });

    const mockSystem2: system = jest.fn((entities, args) => {
      const entity = entities.getEntityByLabel('entity1');
      expect(entity).toBeDefined();
    });

    systems.addSystem(mockSystem1);
    systems.addSystem(mockSystem2);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem1).toHaveBeenCalledTimes(1);
    expect(mockSystem2).toHaveBeenCalledTimes(1);
  });

  test('should correctly process screen and layout information', () => {
    const mockSystem: system = jest.fn((entities, args) => {
      expect(args.screen.width).toBe(1920);
      expect(args.screen.height).toBe(1080);
      expect(args.layout.width).toBe(1920);
      expect(args.layout.height).toBe(1080);
    });

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
  });
});
