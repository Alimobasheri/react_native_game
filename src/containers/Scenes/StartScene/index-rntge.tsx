import {
  Asset,
  Content,
  Preload,
  Scene,
} from '@/containers/ReactNativeSkiaGameEngine';
import {
  swimmerIconCrownGold,
  swimmerIconShopCart,
  swimmerTapCursorSprite,
  swimmerTitleFloodRush,
  swimmerUiBtnStartGreen,
  swimmerUiChipPanel,
  SWIMMER_UI_IMAGE,
} from '@/assets/swimmerUi';
import { FC } from 'react';
import { BestScoreChip } from './BestScoreChip-rntge';
import { PrimaryCTAButton } from './PrimaryCTAButton-rntge';
import { ReadySceneController } from './ReadySceneController-rntge';
import { ShopButton } from './ShopButton-rntge';
import { StartTitleLogo } from './StartTitleLogo-rntge';
import { TapTutorialHint } from './TapTutorialHint-rntge';

export type StartSceneProps = {
  gameTitle?: string;
  shopEnabled?: boolean;
  gameplayRaisingSpeed: number;
};

const StartOverlayContent: FC<StartSceneProps> = (props) => (
  <>
    <StartTitleLogo />
    <BestScoreChip />
    <ShopButton enabled={props.shopEnabled ?? false} />
    <TapTutorialHint />
    <PrimaryCTAButton />
  </>
);

export const StartScene: FC<StartSceneProps> = ({
  gameTitle = 'FLOOD RUSH',
  shopEnabled = false,
  gameplayRaisingSpeed,
}) => {
  const sceneProps = {
    gameTitle,
    shopEnabled,
    gameplayRaisingSpeed,
  };

  return (
    <Scene name="start" zIndex={10} isActive={true}>
      <Preload>
        <Asset
          id="Fredoka"
          type="font"
          family="Fredoka"
          resource={require('../../../../assets/fonts/Fredoka-Bold.ttf')}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.titleFloodRush}
          uriOrBase64={swimmerTitleFloodRush}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.uiBtnStartGreen}
          uriOrBase64={swimmerUiBtnStartGreen}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.uiChipPanel}
          uriOrBase64={swimmerUiChipPanel}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.iconCrownGold}
          uriOrBase64={swimmerIconCrownGold}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.iconShopCart}
          uriOrBase64={swimmerIconShopCart}
        />
        <Asset
          type="image"
          name={SWIMMER_UI_IMAGE.tapCursorSprite}
          uriOrBase64={swimmerTapCursorSprite}
        />
      </Preload>
      <Content>
        <ReadySceneController {...sceneProps}>
          <StartOverlayContent {...sceneProps} />
        </ReadySceneController>
      </Content>
    </Scene>
  );
};
