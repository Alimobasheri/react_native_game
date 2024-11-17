import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Scene } from './Scene';
import { IScenContextValue, SceneContext } from './context/SceneContext';
import { SceneProvider } from './provider/SceneProvider';
import { useSceneContext } from './hooks/useSceneContext';
import { Text } from 'react-native';
import { RNSGEContext } from '../../context';
import Animations from '../../services/Animations';
import {
  advanceTime,
  mockRequestAnimationFrame,
  resetTestTimers,
} from '../../utils';
import { useCreateCamera } from '../../hooks/useCreateCamera';
import {
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useDerivedValue,
} from 'react-native-reanimated';
import { createFadeTransition } from '../../utils/transitions/createFadeTransition';
import {
  createSlideTransition,
  SlideYDirection,
} from '../../utils/transitions/createSlideTransition';
import { createZoomTransition } from '../../utils/transitions/createZoomTransition';

jest.mock('./provider/SceneProvider');
jest.mock('./hooks/useSceneContext');
jest.mock('react-native-reanimated', () => {
  return {
    ...jest.requireActual('react-native-reanimated'),
    runOnUI: jest.fn((fn) => fn),
    useAnimatedReaction: jest.fn((prepare, fn) => fn(prepare())),
    useDerivedValue: jest.fn((fn) => ({
      value: fn(),
    })),
  };
});

