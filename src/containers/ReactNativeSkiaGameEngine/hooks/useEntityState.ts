import {
  Dispatch,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RNSGEContext } from "../context";
import { AddEntityEvent, Entity } from "../services";
import { useFrameEffect } from "./useFrameEffect";
import { deepEqual } from "../utils/deepEqual";
import { entityIdentifier } from "./useEntityInstance";

export const useEntityState = <T>(
  entityId: string | entityIdentifier
): {
  entity: Entity<T> | Entity<T>[] | undefined | null;
  found: boolean;
} => {
  const rnsgeContext = useContext(RNSGEContext);

  const [found, setFound] = useState<boolean>(true);

  const findEntityAndReturn = useCallback(
    (
      setFound: Dispatch<boolean>,
      found: boolean,
      instance: Entity<T> | Entity<T>[] | null = null,
      setInstance: null | Dispatch<Entity<T> | Entity<T>[] | undefined> = null
    ) => {
      if (typeof entityId === "string") {
        if (!rnsgeContext.entities.current.entities.has(entityId)) {
          setFound(false);
          if (typeof setInstance === "function") setInstance(undefined);
          return;
        }
        const entity = rnsgeContext.entities.current.entities.get(entityId);
        if (Array.isArray(instance) || instance?.id != entity?.id) {
          setFound(true);
          if (typeof setInstance === "function") setInstance(entity);
          return entity;
        }
      } else if (typeof entityId === "object") {
        const { label, group } = entityId;
        if (label) {
          if (rnsgeContext.entities.current.mapLabelToEntityId.has(label)) {
            setFound(true);
            const entity =
              rnsgeContext.entities.current.getEntityByLabel(label);
            if (Array.isArray(instance) || instance?.id != entity?.id) {
              setFound(true);
              if (typeof setInstance === "function") setInstance(entity);
              return entity;
            }
          }
        } else if (group) {
          if (rnsgeContext.entities.current.mapGroupIdToEntities.has(group)) {
            const entities =
              rnsgeContext.entities.current.getEntitiesByGroup(group);
            if (!Array.isArray(instance)) {
              setFound(true);
              if (typeof setInstance === "function") setInstance(entities);
              return entities;
            } else {
              const instanceIds = instance.map((e) => e.id);
              const entitiesIds = entities.map((e) => e.id);
              if (!deepEqual(instanceIds, entitiesIds)) {
                setFound(true);
                if (typeof setInstance === "function") setInstance(entities);
                return entities;
              }
            }
          }
        }
      }
      if (found !== false) setFound(false);
      if (typeof setInstance === "function" && instance !== undefined)
        setInstance(undefined);
      return undefined;
    },
    [entityId]
  );

  const [instance, setInstance] = useState<
    Entity<T> | Entity<T>[] | undefined
  >();

  useFrameEffect(() => {
    findEntityAndReturn(setFound, found, instance, setInstance);
  }, []);

  return { entity: instance, found: found };
};
