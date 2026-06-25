import {
  clearSwimmerWaterFx,
  getSwimmerWaterFxBurstStore,
  getSwimmerWaterFxPhasePrevStore,
  SWIMMER_WATER_FX_BURST_STORE_KEY,
  SWIMMER_WATER_FX_PHASE_PREV_KEY,
} from '@/Game/water/swimmerWaterFxLifecycle';

describe('swimmerWaterFxLifecycle', () => {
  beforeEach(() => {
    global._RNTGE_ = {
      [SWIMMER_WATER_FX_BURST_STORE_KEY]: [
        {
          entityId: 101,
          accentEntityId: 102,
          age: 0.1,
          maxAge: 0.5,
          swimmerX: 180,
          kind: 'splash',
          direction: 1,
          strength: 1,
          foamSeed: 42,
        },
      ],
      [SWIMMER_WATER_FX_PHASE_PREV_KEY]: { 7: 2 },
    };
  });

  afterEach(() => {
    delete global._RNTGE_;
  });

  it('clears burst store and phase-prev after clearSwimmerWaterFx', () => {
    const removedEntities: number[] = [];
    const mockEcs = {
      removeEntity: (id: number) => {
        removedEntities.push(id);
      },
      updateComponent: (
        _entity: number,
        _name: string,
        updater: (scene: { objects: { entities: number[] } }) => void
      ) => {
        const scene = { objects: { entities: [99, 101, 102, 200] } };
        updater(scene);
        return scene;
      },
    };
    const sceneEntity = 1;

    clearSwimmerWaterFx(mockEcs as never, sceneEntity, 99);

    expect(getSwimmerWaterFxBurstStore()).toEqual([]);
    expect(getSwimmerWaterFxPhasePrevStore()).toEqual({});
    expect(removedEntities).toEqual(expect.arrayContaining([99, 101, 102]));
    expect(removedEntities.length).toBe(3);
  });
});
