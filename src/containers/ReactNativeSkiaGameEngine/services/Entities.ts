import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";
import { Entity, uid } from "./Entity";

export const AddEntityEvent = "AddEntityEvent";

export interface IEntityOptions {
  label?: string;
  groups?: string[];
}

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
  public id: string = uid();

  constructor(
    initialEntities: Map<string, Entity<any>> = new Map<string, Entity<any>>()
  ) {
    super();
    this._entities = initialEntities;
  }

  public get entities(): Map<string, Entity<any>> {
    return this._entities;
  }

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
    setTimeout(() => this.emit(AddEntityEvent, entity.id));
  }

  public getEntityByLabel(label: string): Entity<any> | undefined {
    const entityId = this._mapLabelToEntityId.get(label);
    if (!entityId) return;
    return this._entities.get(entityId);
  }

  public getEntitiesByGroup(group: string): Entity<any>[] {
    return this._mapGroupIdToEntities.get(group) || [];
  }
}
