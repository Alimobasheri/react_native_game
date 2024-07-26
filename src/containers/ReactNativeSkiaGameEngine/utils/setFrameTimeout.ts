import { Frames, FrameUpdateEvent } from "../services";

export const setFrameTimeout = (
  frames: Frames,
  callback: () => void,
  frameCount: number
) => {
  const targetFrame = frames.currentFrame + frameCount;

  const handleFrameUpdate = (currentFrame: number) => {
    if (currentFrame >= targetFrame) {
      callback();
      listener.remove();
    }
  };

  const listener = frames.addListener(FrameUpdateEvent, handleFrameUpdate);

  return () => {
    listener.remove();
  };
};
