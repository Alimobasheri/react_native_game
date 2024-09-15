let requestAnimationFrameCallbacks: FrameRequestCallback[] = [];
let time = Date.now();
let frameIndex = 0;

export const mockRequestAnimationFrame = () => {
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
    requestAnimationFrameCallbacks.push(callback);
    return requestAnimationFrameCallbacks.length - 1; // Mock frame ID
  });

  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation((id) => {
    requestAnimationFrameCallbacks.splice(id as number, 1); // Remove the stored callback
  });

  global.nativePerformanceNow = jest.fn(() => time);
};

export const resetTestTimers = () => {
  jest.clearAllMocks();
  requestAnimationFrameCallbacks = [];
  time = Date.now();
  frameIndex = 0;
};

export const advanceTime = (delta: number) => {
  time += delta;
  if (requestAnimationFrameCallbacks[frameIndex]) {
    requestAnimationFrameCallbacks[frameIndex](time);
    frameIndex++;
  }
};