describe('Scene', () => {
  let mockRNSGEWrapper: any;
  let mockAnimations: Animations;

  const mockSceneProvider = jest.fn();
  const mockUseSceneContext = jest.fn();

  const mockContextValue: IScenContextValue = {
    activeScenes: { testScene: true },
    enableScene: jest.fn(),
    disableScene: jest.fn(),
    switchScene: jest.fn(),
    goBack: jest.fn(),
    registerScene: jest.fn(),
    sceneCamera: {
      x: { value: 0 },
      y: { value: 0 },
      width: { value: 300 },
      height: { value: 300 },
      opacity: { value: 1 },
      translateX: { value: 0 },
      translateY: { value: 0 },
      scaleX: { value: 1 },
      scaleY: { value: 1 },
      rotate: { value: 0 },
      transform: {
        value: [
          { translateX: 0 },
          { translateY: 0 },
          { scaleX: 1 },
          { scaleY: 1 },
        ],
      },
    },
  };

  const registerSceneMock = jest.fn();
  const activeScenesMock = {
    defaultScene: true,
    otherScene: false,
  };

  beforeEach(() => {
    mockRequestAnimationFrame();
    mockAnimations = new Animations();
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

    mockRNSGEWrapper = ({ children }: any) => {
      return (
        <RNSGEContext.Provider
          // @ts-ignore
          value={{
            dimensions: { width: 300, height: 300 },
            animations: {
              current: mockAnimations,
            },
          }}
        >
          {children}
        </RNSGEContext.Provider>
      );
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });

  const RenderWithContext = (props = { isActive: false }) => (
    <SceneContext.Provider value={mockContextValue}>
      <Scene defaultSceneName="testScene" {...props}>
        <Text>Test Child Component</Text>
      </Scene>
    </SceneContext.Provider>
  );

  test('should render the SceneProvider if the scene is active', () => {
    const { getByText } = render(<RenderWithContext isActive />, {
      wrapper: mockRNSGEWrapper,
    });

    expect(SceneProvider).toHaveBeenCalled();
    expect(getByText('Test Child Component')).toBeTruthy();
  });

  test('should not render the SceneProvider if the scene is not active', () => {
    // Set the mock to return inactive state
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { queryByText } = render(<RenderWithContext isActive={false} />, {
      wrapper: mockRNSGEWrapper,
    });

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
      </SceneContext.Provider>,
      { wrapper: mockRNSGEWrapper }
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
      </SceneContext.Provider>,
      { wrapper: mockRNSGEWrapper }
    );

    expect(queryByText('Parent Scene Content')).toBeNull();
    expect(queryByText('Nested Scene Content')).toBeNull(); // Should not render since parent is inactive
  });

  test('should update rendering when scene becomes active', () => {
    mockUseSceneContext.mockReturnValueOnce({ isActive: false });

    const { rerender, queryByText, getByText } = render(
      <RenderWithContext isActive={false} />,
      { wrapper: mockRNSGEWrapper }
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
      </SceneContext.Provider>,
      { wrapper: mockRNSGEWrapper }
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
      </SceneContext.Provider>,
      { wrapper: mockRNSGEWrapper }
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
      </SceneContext.Provider>,
      { wrapper: mockRNSGEWrapper }
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should apply fade transition with correct opacity during activation', async () => {
    const transition = createFadeTransition();
    const { getByTestId, rerender, unmount } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="fadeScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>,
      { wrapper: mockRNSGEWrapper }
    );

    const scene = getByTestId('scene');
    await waitFor(() => {
      expect(scene.props.opacity.value).toBe(0);
    });

    act(() => {
      advanceTime(150, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="fadeScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );
    await waitFor(() => {
      expect(scene.props.opacity.value).toBe(0.5);
    });

    act(() => {
      advanceTime(150, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="fadeScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );
    await waitFor(() => {
      expect(scene.props.opacity.value).toBe(1);
    });
    unmount();
  });

  it('should apply slide transition with correct translateY during activation', async () => {
    const transition = createSlideTransition({ y: SlideYDirection.Down });
    const { getByTestId, unmount, rerender } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="slideScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>,
      { wrapper: mockRNSGEWrapper }
    );

    const scene = getByTestId('scene');
    await waitFor(() => {
      expect(
        scene.props.transform.value.findLast((t: object) =>
          t.hasOwnProperty('translateY')
        ).translateY
      ).toBe(300);
    });

    act(() => {
      advanceTime(150, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="slideScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );
    await waitFor(() => {
      expect(
        scene.props.transform.value.find((t: object) =>
          t.hasOwnProperty('translateY')
        ).translateY
      ).toBe(150);
    });

    act(() => {
      advanceTime(150, () => {
        mockAnimations.updateAnimations();
      });
    });
    await waitFor(() => {
      expect(
        scene.props.transform.value.findLast((t: object) =>
          t.hasOwnProperty('translateY')
        ).translateY
      ).toBe(0);
    });

    unmount();
  });

  it('should apply zoom transition with correct scale during activation', () => {
    const transition = createZoomTransition({ from: 1.5, to: 1 });
    const { getByTestId, rerender, unmount } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="zoomScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
        />
      </SceneProvider>,
      { wrapper: mockRNSGEWrapper }
    );

    const scene = getByTestId('scene');
    expect(
      scene.props.transform.value.find((t: object) =>
        t.hasOwnProperty('scaleX')
      ).scaleX
    ).toBe(1.5);

    act(() => {
      advanceTime(250, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="zoomScene"
          isActive={true}
          enter={transition}
          exit={transition}
          rootComponentProps={{ testID: 'scene' }}
        />
      </SceneProvider>
    );
    expect(
      scene.props.transform.value.find((t: object) =>
        t.hasOwnProperty('scaleX')
      ).scaleX
    ).toBeCloseTo(1.25);

    act(() => {
      advanceTime(250, () => {
        mockAnimations.updateAnimations();
      });
    });
    expect(
      scene.props.transform.value.find((t: object) =>
        t.hasOwnProperty('scaleX')
      ).scaleX
    ).toBe(1);

    unmount();
  });

  it('should respect custom durations for transitions', () => {
    const { getByTestId, rerender, unmount } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="customScene"
          isActive={true}
          enter={createFadeTransition()}
          exit={createFadeTransition()}
          transitionConfig={{ duration: 1000 }}
          rootComponentProps={{ testID: 'scene' }}
        />
      </SceneProvider>,
      { wrapper: mockRNSGEWrapper }
    );

    const scene = getByTestId('scene');
    expect(scene.props.opacity.value).toBe(0);

    act(() => {
      advanceTime(500, () => {
        mockAnimations.updateAnimations();
      });
    });
    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="customScene"
          isActive={true}
          enter={createFadeTransition()}
          exit={createFadeTransition()}
          transitionConfig={{ duration: 1000 }}
          rootComponentProps={{ testID: 'scene' }}
        />
      </SceneProvider>
    );
    expect(scene.props.opacity.value).toBeCloseTo(0.5);

    act(() => {
      advanceTime(500, () => {
        mockAnimations.updateAnimations();
      });
    });
    expect(scene.props.opacity.value).toBe(1);
    unmount();
  });

  it('should not re-animate when isActive state is unchanged', () => {
    const { getByTestId, rerender } = render(
      <SceneProvider>
        <Scene
          defaultSceneName="rerenderScene"
          isActive={true}
          enter={createFadeTransition()}
          exit={createFadeTransition()}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>,
      { wrapper: mockRNSGEWrapper }
    );

    const scene = getByTestId('scene');
    expect(scene.props.opacity.value).toBe(0);

    act(() => {
      advanceTime(300, () => {
        mockAnimations.updateAnimations();
      });
    });

    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="rerenderScene"
          isActive={true}
          enter={createFadeTransition()}
          exit={createFadeTransition()}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );

    expect(scene.props.opacity.value).toBeCloseTo(1);

    rerender(
      <SceneProvider>
        <Scene
          defaultSceneName="rerenderScene"
          isActive={true}
          enter={createFadeTransition()}
          exit={createFadeTransition()}
          rootComponentProps={{ testID: 'scene' }}
          transitionConfig={{ duration: 300 }}
        />
      </SceneProvider>
    );

    // Ensure the opacity hasn't changed and no additional animation triggered
    expect(scene.props.opacity.value).toBe(1);
  });
});
