import { Entities, AddEntityEvent, IEntityOptions } from './Entities';
import { Entity, EntityUpdateEvent, EntityChangeComparison } from './Entity';

// Mock Entity class extending the real Entity class
class MockEntity extends Entity<Record<string, any>> {
  constructor(
    id: string,
    data: Record<string, any> = {},
    comparison: EntityChangeComparison = EntityChangeComparison.Equal
  ) {
    super(data);
    this._id = id;
    this._comparison = comparison;
  }
}

describe('Entities Class', () => {
  let entities: Entities;

  beforeEach(() => {
    entities = new Entities();
  });

  test('should initialize with an empty entities map', () => {
    expect(entities.entities.size).toBe(0);
    expect(entities.mapLabelToEntityId.size).toBe(0);
    expect(entities.mapGroupIdToEntities.size).toBe(0);
  });

  test('should add an entity without options', () => {
    const entity = new MockEntity('1');
    entities.addEntity(entity);

    expect(entities.entities.size).toBe(1);
    expect(entities.entities.get('1')).toBe(entity);
    expect(entities.mapLabelToEntityId.size).toBe(0);
    expect(entities.mapGroupIdToEntities.size).toBe(0);
  });

  test('should add an entity with a label', () => {
    const entity = new MockEntity('2');
    const options: IEntityOptions = { label: 'Player' };
    entities.addEntity(entity, options);

    expect(entities.entities.size).toBe(1);
    expect(entities.mapLabelToEntityId.get('Player')).toBe('2');
  });

  test('should add an entity to multiple groups', () => {
    const entity = new MockEntity('3');
    const options: IEntityOptions = { groups: ['GroupA', 'GroupB'] };
    entities.addEntity(entity, options);

    expect(entities.mapGroupIdToEntities.get('GroupA')?.length).toBe(1);
    expect(entities.mapGroupIdToEntities.get('GroupB')?.length).toBe(1);
  });

  test('should emit AddEntityEvent when an entity is added', (done) => {
    const entity = new MockEntity('4');

    entities.addListener(AddEntityEvent, (event) => {
      expect(event.entity).toBe(entity);
      done();
    });

    entities.addEntity(entity);
  });

  test('should remove an entity by ID', () => {
    const entity = new MockEntity('5');
    entities.addEntity(entity);
    entities.removeEntity('5');

    expect(entities.entities.size).toBe(0);
    expect(entities.mapLabelToEntityId.size).toBe(0);
    expect(entities.mapGroupIdToEntities.size).toBe(0);
  });

  test('should remove an entity by label', () => {
    const entity = new MockEntity('6');
    entities.addEntity(entity, { label: 'Enemy' });
    entities.removeEntity({ label: 'Enemy' });

    expect(entities.entities.size).toBe(0);
    expect(entities.mapLabelToEntityId.has('Enemy')).toBe(false);
  });

  test('should remove entities by group', () => {
    const entity1 = new MockEntity('7');
    const entity2 = new MockEntity('8');
    entities.addEntity(entity1, { groups: ['GroupC'] });
    entities.addEntity(entity2, { groups: ['GroupC'] });
    entities.removeEntity({ group: ['GroupC'] });

    expect(entities.entities.size).toBe(0);
    expect(entities.mapGroupIdToEntities.has('GroupC')).toBe(false);
  });

  test('should not remove non-existent entity by ID', () => {
    entities.removeEntity('non-existent');
    expect(entities.entities.size).toBe(0);
  });

  test('should not remove non-existent entity by label', () => {
    entities.removeEntity({ label: 'non-existent' });
    expect(entities.entities.size).toBe(0);
  });

  test('should not remove non-existent entity by group', () => {
    entities.removeEntity({ group: ['non-existent-group'] });
    expect(entities.entities.size).toBe(0);
  });

  test('should handle removing entities from multiple groups correctly', () => {
    const entity1 = new MockEntity('9');
    const entity2 = new MockEntity('10');
    entities.addEntity(entity1, { groups: ['GroupD', 'GroupE'] });
    entities.addEntity(entity2, { groups: ['GroupD'] });
    entities.removeEntity(entity1.id);

    expect(entities.mapGroupIdToEntities.get('GroupD')?.length).toBe(1);
    expect(entities.mapGroupIdToEntities.get('GroupE')).not.toBeDefined();
  });

  test('should return an entity by label', () => {
    const entity = new MockEntity('11');
    entities.addEntity(entity, { label: 'Hero' });

    const retrievedEntity = entities.getEntityByLabel('Hero');
    expect(retrievedEntity).toBe(entity);
  });

  test('should return undefined for non-existent label', () => {
    const retrievedEntity = entities.getEntityByLabel('non-existent');
    expect(retrievedEntity).toBeUndefined();
  });

  test('should return entities by group', () => {
    const entity1 = new MockEntity('12');
    const entity2 = new MockEntity('13');
    entities.addEntity(entity1, { groups: ['GroupF'] });
    entities.addEntity(entity2, { groups: ['GroupF'] });

    const groupEntities = entities.getEntitiesByGroup('GroupF');
    expect(groupEntities.length).toBe(2);
    expect(groupEntities).toContain(entity1);
    expect(groupEntities).toContain(entity2);
  });

  test('should return an empty array for non-existent group', () => {
    const groupEntities = entities.getEntitiesByGroup('non-existent-group');
    expect(groupEntities.length).toBe(0);
  });

  test('should update entity data and emit EntityUpdateEvent', (done) => {
    const entity = new MockEntity('14', { health: 100 });
    entities.addEntity(entity);

    entity.addListener(EntityUpdateEvent, (args) => {
      expect(args.prev.health).toBe(100);
      expect(args.next.health).toBe(80);
      done();
    });

    entity.data = { health: 80 };
  });

  test('should not update entity data if comparison fails (Equal mode)', () => {
    const entity = new MockEntity('15', { health: 100 });
    entities.addEntity(entity);

    entity.data = { health: 100 };
    expect(entity.data.health).toBe(100); // No update should occur
  });

  test('should not update entity data if comparison mode is StrictEqual', (done) => {
    const entity = new MockEntity(
      '16',
      { health: 100 },
      EntityChangeComparison.StrictEqual
    );
    entities.addEntity(entity);

    entity.addListener(EntityUpdateEvent, (args) => {
      done('should not update entity data if comparison mode is StrictEqual');
    });

    entity.data = { health: 100 };
    setTimeout(() => done(), 0);
  });
});
