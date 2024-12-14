import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { RNSGEContext } from '../context';
import { AddEntityEvent, Entity } from '../services';
import { useFrameEffect } from './useFrameEffect';

export type entityIdentifier = {
  label?: string;
  group?: string;
};

export const useEntityInstance = <T extends Record<string, any>>(
  entityId: string | entityIdentifier
): {
  entity: MutableRefObject<Entity<T> | Entity<T>[] | undefined>;
  found: MutableRefObject<boolean>;
} => {
  const rnsgeContext = useContext(RNSGEContext);

  if (!rnsgeContext) {
    throw new Error('useEntityInstance must be used within a RNSGEContext');
  }

  const found = useRef(true);

  const findEntityAndReturn = useCallback(() => {
    if (typeof entityId === 'string') {
      if (!rnsgeContext.entities.current.entities.has(entityId)) {
        found.current = false;
        return;
      }
      return rnsgeContext.entities.current.entities.get(entityId);
    } else if (typeof entityId === 'object') {
      const { label, group } = entityId;
      if (label) {
        if (rnsgeContext.entities.current.mapLabelToEntityId.has(label)) {
          found.current = true;
          return rnsgeContext.entities.current.getEntityByLabel(label);
        }
      } else if (group) {
        if (rnsgeContext.entities.current.mapGroupIdToEntities.has(group)) {
          found.current = true;
          return rnsgeContext.entities.current.getEntitiesByGroup(group);
        }
      }
    }
    found.current = false;
  }, [entityId]);

  const instance = useRef(findEntityAndReturn());

  useFrameEffect(() => {
    instance.current = findEntityAndReturn();
  }, []);

  return { entity: instance, found: found };
};
