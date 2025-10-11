import React, { FC, PropsWithChildren, useEffect, useState } from 'react';
import { useSceneContextUnsafe } from './hooks';

export type ContentProps = PropsWithChildren<{}>;

export const Content: FC<ContentProps> = ({ children }) => {
  const sceneContext = useSceneContextUnsafe();
  if (!sceneContext) throw new Error('Content must be used within a Scene');
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    sceneContext.notifyContentMounted((v) => setShouldRender(v));
  }, [sceneContext]);

  if (!shouldRender) return null;
  return <>{children}</>;
};
