import { renderHook, act } from '@testing-library/react-native';
import { useSceneTransition } from './useSceneTransition';

describe('useSceneTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
  it('should initialize with correct values when active (fade)', () => {
    const { result } = renderHook(() =>
      useSceneTransition(true, 'fade', 'fade', { duration: 300 })
    );
    expect(result.current.props.opacity.value).toBe(0);
    expect(result.current.props.transform.value).toEqual([{ translateY: 0 }]);
  });

  it('should initialize with correct values when inactive (slide)', () => {
    const { result } = renderHook(() =>
      useSceneTransition(false, 'slide', 'slide', { duration: 300 })
    );
    expect(result.current.props.opacity.value).toBe(1);
    expect(result.current.props.transform.value).toEqual([{ translateY: 0 }]);
  });

  it('should correctly animate slide transition', () => {
    const { result } = renderHook(() =>
      useSceneTransition(true, 'slide', 'slide', { duration: 400 })
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.props.transform.value[0]).toStrictEqual({
      translateY: 150,
    });
  });

  it('should respect custom durations', () => {
    const { result } = renderHook(() =>
      useSceneTransition(true, 'fade', 'fade', { duration: 1000 })
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.props.opacity.value).toBe(0.5);
  });

  it('should handle instant transition when duration is zero', () => {
    const { result } = renderHook(() =>
      useSceneTransition(true, 'fade', 'fade', { duration: 0 })
    );
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(result.current.props.opacity.value).toBe(1);
  });

  it('should correctly animate zoom transition', () => {
    const { result } = renderHook(() =>
      useSceneTransition(true, 'zoom', 'zoom', { duration: 500 })
    );
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current.props.transform.value[0]).toStrictEqual({
      scale: 1.25,
    });
  });
});
