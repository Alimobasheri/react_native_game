import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { Entity, uid } from './Entity';

export const AddEntityEvent = 'AddEntityEvent';

/**
 * Options for configuring an entity.
 * @typedef {Object} IEntityOptions
 * @property {string} [label] - A label to associate with the entity.
 * @property {string[]} [groups] - A list of groups the entity belongs to.
 */
export interface IEntityOptions {
  label?: string;
  groups?: string[];
}

/**
 * Manages a collection of entities with the ability to emit events on entity changes.
 * @extends EventEmitter
 */
export class Entities extends EventEmitter {
  protected _entities: Map<string, Entity<any>>;
  protected _mapLabelToEntityId: Map<string, string> = new Map<
    string,
    string
  >();
  protected _mapGroupIdToEntities: Map<string, Entity<any>[]> = new Map<
    string,
    Entity<any>[]
  >();
  /** @type {string} */
  public id: string = uid();

  /**
   * Creates an instance of Entities.
   * @param {Map<string, Entity<any>>} [initialEntities=new Map<string, Entity<any>>()] - Initial set of entities.
   */
  constructor(
    initialEntities: Map<string, Entity<any>> = new Map<string, Entity<any>>()
  ) {
    super();
    this._entities = initialEntities;
    this._initializeMapsFromEntities(initialEntities);
  }

  /**
   * Initializes the label and group maps from the provided entities.
   * @param {Map<string, Entity<any>>} entities - A map of entity IDs to entities.
   * @private
   */
  private _initializeMapsFromEntities(entities: Map<string, Entity<any>>) {
    entities.forEach((entity, id) => {
      if (entity.label) {
        this._mapLabelToEntityId.set(entity.label, id);
      }
      if (entity.groups) {
        entity.groups.forEach((group) => {
          if (!this._mapGroupIdToEntities.has(group)) {
            this._mapGroupIdToEntities.set(group, []);
          }
          this._mapGroupIdToEntities.get(group)?.push(entity);
        });
      }
    });
  }

  /**
   * Gets the map of all entities.
   * @returns {Map<string, Entity<any>>} - The map of entity IDs to entities.
   */
  public get entities(): Map<string, Entity<any>> {
    return this._entities;
  }

  /**
   * Gets the map of labels to entity IDs.
   * @returns {Map<string, string>} - The map of labels to entity IDs.
   */
  public get mapLabelToEntityId(): Map<string, string> {
    return this._mapLabelToEntityId;
  }

  /**
   * Gets the map of group IDs to lists of entities.
   * @returns {Map<string, Entity<any>[]>} - The map of group IDs to lists of entities.
   */
  public get mapGroupIdToEntities(): Map<string, Entity<any>[]> {
    return this._mapGroupIdToEntities;
  }

  /**
   * Adds a new entity to the collection and optionally associates it with a label and/or groups.
   * @param {Entity<any>} entity - The entity to add.
   * @param {IEntityOptions} [options] - Optional configurations for the entity.
   * @fires AddEntityEvent
   */
  public addEntity(entity: Entity<any>, options?: IEntityOptions) {
    this._entities.set(entity.id, entity);
    if (options?.label) {
      this._mapLabelToEntityId.set(options.label, entity.id);
    }
    if (options?.groups) {
      for (const group of options.groups) {
        if (!this._mapGroupIdToEntities.has(group)) {
          this._mapGroupIdToEntities.set(group, []);
        }
        this._mapGroupIdToEntities.get(group)?.push(entity);
      }
    }
    this.emit(AddEntityEvent, { entity });
  }

  /**
   * Removes an entity from the collection based on its ID, label, or groups.
   * @param {string|{label?: string; group?: string[]}} entityId - The entity ID, or an object specifying a label or groups to remove.
   */
  public removeEntity(entityId: string | { label?: string; group?: string[] }) {
    if (typeof entityId === 'string') {
      this._entities.delete(entityId);
      this._mapLabelToEntityId.forEach((id, label) => {
        if (id === entityId) this._mapLabelToEntityId.delete(label);
      });
      this._mapGroupIdToEntities.forEach((entities, group) => {
        const index = entities.findIndex((entity) => entity.id === entityId);
        if (index !== -1) {
          entities.splice(index, 1);
          if (entities.length === 0) this._mapGroupIdToEntities.delete(group);
        }
      });
    } else if (entityId.label) {
      const entity = this._mapLabelToEntityId.get(entityId.label);
      if (entity) this.removeEntity(entity);
    } else if (entityId.group) {
      const entityIdsToRemove: string[] = [];

      entityId.group.forEach((group) => {
        const entities = this._mapGroupIdToEntities.get(group);
        if (entities) {
          entityIdsToRemove.push(...entities.map((entity) => entity.id));
        }
      });

      entityIdsToRemove.forEach((id) => {
        this.removeEntity(id);
      });
    }
  }

  /**
   * Retrieves an entity by its label.
   * @param {string} label - The label associated with the entity.
   * @returns {Entity<any>|undefined} - The entity associated with the label, or undefined if not found.
   */
  public getEntityByLabel(label: string): Entity<any> | undefined {
    const entityId = this._mapLabelToEntityId.get(label);
    if (!entityId) return;
    return this._entities.get(entityId);
  }

  /**
   * Retrieves all entities associated with a specific group.
   * @param {string} group - The group ID.
   * @returns {Entity<any>[]} - An array of entities belonging to the group.
   */
  public getEntitiesByGroup(group: string): Entity<any>[] {
    return this._mapGroupIdToEntities.get(group) || [];
  }
}
