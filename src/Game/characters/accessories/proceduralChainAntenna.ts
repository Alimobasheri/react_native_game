import { secondaryItemTuning } from '@/config/secondaryItemTuning';
import type {
  ProceduralChainAccessoryState,
  SecondaryItemLayerSink,
} from '../secondaryItemTypes';

export const createProceduralChainAccessoryState =
  (): ProceduralChainAccessoryState => {
    'worklet';
    return {
      kind: 'ProceduralChain',
      segmentAngles: [0, 0, 0],
      compositeOffsetX: 0,
      compositeOffsetY: 0,
    };
  };

export const updateProceduralChainAccessory = (
  state: ProceduralChainAccessoryState,
  velocityX: number,
  dt: number,
  sink: SecondaryItemLayerSink | null
): ProceduralChainAccessoryState => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const segmentCount = secondaryItemTuning.PROCEDURAL_CHAIN_SEGMENT_COUNT;
  const segmentLength = secondaryItemTuning.PROCEDURAL_CHAIN_SEGMENT_LENGTH;
  const lagPerSegment = secondaryItemTuning.PROCEDURAL_CHAIN_LAG_PER_SEGMENT;

  const movementAngle =
    Math.abs(velocityX) > 0.01 ? Math.PI : velocityX >= 0 ? 0 : Math.PI;

  const nextAngles: [number, number, number] = [
    state.segmentAngles[0],
    state.segmentAngles[1],
    state.segmentAngles[2],
  ];
  let totalOffsetX = 0;
  let totalOffsetY = 0;

  for (let i = 0; i < segmentCount; i++) {
    const lag = lagPerSegment * (i + 1);
    const targetAngle = movementAngle;
    const currentAngle = nextAngles[i];
    const nextAngle = currentAngle + (targetAngle - currentAngle) * lag * safeDt * 60;
    nextAngles[i] = nextAngle;

    totalOffsetX += Math.cos(nextAngle) * segmentLength;
    totalOffsetY += Math.sin(nextAngle) * segmentLength;
  }

  const nextState: ProceduralChainAccessoryState = {
    kind: 'ProceduralChain',
    segmentAngles: nextAngles,
    compositeOffsetX: totalOffsetX,
    compositeOffsetY: totalOffsetY,
  };

  const layerSink = sink;
  if (layerSink) {
    layerSink.setLocalTransform(totalOffsetX, totalOffsetY, 0);
  }

  return nextState;
};

export const notifyProceduralChainPivotImpact = (
  state: ProceduralChainAccessoryState,
  impactForce: number
): ProceduralChainAccessoryState => {
  'worklet';
  const kick = impactForce * 0.01;
  return {
    ...state,
    segmentAngles: [
      state.segmentAngles[0] + kick,
      state.segmentAngles[1] + kick * 0.6,
      state.segmentAngles[2] + kick * 0.3,
    ],
  };
};
