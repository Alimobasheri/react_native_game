import React from 'react';
import { render } from '@testing-library/react-native';
import { SceneProvider } from './SceneProvider';
import { SceneContext } from '../context/SceneContext';
import { Text, View } from 'react-native';
import { useSceneProvider } from './useSceneProvider';

jest.mock('./useSceneProvider');

describe('SceneProvider', () => {
  const defaultSceneName = 'testScene';
  const mockUseSceneProvider = jest.fn();

  beforeEach(() => {
    mockUseSceneProvider.mockReturnValue({
      activeScenes: { [defaultSceneName]: true },
      enableScene: jest.fn(),
      disableScene: jest.fn(),
    });
    (useSceneProvider as jest.Mock).mockImplementation(mockUseSceneProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  test('should provide the correct context value', () => {
    const { getByTestId } = render(
      <SceneProvider defaultSceneName={defaultSceneName}>
        <SceneContext.Consumer>
          {(value) => (
            <React.Fragment>
              <View testID="active-scenes">
                {JSON.stringify(value?.activeScenes)}
              </View>
            </React.Fragment>
          )}
        </SceneContext.Consumer>
      </SceneProvider>
    );

    expect(getByTestId('active-scenes').children[0]).toEqual(
      JSON.stringify({ [defaultSceneName]: true })
    );
  });

  test('should render children components', () => {
    const { getByText } = render(
      <SceneProvider defaultSceneName={defaultSceneName}>
        <Text>Test Child Component</Text>
      </SceneProvider>
    );

    expect(getByText('Test Child Component')).toBeTruthy();
  });

  test('should call useSceneProvider with the correct default scene name', () => {
    render(
      <SceneProvider defaultSceneName={defaultSceneName}>
        <Text>Test Child Component</Text>
      </SceneProvider>
    );

    expect(mockUseSceneProvider).toHaveBeenCalledWith({ defaultSceneName });
  });
});
