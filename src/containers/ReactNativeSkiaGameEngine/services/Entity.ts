import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

export const uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export type EntityUpdateEventArgs<T> = {
  prev: T;
  next: T;
};

export const EntityUpdateEvent = 'EntityUpdateEvent';

export enum EntityChangeComparison {
  Equal = 0,
  StrictEqual = 1,
}

/**
 * Represents an entity in the game engine.
 *
 * @template T The type of data associated with the entity.
 */
export class Entity<T extends Record<string, any>> extends EventEmitter {
  /**
   * The unique identifier of the entity.
   *
   * @type {string}
   */
  protected _id: string;

  /**
   * The data associated with the entity.
   *
   * @type {T}
   */
  protected _data: T;

  /**
   * The label associated with the entity.
   *
   * @type {string | undefined}
   */
  protected _label?: string;

  /**
   * The groups associated with the entity.
   *
   * @type {string[]}
   */
  protected _groups: string[] = [];

  /**
   * The comparison mode for checking if the entity data has changed.
   * The default value is EntityChangeComparison.Equal.
   *
   * @type {EntityChangeComparison}
   */
  protected _comparison: EntityChangeComparison = EntityChangeComparison.Equal;

  /**
   * Creates a new entity with the given data, label, and groups.
   *
   * @param {T} data The data to associate with the entity.
   * @param {EntityChangeComparison} [comparison] The comparison mode for data changes.
   * @param {string} [label] The label to associate with the entity.
   * @param {string[]} [groups] The groups to associate with the entity.
   */
  constructor(
    data: T,
    comparison?: EntityChangeComparison,
    label?: string,
    groups?: string[]
  ) {
    super();
    this._id = uid();
    this._data = data;
    this._label = label;
    this._groups = groups || [];

    if (comparison) {
      this._comparison = comparison;
    }
  }

  /**
   * Gets the unique identifier of the entity.
   *
   * @return {string} The unique identifier of the entity.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the data associated with the entity.
   *
   * @return {T} The data associated with the entity.
   */
  public get data(): T {
    return this._data;
  }

  /**
   * Sets the data associated with the entity.
   *
   * @param {T} data The new data to associate with the entity.
   * @emits EntityUpdateEvent
   */
  public set data(data: T) {
    if (this._comparison === EntityChangeComparison.StrictEqual) {
      if (JSON.stringify(this._data) === JSON.stringify(data)) {
        return;
      }
    } else if (this._comparison === EntityChangeComparison.Equal) {
      if (this._data === data) {
        return;
      }
    }
    const args: EntityUpdateEventArgs<T> = { prev: this._data, next: data };
    this.emit(EntityUpdateEvent, args);
    this._data = data;
  }

  /**
   * Gets the label associated with the entity.
   *
   * @return {string | undefined} The label associated with the entity.
   */
  public get label(): string | undefined {
    return this._label;
  }

  /**
   * Gets the groups associated with the entity.
   *
   * @return {string[]} The groups associated with the entity.
   */
  public get groups(): string[] {
    return this._groups;
  }
}
