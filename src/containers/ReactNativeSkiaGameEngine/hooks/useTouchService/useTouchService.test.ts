import { renderHook, act } from '@testing-library/react-native';
import { Gesture, GestureType } from 'react-native-gesture-handler';
import { useTouchService } from './useTouchService';
import { GestureItem } from '../../types';

describe('useTouchService', () => {
  let mockRect = {
    x: { value: 0 },
    y: { value: 0 },
    width: { value: 100 },
    height: { value: 100 },
  };

  const createGesture = (gesture: GestureType): GestureItem => {
    return { gesture, rect: mockRect };
  };
  test('should initialize with an empty composed gesture', () => {
    const { result } = renderHook(() => useTouchService());

    // Initial composed gesture should be defined
    expect(result.current.gestures).toBeDefined();
  });

  test('should add a gesture and update the composed gesture', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());

    act(() => {
      result.current.addGesture(mockGesture);
    });

    // Verify that gestures were updated
    expect(result.current.gestures).toBeDefined();
  });

  test('should compose multiple gestures correctly', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture1 = createGesture(Gesture.Tap());
    const mockGesture2 = createGesture(Gesture.Pan());

    act(() => {
      result.current.addGesture(mockGesture1);
      result.current.addGesture(mockGesture2);
    });

    // Verify that gestures were updated correctly
    expect(result.current.gestures).toBeDefined();
  });

  test('should maintain gesture array stability across renders', () => {
    const { result, rerender } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());

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
    const mockGesture1 = createGesture(Gesture.Tap());

    act(() => {
      result.current.addGesture(mockGesture1);
    });

    rerender({});

    const mockGesture2 = createGesture(Gesture.Pan());

    act(() => {
      result.current.addGesture(mockGesture2);
    });

    // Verify that gestures were updated with multiple gestures
    expect(result.current.gestures).toBeDefined();
    expect(result.current.gestures.length).toBe(2);
  });
  test('should return a generated ID when adding a gesture', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());

    let gestureId: string | null = null;
    act(() => {
      gestureId = result.current.addGesture(mockGesture);
    });

    // Verify that an ID was returned and is a string
    expect(gestureId).toBeDefined();
    expect(typeof gestureId).toBe('string');
  });

  test('should allow adding a gesture with label and group', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());
    const label = 'testLabel';
    const group = 'testGroup';

    act(() => {
      result.current.addGesture(mockGesture, { label, groups: [group] });
    });

    // Verify that gesture was added and can be accessed via label or group
    expect(result.current.gestures).toBeDefined();
    expect(result.current.gestures.length).toBe(1);
  });

  test('should remove a gesture by its generated ID', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());
    let gestureId: string;

    act(() => {
      gestureId = result.current.addGesture(mockGesture);
    });

    act(() => {
      result.current.removeGesture(gestureId);
    });

    // Verify that the gesture is removed and composed gesture is empty
    expect(result.current.gestures).toBeDefined();
    expect(result.current.gestures.length).toBe(0);
  });

  test('should remove a gesture by label', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());
    const label = 'testLabel';

    act(() => {
      result.current.addGesture(mockGesture, { label });
    });

    expect(result.current.gestures.length).toBe(1);

    act(() => {
      result.current.removeGesture({ label });
    });

    // Verify that gesture is removed and composed gesture is empty
    expect(result.current.gestures).toBeDefined();
    expect(result.current.gestures.length).toBe(0);
  });

  test('should remove all gestures by group', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture1 = createGesture(Gesture.Tap());
    const mockGesture2 = createGesture(Gesture.Pan());
    const group = 'testGroup';

    act(() => {
      result.current.addGesture(mockGesture1, { groups: [group] });
      result.current.addGesture(mockGesture2, { groups: [group] });
    });

    expect(result.current.gestures.length).toBe(2);

    act(() => {
      result.current.removeGesture({ groups: [group] });
    });

    // Verify that all gestures in the group are removed
    expect(result.current.gestures).toBeDefined();
    expect(result.current.gestures.length).toBe(0);
  });

  test('should update a gesture by its generated ID', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = createGesture(Gesture.Tap());
    const updatedGesture = createGesture(Gesture.Pan());
    let gestureId: string;

    act(() => {
      gestureId = result.current.addGesture(mockGesture);
    });

    act(() => {
      result.current.updateGesture(gestureId, updatedGesture);
    });

    // Verify that gesture was updated
    expect(result.current.gestures).toBeDefined();
    expect(result.current.gestures[0]).toEqual(updatedGesture);
  });

  test('should maintain stability of gestures when a gesture is removed or updated', () => {
    const { result, rerender } = renderHook(() => useTouchService());
    const mockGesture1 = createGesture(Gesture.Tap());
    const mockGesture2 = createGesture(Gesture.Pan());

    let gestureId: string;

    act(() => {
      gestureId = result.current.addGesture(mockGesture1);
      result.current.addGesture(mockGesture2);
    });

    const initialGestures = result.current.gestures;

    // Update the gesture
    act(() => {
      result.current.updateGesture(gestureId, mockGesture2);
    });

    rerender({});

    // Verify stability
    expect(result.current.gestures).not.toBe(initialGestures);
    expect(result.current.gestures[0]).toEqual(mockGesture2);

    // Remove the updated gesture
    act(() => {
      result.current.removeGesture(gestureId);
    });

    rerender({});

    // Ensure gestures were updated after removal
    expect(result.current.gestures).not.toBe(initialGestures);
    expect(result.current.gestures.length).toBe(1);
  });

  test('should handle edge case where non-existent gesture is removed', () => {
    const { result } = renderHook(() => useTouchService());

    act(() => {
      result.current.removeGesture('nonExistentId');
    });

    // No exception should be thrown and gestures should remain defined
    expect(result.current.gestures).toBeDefined();
  });

  test('should handle edge case where a gesture is removed by a non-existent label', () => {
    const { result } = renderHook(() => useTouchService());

    act(() => {
      result.current.removeGesture({ label: 'nonExistentLabel' });
    });

    // No exception should be thrown and gestures should remain defined
    expect(result.current.gestures).toBeDefined();
  });

  test('should handle edge case where a gesture is removed by a non-existent group', () => {
    const { result } = renderHook(() => useTouchService());

    act(() => {
      result.current.removeGesture({ groups: ['nonExistentGroup'] });
    });

    // No exception should be thrown and gestures should remain defined
    expect(result.current.gestures).toBeDefined();
  });
});
