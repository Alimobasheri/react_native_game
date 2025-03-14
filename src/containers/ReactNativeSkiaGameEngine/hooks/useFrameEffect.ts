import { useCallback, useContext, useEffect, useRef } from "react";
import { RNSGEContext } from "../context";
import { FrameUpdateEvent } from "../services";

const useThrottle = (callback: (...args: any[]) => any, limit: number) => {
  const lastCall = useRef(0);
  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall.current >= limit) {
        lastCall.current = now;
        callback(...args);
      }
    },
    [callback, limit]
  );
};

export const useFrameEffect = (
  callback: (...args: any[]) => any,
  deps: any[],
  throttleMs: number = 0
) => {
  const frames = useContext(RNSGEContext).frames;
  const stableCallback = useCallback(callback, deps);

  const throttledCallback = useThrottle(stableCallback, throttleMs);

  useEffect(() => {
    if (!frames.current) {
      console.error("Frames object is not defined in context");
      return;
    }
    const frameListener = frames.current.addListener(
      FrameUpdateEvent,
      throttledCallback
    );

    return () => {
      frameListener.remove();
    };
  }, [frames.current, throttledCallback]);
};
