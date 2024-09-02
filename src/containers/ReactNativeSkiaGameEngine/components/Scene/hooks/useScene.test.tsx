import { renderHook, act } from '@testing-library/react-native';
import { useScene } from './useScene';
import { SceneContext } from '../context/SceneContext';

describe('useScene', () => {
  const mockEnableScene = jest.fn();
  const mockDisableScene = jest.fn();

  const mockContextValue = {
    activeScenes: { testScene: true },
    enableScene: mockEnableScene,
    disableScene: mockDisableScene,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SceneContext.Provider value={mockContextValue}>
      {children}
    </SceneContext.Provider>
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return the correct scene context values', () => {
    const { result } = renderHook(() => useScene(), { wrapper });

    expect(result.current.activeScenes).toEqual(mockContextValue.activeScenes);
    expect(result.current.enableScene).toBe(mockEnableScene);
    expect(result.current.disableScene).toBe(mockDisableScene);
  });

  test('should enable a scene correctly', () => {
    const { result } = renderHook(() => useScene(), { wrapper });

    act(() => {
      result.current.enableScene('testScene');
    });

    expect(mockEnableScene).toHaveBeenCalledWith('testScene');
  });

  test('should disable a scene correctly', () => {
    const { result } = renderHook(() => useScene(), { wrapper });

    act(() => {
      result.current.disableScene('testScene');
    });

    expect(mockDisableScene).toHaveBeenCalledWith('testScene');
  });

  test('should throw an error if used outside of SceneContext', () => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn());

    // Expect the function to throw an error
    expect(() => renderHook(() => useScene())).toThrow(
      'useScene must be used within a SceneProvider'
    );
  });
});
