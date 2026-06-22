import {
  Asset,
  Content,
  Preload,
  Scene,
} from '@/containers/ReactNativeSkiaGameEngine';
import {
  SWIMMER_UI_IMAGE,
  swimmerPlayVideoIcon,
  swimmerRetryIcon,
  swimmerUiBtnBlue,
  swimmerUiBtnGolden,
} from '@/assets/swimmerUi';
import type { SafeAreaInsets } from '@/Game/ui/refLayout';
import { FC } from 'react';
import { GameOverDimLayer } from './GameOverDimLayer-rntge';
import { GameOverOverlayController } from './GameOverOverlayController-rntge';
import { GameOverPanel } from './GameOverPanel-rntge';

export type GameOverSceneProps = {
  safeAreaInsets: SafeAreaInsets;
};

export const GameOverScene: FC<GameOverSceneProps> = ({ safeAreaInsets }) => {
  return (
    <Scene name="gameOver" zIndex={20} isActive={true}>
      <Preload>
        <Asset
          id="Fredoka"
          type="font"
          family="Fredoka"
          resource={require('../../../../assets/fonts/Fredoka-Bold.ttf')}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.uiBtnBlue}
          uriOrBase64={swimmerUiBtnBlue}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.uiBtnGolden}
          uriOrBase64={swimmerUiBtnGolden}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.retryIcon}
          uriOrBase64={swimmerRetryIcon}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.playVideoIcon}
          uriOrBase64={swimmerPlayVideoIcon}
        />
      </Preload>
      <Content>
        <GameOverOverlayController safeAreaInsets={safeAreaInsets}>
          <GameOverDimLayer insets={safeAreaInsets} />
          <GameOverPanel insets={safeAreaInsets} />
        </GameOverOverlayController>
      </Content>
    </Scene>
  );
};
