import { Frames, FrameUpdateEvent } from './Frames';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

const oneFrameInMilliseconds = 1000 / 60;
const oneFrameIn30fps = 1000 / 30;

describe('Frames', () => {
  let frames: Frames;

  beforeEach(() => {
    frames = new Frames();
  });

  test('should initialize with currentFrame set to 0', () => {
    expect(frames.currentFrame).toBe(0);
  });

  test('should increment currentFrame based on fps and delta', () => {
    frames.updateFrame(60, oneFrameInMilliseconds); // Assuming 60 fps and 16ms per frame

    expect(frames.currentFrame).toBe(1); // 1 frame should have passed
  });

  test('should emit FrameUpdateEvent with delta when frame is updated', () => {
    const mockListener = jest.fn();
    frames.addListener(FrameUpdateEvent, mockListener);

    frames.updateFrame(60, oneFrameInMilliseconds); // 60 fps and 16ms per frame

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(oneFrameInMilliseconds);
  });

  test('should handle multiple frame updates correctly', () => {
    frames.updateFrame(60, oneFrameInMilliseconds); // 1st update
    frames.updateFrame(60, oneFrameInMilliseconds); // 2nd update

    expect(frames.currentFrame).toBe(2); // 2 frames should have passed
  });

  test('should not emit FrameUpdateEvent if there are no listeners', () => {
    const spyEmit = jest.spyOn(frames, 'emit');
    frames.updateFrame(60, oneFrameInMilliseconds);

    expect(spyEmit).toHaveBeenCalledTimes(1);
    expect(spyEmit).toHaveBeenCalledWith(
      FrameUpdateEvent,
      oneFrameInMilliseconds
    );
  });

  test('should handle edge cases where delta is extremely small', () => {
    frames.updateFrame(60, 0.01); // Very small delta

    expect(frames.currentFrame).toBe(0); // Frame should not increment
  });

  test('should correctly handle very large delta values', () => {
    frames.updateFrame(60, 5000); // 5 seconds delta at 60 fps
    expect(frames.currentFrame).toBe(300); // 300 frames should have passed
  });

  test('should correctly calculate frame increment based on different fps values', () => {
    frames.updateFrame(30, oneFrameIn30fps); // 30 fps and 33ms per frame

    expect(frames.currentFrame).toBe(1); // 1 frame should have passed

    frames.updateFrame(30, oneFrameIn30fps);
    expect(frames.currentFrame).toBe(2); // 2 frames should have passed
  });
});
