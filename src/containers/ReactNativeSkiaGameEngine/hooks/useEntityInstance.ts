import { useContext } from "react";
import { RNSGEContext } from "../context";
import { Entity } from "../services";

export const useEntityInstance = <T>(
  entityId: string
): Entity<T> | undefined => {
  const rnsgeContext = useContext(RNSGEContext);

  return rnsgeContext.entities.current.entities.get(entityId);
};
