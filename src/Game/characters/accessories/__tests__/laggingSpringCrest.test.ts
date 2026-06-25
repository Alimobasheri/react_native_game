import {
  getCrestRootPinnedPosition,
  updateLaggingSpringCrest,
} from '../laggingSpringCrest';
import type { LaggingSpringAccessoryState } from '../../secondaryItemTypes';

const crestBottomY = (
  restCenterY: number,
  angle: number,
  layerHeight: number,
  pivot: { x: number; y: number }
): number => {
  const halfH = layerHeight / 2;
  const centerY = restCenterY + pivot.y;
  return centerY + Math.cos(angle) * halfH;
};

const crestRootX = (
  angle: number,
  layerHeight: number,
  pivot: { x: number; y: number }
): number => {
  const halfH = layerHeight / 2;
  return pivot.x - Math.sin(angle) * halfH;
};

describe('getCrestRootPinnedPosition', () => {
  const layerWidth = 80;
  const layerHeight = 80;
  const restCenterY = -160;

  it('keeps crest root fixed on the head while the tip bends', () => {
    const angles = [0, 0.15, -0.22, 0.4, -0.55];

    for (const angle of angles) {
      const pivot = getCrestRootPinnedPosition(
        angle,
        layerWidth,
        layerHeight,
        0.5,
        1
      );
      expect(crestRootX(angle, layerHeight, pivot)).toBeCloseTo(0, 5);
      expect(crestBottomY(restCenterY, angle, layerHeight, pivot)).toBeCloseTo(
        restCenterY + layerHeight / 2,
        5
      );
    }
  });
});

describe('updateLaggingSpringCrest', () => {
  const baseState: LaggingSpringAccessoryState = {
    kind: 'LaggingSpring',
    localOffsetX: 0,
    localOffsetY: 0,
    springVelocityX: 0,
    springVelocityY: 0,
  };

  it('bends from velocity lag without sliding the root horizontally', () => {
    let state = baseState;
    let lastX = 0;
    let lastAngle = 0;
    let lastSkew = 0;

    for (let i = 0; i < 90; i++) {
      state = updateLaggingSpringCrest(state, 1, 120, 1 / 60, 80, 80, {
        setLocalTransform: (x, _y, angleRad, skewX = 0) => {
          lastX = x;
          lastAngle = angleRad;
          lastSkew = skewX;
        },
      });
    }

    expect(Math.abs(lastAngle)).toBeGreaterThan(0.05);
    expect(Math.abs(lastSkew)).toBeGreaterThan(0.01);
    expect(lastX).toBeCloseTo(Math.sin(lastAngle) * 40, 4);
  });

  it('advances ambient wind and flutter phases while idle', () => {
    const after = updateLaggingSpringCrest(baseState, 1, 0, 1 / 60, 80, 80, null);

    expect(after.windPhase).toBeGreaterThan(0);
    expect(after.flutterPhase).toBeGreaterThan(0);
  });
});
