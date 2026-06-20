import {
  GAMEPLAY_CHANNEL_WIDTH_FRACTION,
  SWIMMER_UI_REF,
} from '@/assets/swimmerUi';
import { refSize } from '@/Game/ui/refLayout';

/** Left/right tap-cursor anchor X (screen coords). Worklet-safe for StartScreenSystem. */
export function getTapCursorChannelPositions(
  screenW: number,
  screenH: number
): { tapLeftX: number; tapRightX: number } {
  'worklet';
  const margin = refSize(
    SWIMMER_UI_REF.tapCursorChannelMargin,
    screenW,
    screenH
  );
  const channelLeft = (screenW * (1 - GAMEPLAY_CHANNEL_WIDTH_FRACTION)) / 2;
  const channelRight = screenW - channelLeft;
  return {
    tapLeftX: channelLeft + margin,
    tapRightX: channelRight - margin,
  };
}
