import {
  Entity,
  EntityUpdateEventArgs,
  EntityUpdateEvent,
  EntityChangeComparison,
} from './Entity';

describe('Entity class', () => {
  it('should create a new entity with the given data', () => {
    const data = { foo: 'bar' };
    const entity = new Entity(data);
    expect(entity.data).toStrictEqual(data);
  });

  it('should generate a unique identifier for the entity', () => {
    const entity1 = new Entity({ foo: 'bar' });
    const entity2 = new Entity({ foo: 'baz' });
    expect(entity1.id).not.toBe(entity2.id);
  });

  it('should assign label and groups correctly', () => {
    const data = { foo: 'bar' };
    const label = 'player';
    const groups = ['group1', 'group2'];
    const entity = new Entity(data, undefined, label, groups);

    expect(entity.label).toBe(label);
    expect(entity.groups).toEqual(groups);
  });

  it('should emit an update event when the data is changed', (done) => {
    const entity = new Entity({ foo: 'bar' });
    entity.addListener(
      EntityUpdateEvent,
      (args: EntityUpdateEventArgs<any>) => {
        expect(args.prev).toStrictEqual({ foo: 'bar' });
        expect(args.next).toStrictEqual({ foo: 'baz' });
        done();
      }
    );
    entity.data = { foo: 'baz' };
  });

  it('should emit an update event when the data is reassigned but not changed', (done) => {
    const entity = new Entity({ foo: 'bar' });
    entity.addListener(EntityUpdateEvent, (args) => {
      expect(args.prev).toStrictEqual({ foo: 'bar' });
      expect(args.next).toStrictEqual({ foo: 'bar' });
      done();
    });
    entity.data = { foo: 'bar' };
  });

  it('should handle multiple groups correctly', () => {
    const entity = new Entity({ foo: 'bar' }, undefined, 'player', [
      'group1',
      'group2',
    ]);
    expect(entity.groups).toContain('group1');
    expect(entity.groups).toContain('group2');
  });

  it('should allow an entity without a label or groups', () => {
    const entity = new Entity({ foo: 'bar' });
    expect(entity.label).toBeUndefined();
    expect(entity.groups).toEqual([]);
  });
});
