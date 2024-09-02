import React from 'react';
import { render } from '@testing-library/react-native';
import { Scene } from './Scene';
import { SceneContext } from './context/SceneContext';
import { SceneProvider } from './provider/SceneProvider';
import { useSceneContext } from './hooks/useSceneContext';
import { Text } from 'react-native';

jest.mock('./provider/SceneProvider');
jest.mock('./hooks/useSceneContext');

describe('Scene', () => {
  const mockSceneProvider = jest.fn();
  const mockUseSceneContext = jest.fn();

  const mockContextValue = {
    activeScenes: { testScene: true },
    enableScene: jest.fn(),
    disableScene: jest.fn(),
  };

  beforeEach(() => {
    (SceneProvider as jest.Mock).mockImplementation(({ children }) => (
      <>{children}</>
    ));
    mockUseSceneContext.mockReturnValue({ isActive: true });
    (useSceneContext as jest.Mock).mockImplementation(mockUseSceneContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const RenderWithContext = (props = {}) => (
    <SceneContext.Provider value={mockContextValue}>
      <Scene defaultSceneName="testScene" {...props}>
        <Text>Test Child Component</Text>
      </Scene>
    </SceneContext.Provider>
  );

  test('should render the SceneProvider if the scene is active', () => {
    const { getByText } = render(<RenderWithContext />);

    expect(SceneProvider).toHaveBeenCalledWith(
      expect.objectContaining({ defaultSceneName: 'testScene' }),
      expect.anything()
    );
    expect(getByText('Test Child Component')).toBeTruthy();
  });

  test('should not render the SceneProvider if the scene is not active', () => {
    // Set the mock to return inactive state
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { queryByText } = render(<RenderWithContext />);

    expect(SceneProvider).not.toHaveBeenCalled();
    expect(queryByText('Test Child Component')).toBeNull();
  });

  test('should correctly render nested scenes when both are active', () => {
    mockUseSceneContext.mockReturnValue({ isActive: true });

    const { getByText } = render(
      <Scene defaultSceneName="parentScene">
        <Scene defaultSceneName="nestedScene">
          <Text>Nested Scene Content</Text>
        </Scene>
        <Text>Parent Scene Content</Text>
      </Scene>
    );

    expect(getByText('Parent Scene Content')).toBeTruthy();
    expect(getByText('Nested Scene Content')).toBeTruthy();
  });

  test('should not render nested scene if parent is inactive', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false }); // Mock parent inactive

    const { queryByText } = render(
      <Scene defaultSceneName="parentScene">
        <Scene defaultSceneName="nestedScene">
          <Text>Nested Scene Content</Text>
        </Scene>
        <Text>Parent Scene Content</Text>
      </Scene>
    );

    expect(queryByText('Parent Scene Content')).toBeNull();
    expect(queryByText('Nested Scene Content')).toBeNull(); // Should not render since parent is inactive
  });

  test('should update rendering when scene becomes active', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { rerender, queryByText, getByText } = render(<RenderWithContext />);

    // Initially inactive
    expect(queryByText('Test Child Component')).toBeNull();

    // Become active
    mockUseSceneContext.mockReturnValueOnce({ isActive: true });
    rerender(<RenderWithContext />);
    expect(getByText('Test Child Component')).toBeTruthy();
  });

  test('should render complex nested scenes with dynamic states', () => {
    mockUseSceneContext
      .mockReturnValueOnce({ isActive: true }) // Parent active
      .mockReturnValueOnce({ isActive: false }); // Nested inactive

    const { getByText, queryByText } = render(
      <Scene defaultSceneName="parentScene">
        <Text>Parent Scene Content</Text>
        <Scene defaultSceneName="nestedScene">
          <Text>Nested Scene Content</Text>
          <Scene defaultSceneName="deeplyNestedScene">
            <Text>Deeply Nested Scene Content</Text>
          </Scene>
        </Scene>
      </Scene>
    );

    expect(getByText('Parent Scene Content')).toBeTruthy();
    expect(queryByText('Nested Scene Content')).toBeNull(); // Nested is inactive
    expect(queryByText('Deeply Nested Scene Content')).toBeNull(); // Deeply nested should not render
  });

  test('should match the snapshot for a nested active scene', () => {
    mockUseSceneContext.mockReturnValue({ isActive: true });

    const { toJSON } = render(
      <Scene defaultSceneName="parentScene">
        <Scene defaultSceneName="nestedScene">
          <Text>Nested Scene Content</Text>
        </Scene>
        <Text>Parent Scene Content</Text>
      </Scene>
    );

    expect(toJSON()).toMatchSnapshot();
  });

  test('should match the snapshot for a nested inactive scene', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { toJSON } = render(
      <Scene defaultSceneName="parentScene">
        <Scene defaultSceneName="nestedScene">
          <Text>Nested Scene Content</Text>
        </Scene>
        <Text>Parent Scene Content</Text>
      </Scene>
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
