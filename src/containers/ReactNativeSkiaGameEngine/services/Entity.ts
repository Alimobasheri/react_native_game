import { EntityRendererProps } from "@/constants/views";
import { FC } from "react";
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

export const uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const EntityUpdateEvent = "EntityUpdateEvent";

export type EntityUpdateEventArgs<T> = {
  prev: T;
  next: T;
};

export class Entity<T> extends EventEmitter {
  protected _id: string;
  protected _data: T;

  constructor(data: T) {
    super();
    this._id = uid();
    this._data = data;
  }

  public get id(): string {
    return this._id;
  }

  public get data(): T {
    return this._data;
  }

  public set data(data: any) {
    const args: EntityUpdateEventArgs<T> = { prev: this._data, next: data };
    this.emit(EntityUpdateEvent, args);
    this._data = data;
  }
}
