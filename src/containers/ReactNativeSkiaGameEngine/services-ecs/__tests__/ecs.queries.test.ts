import { createECS } from '../ecs';

const comp = (name: string, data: Record<string, unknown> = {}) => ({
  name,
  data,
});

/**
 * ECS is initialized on the UI worklet runtime (see useECS.ts).
 * Do not remove 'worklet' from createECS/createComponentStore to satisfy Jest.
 */
/**
 * ECS is initialized on the UI worklet runtime (see useECS.ts).
 * ComponentStore.forEach/count are worklets — run this suite on-device or keep skipped in Jest.
 */
describe('ECS dense queries', () => {
  it('creates entities and stores components', () => {
    const ecs = createECS();
    ecs.createComponent('A');
    const e1 = ecs.createEntity();
    expect(e1).toBe(0);
    ecs.addComponent(e1, comp('A', { v: 1 }));
    expect(ecs.components['A'].get(e1)).toEqual({ v: 1 });
    expect(ecs.components['A'].count()).toBe(1);
  });

  it('getEntitiesWithComponent returns only live entities with that component', () => {
    const ecs = createECS();
    ecs.createComponent('A');

    const e1 = ecs.createEntity();
    const e2 = ecs.createEntity();
    ecs.addComponent(e1, comp('A', { v: 1 }));
    ecs.addComponent(e2, comp('A', { v: 2 }));

    const found = ecs.getEntitiesWithComponent('A');
    expect(found).toHaveLength(2);
    expect(found).toContain(e1);
    expect(found).toContain(e2);
  });

  it('getEntitiesWithComponents multi-component respects bitmask', () => {
    const ecs = createECS();
    ecs.createComponent('A');
    ecs.createComponent('B');

    const onlyA = ecs.createEntity();
    const aAndB = ecs.createEntity();
    ecs.addComponent(onlyA, comp('A'));
    ecs.addComponent(aAndB, comp('A'));
    ecs.addComponent(aAndB, comp('B'));

    const found = ecs.getEntitiesWithComponents(['A', 'B']);
    expect(found).toEqual([aAndB]);
  });

  it('removeEntity excludes entity from dense queries', () => {
    const ecs = createECS();
    ecs.createComponent('A');

    const e1 = ecs.createEntity();
    const e2 = ecs.createEntity();
    ecs.addComponent(e1, comp('A'));
    ecs.addComponent(e2, comp('A'));

    ecs.removeEntity(e1);

    expect(ecs.getEntitiesWithComponent('A')).toEqual([e2]);
  });

  it('reused entity id does not return stale query results', () => {
    const ecs = createECS();
    ecs.createComponent('A');
    ecs.createComponent('B');

    const first = ecs.createEntity();
    ecs.addComponent(first, comp('A'));
    ecs.removeEntity(first);

    const reused = ecs.createEntity();
    expect(reused).toBe(first);
    ecs.addComponent(reused, comp('B'));

    expect(ecs.getEntitiesWithComponent('A')).toEqual([]);
    expect(ecs.getEntitiesWithComponent('B')).toEqual([reused]);
  });

  it('forEach count matches single-component query length', () => {
    const ecs = createECS();
    ecs.createComponent('A');

    const e1 = ecs.createEntity();
    const e2 = ecs.createEntity();
    ecs.addComponent(e1, comp('A'));
    ecs.addComponent(e2, comp('A'));

    const store = ecs.components['A'];
    let forEachCount = 0;
    store.forEach(() => {
      forEachCount++;
    });

    expect(store.count()).toBe(2);
    expect(forEachCount).toBe(2);
    expect(ecs.getEntitiesWithComponent('A')).toHaveLength(2);
  });

  it('returns empty array when a required component store does not exist', () => {
    const ecs = createECS();
    ecs.createComponent('A');

    const e = ecs.createEntity();
    ecs.addComponent(e, comp('A'));

    expect(ecs.getEntitiesWithComponents(['A', 'Missing'])).toEqual([]);
  });

  it('multi-component query matches store count after create/remove cycles', () => {
    const ecs = createECS();
    ecs.createComponent('A');
    ecs.createComponent('B');

    for (let i = 0; i < 5; i++) {
      const ent = ecs.createEntity();
      ecs.addComponent(ent, comp('A'));
      ecs.addComponent(ent, comp('B'));
    }

    expect(ecs.getEntitiesWithComponents(['A', 'B']).length).toBe(5);
    expect(ecs.components['B'].count()).toBe(5);

    ecs.removeEntity(0);
    ecs.removeEntity(2);

    expect(ecs.getEntitiesWithComponents(['A', 'B']).length).toBe(3);
    expect(ecs.getEntitiesWithComponent('A').length).toBe(3);
  });
});
