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

  public get mapLabelToEntityId(): Map<string, string> {
    return this._mapLabelToEntityId;
  }

  public get mapGroupIdToEntities(): Map<string, Entity<any>[]> {
    return this._mapGroupIdToEntities;
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
    setTimeout(() => this.emit(AddEntityEvent, { entity }));
  }

  public removeEntity(entityId: string | { label?: string; group?: string[] }) {
    if (typeof entityId === "string") {
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
      entityId.group.forEach((group) => {
        const entities = this._mapGroupIdToEntities.get(group);
        if (entities) {
          entities.forEach((entity) => {
            this.removeEntity(entity.id);
          });
        }
      });
    }
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
