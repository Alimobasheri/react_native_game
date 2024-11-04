import { renderHook, act } from '@testing-library/react-native';
import { useSceneProvider } from './useSceneProvider';

describe('useSceneProvider', () => {
  it('should register a new scene and set its isActive state', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('newScene', true);
    });

    expect(result.current.activeScenes['newScene']).toBe(true);
  });

  it('should update isActive state when a scene is registered again', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('newScene', false);
    });

    expect(result.current.activeScenes['newScene']).toBe(false);

    act(() => {
      result.current.registerScene('newScene', true);
    });

    expect(result.current.activeScenes['newScene']).toBe(true);
  });

  it('should not modify other scene states when registering a new scene', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('newScene', true);
    });
    expect(result.current.activeScenes['newScene']).toBe(true);

    act(() => {
      result.current.registerScene('anotherScene', false);
    });

    expect(result.current.activeScenes['newScene']).toBe(true);
    expect(result.current.activeScenes['anotherScene']).toBe(false);
  });

  it('should handle multiple scenes and preserve their state correctly', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('sceneA', true);
      result.current.registerScene('sceneB', false);
    });

    expect(result.current.activeScenes['sceneA']).toBe(true);
    expect(result.current.activeScenes['sceneB']).toBe(false);
  });

  it('should allow switching between scenes', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('sceneA', true);
      result.current.registerScene('sceneB', true);
      result.current.switchScene('sceneB');
    });

    expect(result.current.activeScenes['sceneA']).toBe(false);
    expect(result.current.activeScenes['sceneB']).toBe(true);
  });

  it('should maintain history of scenes for back navigation', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('sceneA', true);
      result.current.registerScene('sceneB', false);
      result.current.registerScene('sceneC', false);
      result.current.pushScene('sceneB');
      result.current.pushScene('sceneC');
    });

    expect(result.current.activeScenes['sceneC']).toBe(true);

    act(() => {
      result.current.goBack();
    });

    expect(result.current.activeScenes['sceneB']).toBe(true);
    expect(result.current.activeScenes['sceneC']).toBe(false);

    act(() => {
      result.current.goBack();
    });

    expect(result.current.activeScenes['sceneA']).toBe(true);
    expect(result.current.activeScenes['sceneB']).toBe(false);
    expect(result.current.activeScenes['sceneC']).toBe(false);
  });

  it('should allow scenes to be deactivated manually', () => {
    const { result } = renderHook(() => useSceneProvider({}));

    act(() => {
      result.current.registerScene('sceneA', true);
    });

    expect(result.current.activeScenes['sceneA']).toBe(true);

    act(() => {
      result.current.registerScene('sceneA', false); // Deactivate sceneA
    });

    expect(result.current.activeScenes['sceneA']).toBe(false);
  });
});
