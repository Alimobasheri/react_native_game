import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useSceneContext } from './useSceneContext';
import { SceneContext, IScenContextValue } from '../context/SceneContext';

describe('useSceneContext', () => {
  let mockContextValue: IScenContextValue;

  beforeEach(() => {
    mockContextValue = {
      activeScenes: { testScene: true },
      enableScene: jest.fn(),
      disableScene: jest.fn(),
      registerScene: jest.fn(),
      goBack: jest.fn(),
      switchScene: jest.fn(),
    };
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SceneContext.Provider value={mockContextValue}>
      {children}
    </SceneContext.Provider>
  );

  test('should return true if the scene is active', () => {
    const { result } = renderHook(() => useSceneContext('testScene', true), {
      wrapper,
    });

    expect(result.current.isActive).toBe(true);
  });

  test('should return false if the scene is not active', () => {
    const { result } = renderHook(
      () => useSceneContext('inactiveScene', false),
      { wrapper }
    );

    expect(result.current.isActive).toBe(false);
  });

  test('should throw an error if used outside of SceneProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn());

    // Expect the function to throw an error
    expect(() => renderHook(() => useSceneContext('testScene', true))).toThrow(
      'useSceneContext must be used within a SceneProvider'
    );
  });
});
