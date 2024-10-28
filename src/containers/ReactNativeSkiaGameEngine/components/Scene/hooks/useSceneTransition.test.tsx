import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSceneTransition } from './useSceneTransition';
import Animations from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { RNSGEContext } from '@/containers/ReactNativeSkiaGameEngine/context';
import { useCreateCamera } from '@/containers/ReactNativeSkiaGameEngine/hooks/useCreateCamera';
import {
  mockRequestAnimationFrame,
  resetTestTimers,
  advanceTime,
} from '@/containers/ReactNativeSkiaGameEngine/utils';
import { runOnJS, runOnUI } from 'react-native-reanimated';

jest.mock('react-native-reanimated', () => {
  return {
    ...jest.requireActual('react-native-reanimated'),
    runOnUI: jest.fn((fn) => fn),
  };
});
describe('useSceneTransition', () => {
  let mockAnimations: Animations;
  let mockRegisterAnimation: jest.SpyInstance;
  let mockUpdateAnimations: jest.SpyInstance;
  let mockContextValue: any;
  let wrapperComponent: any;
  let mockCamera: ReturnType<typeof useCreateCamera>;

  beforeEach(() => {
    mockRequestAnimationFrame();
    mockAnimations = new Animations();
    mockRegisterAnimation = jest.spyOn(mockAnimations, 'registerAnimation');
    mockUpdateAnimations = jest.spyOn(mockAnimations, 'updateAnimations');

    mockCamera = {
      camera: {
        x: { value: 0 },
        y: { value: 0 },
        width: { value: 300 },
        height: { value: 300 },
        opacity: { value: 1 },
        translateX: { value: 0 },
        translateY: { value: 0 },
        scaleX: { value: 1 },
        scaleY: { value: 1 },
        transform: {
          value: [
            { translateX: 0 },
            { translateY: 0 },
            { scaleX: 1 },
            { scaleY: 1 },
          ],
        },
      },
      resetCamera: jest.fn(),
    };

    mockContextValue = {
      animations: { current: mockAnimations },
    };
    wrapperComponent = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });
  it('should initialize with correct values when active (fade)', () => {
    const { result, unmount } = renderHook(
      () =>
        useSceneTransition({
          isActive: true,
          enter: 'fade',
          exit: 'fade',
          config: { duration: 300 },
          camera: mockCamera.camera,
        }),
      { wrapper: wrapperComponent }
    );
    expect(mockCamera.camera.opacity.value).toBe(0);
    unmount();
  });

  it('should initialize with correct values when inactive (slide)', () => {
    const { result, unmount } = renderHook(
      () =>
        useSceneTransition({
          isActive: false,
          enter: 'slide',
          exit: 'slide',
          config: { duration: 300 },
          camera: mockCamera.camera,
        }),
      { wrapper: wrapperComponent }
    );
    expect(mockCamera.camera.opacity.value).toBe(1);
    expect(
      mockCamera.camera.transform.value.find((t: object) =>
        t.hasOwnProperty('translateY')
      )
    ).toEqual({ translateY: 0 });
    unmount();
  });

  it('should correctly animate slide transition', async () => {
    const { rerender, unmount } = renderHook(
      () =>
        useSceneTransition({
          isActive: true,
          enter: 'slide',
          exit: 'slide',
          config: { duration: 400 },
          camera: mockCamera.camera,
        }),
      { wrapper: wrapperComponent }
    );
    act(() => {
      advanceTime(200, () => {
        mockAnimations.updateAnimations();
      });
    });
    await waitFor(() => {
      expect(mockUpdateAnimations).toHaveBeenCalled();
    });
    rerender({});
    await waitFor(
      () => {
        expect(mockCamera.camera.translateY.value).toEqual(150);
      },
      { timeout: 1000 }
    );
    unmount();
  });

  it('should respect custom durations', async () => {
    const { rerender, unmount } = renderHook(
      () =>
        useSceneTransition({
          isActive: true,
          enter: 'fade',
          exit: 'fade',
          config: { duration: 1000 },
          camera: mockCamera.camera,
        }),
      { wrapper: wrapperComponent }
    );
    act(() => {
      advanceTime(500, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender({});
    await waitFor(() => {
      expect(mockCamera.camera.opacity.value).toBe(0.5);
    });
    unmount();
  });

  it('should handle instant transition when duration is zero', async () => {
    const { rerender, unmount } = renderHook(
      () =>
        useSceneTransition({
          isActive: true,
          enter: 'fade',
          exit: 'fade',
          config: { duration: 0 },
          camera: mockCamera.camera,
        }),
      { wrapper: wrapperComponent }
    );
    rerender({});
    await waitFor(() => {
      expect(mockCamera.camera.opacity.value).toBe(1);
    });
    unmount();
  });

  it('should correctly animate zoom transition', async () => {
    const { rerender, unmount } = renderHook(
      () =>
        useSceneTransition({
          isActive: true,
          enter: 'zoom',
          exit: 'zoom',
          config: { duration: 500 },
          camera: mockCamera.camera,
        }),
      { wrapper: wrapperComponent }
    );
    act(() => {
      advanceTime(250, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender({});
    await waitFor(() => {
      expect(mockCamera.camera.scaleX.value).toBeCloseTo(1.25, 2);
      expect(mockCamera.camera.scaleY.value).toBeCloseTo(1.25, 2);
    });
    unmount();
  });
});
