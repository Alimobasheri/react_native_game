import { FC, useContext } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { Entity } from "../services/Entity";
import { EntityRendererProps } from "@/constants/views";
import { IEntityOptions } from "../services";

export function useAddEntity<T>(data: T, options?: IEntityOptions) {
  const context = useContext(RNSGEContext);

  const entity = new Entity<T>(data);
  context.entities.current.addEntity(entity, options);

  return entity;
}
