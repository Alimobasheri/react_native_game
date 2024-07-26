// src/containers/ReactNativeSkiaGameEngine/hooks/useFrameTimeout.ts
import { useContext } from "react";
import { RNSGEContext } from "../context";
import { setFrameTimeout as setFrameTimeoutFn } from "../utils/setFrameTimeout";

export const useFrameTimeout = () => {
  const { frames } = useContext(RNSGEContext);

  const setFrameTimeout = (callback: () => void, frameCount: number) => {
    return setFrameTimeoutFn(frames.current, callback, frameCount);
  };

  return setFrameTimeout;
};
