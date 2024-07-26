import { useRef } from "react";
import { Entities } from "../services/Entities";

export const useEntities = () => {
  const entitiesRef = useRef<Entities>(new Entities());
  return entitiesRef;
};
