import { FC, useContext, useMemo } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { Entity } from "../services/Entity";
import { EntityRendererProps } from "@/constants/views";
import { IEntityOptions } from "../services";

export function useAddEntity<T>(data: T, options?: IEntityOptions) {
  const context = useContext(RNSGEContext);

  const entity = useMemo(() => {
    const entityInstance = new Entity<T>(data);
    context.entities.current.addEntity(entityInstance, options);
    return entityInstance;
  }, []);

  return entity;
}
