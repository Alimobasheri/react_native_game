import { FC, memo, PropsWithChildren, useEffect, useMemo } from "react";
import { useEntities, useGameLoop, useSystems } from "./hooks";
import { RNSGEContext } from "./context";
import { MemoizedContainer } from "./components/MemoizedContainer";
import { Canvas } from "@shopify/react-native-skia";
import { EventDispatcher } from "./services";
import { useDispatcher } from "./hooks/useDispatcher";

export const ReactNativeSkiaGameEngine: FC<PropsWithChildren> = memo(
  ({ children }) => {
    const entities = useEntities();
    const systems = useSystems();
    const dispatcher = useDispatcher();
    const { frames } = useGameLoop(entities, systems, dispatcher);
    const value = useMemo(
      () => ({
        entities: entities,
        systems: systems,
        frames: frames,
        dispatcher,
      }),
      []
    );
    // useEffect(() => {
    //   let listener = frames.current.addListener("FrameUpdateEvent", () => {
    //     console.log("🚀 ~ frames.current:", entities.current.id);
    //   });
    //   () => listener.remove();
    // });
    return (
      <Canvas style={{ flex: 1 }}>
        <RNSGEContext.Provider value={value}>
          <MemoizedContainer>{children}</MemoizedContainer>
        </RNSGEContext.Provider>
      </Canvas>
    );
  }
);
