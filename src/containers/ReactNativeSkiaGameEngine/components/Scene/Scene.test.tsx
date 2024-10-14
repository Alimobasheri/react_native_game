import React, { act } from 'react';
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
    switchScene: jest.fn(),
    goBack: jest.fn(),
    registerScene: jest.fn(),
  };

  const registerSceneMock = jest.fn();
  const activeScenesMock = {
    defaultScene: true,
    otherScene: false,
  };

  beforeEach(() => {
    jest.useFakeTimers(); // Enable fake timers for animation control
    (SceneProvider as jest.Mock).mockImplementation(({ children }) => (
      <>{children}</>
    ));
    mockUseSceneContext.mockReturnValue({ isActive: true });
    (useSceneContext as jest.Mock).mockImplementation(mockUseSceneContext);
    jest
      .spyOn(require('@shopify/react-native-skia'), 'rect')
      .mockImplementation(() => {
        return { x: 0, y: 0, width: 300, height: 300 };
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers(); // Reset back to real timers
  });

  const RenderWithContext = (props = { isActive: false }) => (
    <SceneContext.Provider value={mockContextValue}>
      <Scene defaultSceneName="testScene" {...props}>
        <Text>Test Child Component</Text>
      </Scene>
    </SceneContext.Provider>
  );

  test('should render the SceneProvider if the scene is active', () => {
    const { getByText } = render(<RenderWithContext isActive />);

    expect(SceneProvider).toHaveBeenCalled();
    expect(getByText('Test Child Component')).toBeTruthy();
  });

  test('should not render the SceneProvider if the scene is not active', () => {
    // Set the mock to return inactive state
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { queryByText } = render(<RenderWithContext isActive={false} />);

    expect(SceneProvider).not.toHaveBeenCalled();
    expect(queryByText('Test Child Component')).toBeNull();
  });

  test('should correctly render nested scenes when both are active', () => {
    mockUseSceneContext.mockReturnValue({ isActive: true });

    const { getByText } = render(
      <SceneContext.Provider value={mockContextValue}>
        <Scene defaultSceneName="parentScene">
          <Scene defaultSceneName="nestedScene">
            <Text>Nested Scene Content</Text>
          </Scene>
          <Text>Parent Scene Content</Text>
        </Scene>
      </SceneContext.Provider>
    );

    expect(getByText('Parent Scene Content')).toBeTruthy();
    expect(getByText('Nested Scene Content')).toBeTruthy();
  });

  test('should not render nested scene if parent is inactive', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false }); // Mock parent inactive

    const { queryByText } = render(
      <SceneContext.Provider value={mockContextValue}>
        <Scene defaultSceneName="parentScene">
          <Scene defaultSceneName="nestedScene">
            <Text>Nested Scene Content</Text>
          </Scene>
          <Text>Parent Scene Content</Text>
        </Scene>
      </SceneContext.Provider>
    );

    expect(queryByText('Parent Scene Content')).toBeNull();
    expect(queryByText('Nested Scene Content')).toBeNull(); // Should not render since parent is inactive
  });

  test('should update rendering when scene becomes active', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { rerender, queryByText, getByText } = render(
      <RenderWithContext isActive={false} />
    );

    // Initially inactive
    expect(queryByText('Test Child Component')).toBeNull();

    // Become active
    mockUseSceneContext.mockReturnValueOnce({ isActive: true });
    rerender(<RenderWithContext isActive={true} />);
    expect(getByText('Test Child Component')).toBeTruthy();
  });

  test('should render complex nested scenes with dynamic states', () => {
    mockUseSceneContext
      .mockReturnValueOnce({ isActive: true }) // Parent active
      .mockReturnValueOnce({ isActive: false }); // Nested inactive

    const { getByText, queryByText } = render(
      <SceneContext.Provider value={mockContextValue}>
        <Scene defaultSceneName="parentScene">
          <Text>Parent Scene Content</Text>
          <Scene defaultSceneName="nestedScene">
            <Text>Nested Scene Content</Text>
            <Scene defaultSceneName="deeplyNestedScene">
              <Text>Deeply Nested Scene Content</Text>
            </Scene>
          </Scene>
        </Scene>
      </SceneContext.Provider>
    );

    expect(getByText('Parent Scene Content')).toBeTruthy();
    expect(queryByText('Nested Scene Content')).toBeNull(); // Nested is inactive
    expect(queryByText('Deeply Nested Scene Content')).toBeNull(); // Deeply nested should not render
  });

  test('should match the snapshot for a nested active scene', () => {
    mockUseSceneContext.mockReturnValue({ isActive: true });

    const { toJSON } = render(
      <SceneContext.Provider value={mockContextValue}>
        <Scene defaultSceneName="parentScene">
          <Scene defaultSceneName="nestedScene">
            <Text>Nested Scene Content</Text>
          </Scene>
          <Text>Parent Scene Content</Text>
        </Scene>
      </SceneContext.Provider>
    );

    expect(toJSON()).toMatchSnapshot();
  });

  test('should match the snapshot for a nested inactive scene', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { toJSON } = render(
      <SceneContext.Provider value={mockContextValue}>
        <Scene defaultSceneName="parentScene">
          <Scene defaultSceneName="nestedScene">
            <Text>Nested Scene Content</Text>
          </Scene>
          <Text>Parent Scene Content</Text>
        </Scene>
      </SceneContext.Provider>
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should apply fade transition with correct opacity during activation', () => {
    const { getByTestId } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="fadeScene"
          isActive={true}
          enter="fade"
          exit="fade"
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );

    const scene = getByTestId('scene');
    expect(scene.props.opacity.value).toBe(0);

    jest.advanceTimersByTime(150);
    expect(scene.props.opacity.value).toBeCloseTo(0.5);

    jest.advanceTimersByTime(150);
    expect(scene.props.opacity.value).toBe(1);
  });

  it('should apply slide transition with correct translateY during activation', () => {
    const { getByTestId } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="slideScene"
          isActive={true}
          enter="slide"
          exit="slide"
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );

    const scene = getByTestId('scene');
    expect(scene.props.transform.value[0].translateY).toBe(300);

    jest.advanceTimersByTime(150);
    expect(scene.props.transform.value[0].translateY).toBeCloseTo(150);

    jest.advanceTimersByTime(150);
    expect(scene.props.transform.value[0].translateY).toBe(0);
  });

  it('should apply zoom transition with correct scale during activation', () => {
    const { getByTestId } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="zoomScene"
          isActive={true}
          enter="zoom"
          exit="zoom"
          rootComponentProps={{ testID: 'scene' }}
        />
      </SceneProvider>
    );

    const scene = getByTestId('scene');
    expect(scene.props.transform.value[0].scale).toBe(1.5);

    jest.advanceTimersByTime(250);
    expect(scene.props.transform.value[0].scale).toBeCloseTo(1.25);

    jest.advanceTimersByTime(250);
    expect(scene.props.transform.value[0].scale).toBe(1);
  });

  it('should respect custom durations for transitions', () => {
    const { getByTestId } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="customScene"
          isActive={true}
          enter="fade"
          exit="fade"
          transitionConfig={{ duration: 1000 }}
          rootComponentProps={{ testID: 'scene' }}
        />
      </SceneProvider>
    );

    const scene = getByTestId('scene');
    expect(scene.props.opacity.value).toBe(0);

    jest.advanceTimersByTime(500);
    expect(scene.props.opacity.value).toBeCloseTo(0.5);

    jest.advanceTimersByTime(500);
    expect(scene.props.opacity.value).toBe(1);
  });

  it('should not re-animate when isActive state is unchanged', () => {
    const { getByTestId, rerender } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="rerenderScene"
          isActive={true}
          enter="fade"
          exit="fade"
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );

    const scene = getByTestId('scene');
    expect(scene.props.opacity.value).toBe(0);

    jest.advanceTimersByTime(300);

    expect(scene.props.opacity.value).toBeCloseTo(1);

    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="rerenderScene"
          isActive={true}
          enter="fade"
          exit="fade"
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );

    // Ensure the opacity hasn't changed and no additional animation triggered
    expect(scene.props.opacity.value).toBe(1);
  });
});
