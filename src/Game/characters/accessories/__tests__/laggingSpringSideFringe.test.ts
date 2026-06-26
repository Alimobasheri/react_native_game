import {
  getSideFringePinnedPosition,
  updateLaggingSpringSideFringe,
} from '../laggingSpringSideFringe';
import type { LaggingSpringAccessoryState } from '../../secondaryItemTypes';

const transformedAnchorLocal = (
  skewX: number,
  angleRad: number,
  ax: number,
  ay: number
): { x: number; y: number } => {
  const sx = ax + skewX * ay;
  const sy = ay;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  return {
    x: sx * cosA - sy * sinA,
    y: sx * sinA + sy * cosA,
  };
};

const anchorWorld = (
  restCenterX: number,
  restCenterY: number,
  pivot: { x: number; y: number },
  skewX: number,
  angleRad: number,
  anchorXRatio: number,
  anchorYRatio: number,
  layerWidth: number,
  layerHeight: number
): { x: number; y: number } => {
  const ax = layerWidth * (anchorXRatio - 0.5);
  const ay = layerHeight * (anchorYRatio - 0.5);
  const transformed = transformedAnchorLocal(skewX, angleRad, ax, ay);
  return {
    x: restCenterX + pivot.x + transformed.x,
    y: restCenterY + pivot.y + transformed.y,
  };
};

describe('getSideFringePinnedPosition', () => {
  const layerWidth = 120;
  const layerHeight = 110;
  const anchorXRatio = 0.18;
  const anchorYRatio = 0.48;
  const restCenterX = 10;
  const restCenterY = -70;

  it('keeps the left hair root fixed while strand tips skew', () => {
    const skews = [0, 0.08, -0.12, 0.18, -0.2];
    const basePivot = getSideFringePinnedPosition(
      0,
      0,
      layerWidth,
      layerHeight,
      anchorXRatio,
      anchorYRatio
    );
    const baseAnchor = anchorWorld(
      restCenterX,
      restCenterY,
      basePivot,
      0,
      0,
      anchorXRatio,
      anchorYRatio,
      layerWidth,
      layerHeight
    );

    for (const skewX of skews) {
      const pivot = getSideFringePinnedPosition(
        skewX,
        0,
        layerWidth,
        layerHeight,
        anchorXRatio,
        anchorYRatio
      );
      const anchor = anchorWorld(
        restCenterX,
        restCenterY,
        pivot,
        skewX,
        0,
        anchorXRatio,
        anchorYRatio,
        layerWidth,
        layerHeight
      );
      expect(anchor.x).toBeCloseTo(baseAnchor.x, 4);
      expect(anchor.y).toBeCloseTo(baseAnchor.y, 4);
    }
  });
});

describe('updateLaggingSpringSideFringe', () => {
  const baseState: LaggingSpringAccessoryState = {
    kind: 'LaggingSpring',
    localOffsetX: 0,
    localOffsetY: 0,
    springVelocityX: 0,
    springVelocityY: 0,
  };

  it('oscillates strand skew while idle', () => {
    let state = baseState;
    let sawSkew = false;

    for (let i = 0; i < 120; i++) {
      state = updateLaggingSpringSideFringe(
        state,
        1,
        0,
        1 / 60,
        120,
        110,
        {
          setLocalTransform: (_x, _y, _angle, skewX = 0) => {
            if (Math.abs(skewX) > 0.02) {
              sawSkew = true;
            }
          },
        },
        0.18,
        0.48
      );
    }

    expect(sawSkew).toBe(true);
  });

  it('responds to horizontal velocity with extra skew', () => {
    let idleSkew = 0;
    let fastSkew = 0;

    updateLaggingSpringSideFringe(baseState, 1, 0, 1 / 60, 120, 110, {
      setLocalTransform: (_x, _y, _angle, skewX = 0) => {
        idleSkew = skewX;
      },
    });

    let state = baseState;
    for (let i = 0; i < 60; i++) {
      state = updateLaggingSpringSideFringe(state, 1, 180, 1 / 60, 120, 110, {
        setLocalTransform: (_x, _y, _angle, skewX = 0) => {
          fastSkew = skewX;
        },
      });
    }

    expect(Math.abs(fastSkew)).toBeGreaterThan(Math.abs(idleSkew));
  });
});
