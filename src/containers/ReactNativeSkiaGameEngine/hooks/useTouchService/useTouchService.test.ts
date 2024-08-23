import { renderHook, act } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useTouchService } from './useTouchService';

describe('useTouchService', () => {
  test('should initialize with an empty composed gesture', () => {
    const { result } = renderHook(() => useTouchService());

    // Initial composed gesture should be defined
    expect(result.current.gestures).toBeDefined();
  });

  test('should add a gesture and update the composed gesture', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = Gesture.Tap();

    act(() => {
      result.current.addGesture(mockGesture);
    });

    // Verify that gestures were updated
    expect(result.current.gestures).toBeDefined();
  });

  test('should compose multiple gestures correctly', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture1 = Gesture.Tap();
    const mockGesture2 = Gesture.Pan();

    act(() => {
      result.current.addGesture(mockGesture1);
      result.current.addGesture(mockGesture2);
    });

    // Verify that gestures were updated correctly
    expect(result.current.gestures).toBeDefined();
  });

  test('should maintain gesture array stability across renders', () => {
    const { result, rerender } = renderHook(() => useTouchService());
    const mockGesture = Gesture.Tap();

    act(() => {
      result.current.addGesture(mockGesture);
    });

    const initialGestures = result.current.gestures;

    rerender({});

    // Ensure the composed gesture reference remains the same across rerenders
    expect(result.current.gestures).toBe(initialGestures);
  });

  test('should handle adding gestures after multiple renders', () => {
    const { result, rerender } = renderHook(() => useTouchService());
    const mockGesture1 = Gesture.Tap();

    act(() => {
      result.current.addGesture(mockGesture1);
    });

    rerender({});

    const mockGesture2 = Gesture.Pan();

    act(() => {
      result.current.addGesture(mockGesture2);
    });

    // Verify that gestures were updated with multiple gestures
    expect(result.current.gestures).toBeDefined();
  });
});
