import React, {
  FC,
  PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SceneContext } from './context';
import {
  AssetPreloadDoneType,
  LoadSceneResponseType,
  SceneRegisterRequest,
  SceneRegisterRequestType,
  SceneRegisteredResponseType,
  SceneSetActiveRequest,
  SceneSetActiveRequestType,
  SceneSetPreloadStateRequest,
  SceneSetPreloadStateRequestType,
  UnLoadSceneResponseType,
} from './events';
import { useSubscriptionId, useEventBridge } from './hooks';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';

export type SceneProps = PropsWithChildren<{
  name?: string;
  parentName?: string;
  zIndex?: number;
  isActive?: boolean;
  isPaused?: boolean;
}>;

export const Scene: FC<SceneProps> = ({
  name,
  parentName,
  zIndex = 0,
  isActive: isActiveProp = true,
  isPaused = false,
  children,
}) => {
  const eventQueue = React.useContext(EventQueueContext);
  if (!eventQueue) {
    throw new Error('Scene must be used inside EventQueueProvider');
  }

  const sceneKeyRef = useRef<string | null>(null);
  if (sceneKeyRef.current === null) {
    sceneKeyRef.current = name || Math.random().toString(36).slice(2);
  }
  const sceneKey = sceneKeyRef.current;

  const sceneSubscriptionId = useSubscriptionId();
  const [isActive, setIsActive] = useState<boolean>(isActiveProp);
  const [hasPreload, setHasPreload] = useState(false);
  const contentGateRef = useRef<((v: boolean) => void) | null>(null);
  const [contentShouldRender, setContentShouldRender] = useState(false);

  useEventBridge(sceneSubscriptionId, (event) => {
    switch (event.type) {
      case SceneRegisteredResponseType:
        return;

      case AssetPreloadDoneType:
        contentGateRef.current?.(true);
        setContentShouldRender(true);
        const unlock: SceneSetPreloadStateRequest = {
          type: SceneSetPreloadStateRequestType,
          payload: { sceneKey, isPreloading: false },
        };
        eventQueue.addEventJS(unlock);
        return;

      case LoadSceneResponseType:
        setIsActive(true);
        if (!hasPreload) {
          const unlock: SceneSetPreloadStateRequest = {
            type: SceneSetPreloadStateRequestType,
            payload: { sceneKey, isPreloading: false },
          };
          eventQueue.addEventJS(unlock);
          contentGateRef.current?.(true);
          setContentShouldRender(true);
        }
        return;

      case UnLoadSceneResponseType:
        setIsActive(false);
        contentGateRef.current?.(false);
        setContentShouldRender(false);
        return;
    }
  });

  useEffect(() => {
    const req: SceneRegisterRequest = {
      type: SceneRegisterRequestType,
      payload: {
        sceneKey,
        parentSceneKey: parentName,
        zIndex,
        subscriptionId: sceneSubscriptionId,
        isActive: isActive === false ? false : true,
        isPaused,
      },
    };
    eventQueue.addEventJS(req);
  }, [sceneKey, parentName, zIndex, sceneSubscriptionId]);

  useEffect(() => {
    const req: SceneSetActiveRequest = {
      type: SceneSetActiveRequestType,
      payload: { sceneKey, isActive, isPaused },
    };
    eventQueue.addEventJS(req);
  }, [sceneKey, isActive, isPaused]);

  useEffect(() => {
    if (isActive !== isActiveProp) setIsActive(isActiveProp);
  }, [isActiveProp]);

  const contextValue = useMemo(
    () => ({
      sceneKey,
      sceneSubscriptionId,
      isActive,
      parentSceneKey: parentName,
      notifyContentMounted: (cb: (v: boolean) => void) => {
        contentGateRef.current = cb;
      },
      notifyPreloadMounted: (subscriptionId: string) => {
        setHasPreload(true);
        const setPreloading: SceneSetPreloadStateRequest = {
          type: SceneSetPreloadStateRequestType,
          payload: { sceneKey, isPreloading: true },
        };
        eventQueue.addEventJS(setPreloading);
      },
      waitForPreload: () => {},
    }),
    [sceneKey, isActive, sceneSubscriptionId, parentName]
  );

  return (
    <SceneContext.Provider value={contextValue}>
      {children}
    </SceneContext.Provider>
  );
};
