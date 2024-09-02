import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SceneContext, IScenContextValue } from './SceneContext';

describe('SceneContext', () => {
  let initialContextValue: IScenContextValue;

  beforeEach(() => {
    initialContextValue = {
      activeScenes: {},
      enableScene: jest.fn((name: string) => {
        initialContextValue.activeScenes[name] = true;
      }),
      disableScene: jest.fn((name: string) => {
        initialContextValue.activeScenes[name] = false;
      }),
    };
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SceneContext.Provider value={initialContextValue}>
      {children}
    </SceneContext.Provider>
  );

  test('should provide initial activeScenes value', () => {
    const { result } = renderHook(() => React.useContext(SceneContext), {
      wrapper,
    });

    expect(result.current?.activeScenes).toEqual({});
  });

  test('should enable a scene correctly', () => {
    const { result } = renderHook(() => React.useContext(SceneContext), {
      wrapper,
    });

    act(() => {
      result.current?.enableScene('testScene');
    });

    expect(result.current?.activeScenes['testScene']).toBe(true);
  });

  test('should disable a scene correctly', () => {
    const { result } = renderHook(() => React.useContext(SceneContext), {
      wrapper,
    });

    act(() => {
      result.current?.disableScene('testScene');
    });

    expect(result.current?.activeScenes['testScene']).toBe(false);
  });

  test('should handle multiple scenes independently', () => {
    const { result } = renderHook(() => React.useContext(SceneContext), {
      wrapper,
    });

    act(() => {
      result.current?.enableScene('scene1');
      result.current?.enableScene('scene2');
    });

    expect(result.current?.activeScenes['scene1']).toBe(true);
    expect(result.current?.activeScenes['scene2']).toBe(true);

    act(() => {
      result.current?.disableScene('scene1');
    });

    expect(result.current?.activeScenes['scene1']).toBe(false);
    expect(result.current?.activeScenes['scene2']).toBe(true);
  });
});
