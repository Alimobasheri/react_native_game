import {
  computeCeilingAnchoredPinLayout,
  isPinnedBodyFullyOffScreen,
} from '../pinnedVisualLayout';

describe('computeCeilingAnchoredPinLayout', () => {
  const physicsCenterY = 400;
  const contactHalfHeight = 40;
  const meshBaseHeight = 70;

  it('keeps visualTopY on the pin contact plane for any bodyScaleY', () => {
    const scales = [1, 0.8, 0.6, 0.4];
    for (let i = 0; i < scales.length; i++) {
      const layout = computeCeilingAnchoredPinLayout({
        physicsCenterY,
        contactHalfHeight,
        meshBaseHeight,
        bodyScaleY: scales[i],
      });
      expect(layout.visualTopY).toBeCloseTo(
        physicsCenterY - contactHalfHeight,
        8
      );
      expect(layout.contactTopY).toBe(layout.visualTopY);
    }
  });

  it('raises displayCenterY as bodyScaleY falls (crush into ceiling)', () => {
    const full = computeCeilingAnchoredPinLayout({
      physicsCenterY,
      contactHalfHeight,
      meshBaseHeight,
      bodyScaleY: 1,
    });
    const crushed = computeCeilingAnchoredPinLayout({
      physicsCenterY,
      contactHalfHeight,
      meshBaseHeight,
      bodyScaleY: 0.6,
    });
    expect(crushed.displayCenterY).toBeLessThan(full.displayCenterY);
    expect(crushed.visualBottomY - crushed.visualTopY).toBeCloseTo(
      meshBaseHeight * 0.6,
      8
    );
  });

  it('places display center halfway between contact top and squashed bottom', () => {
    const layout = computeCeilingAnchoredPinLayout({
      physicsCenterY,
      contactHalfHeight,
      meshBaseHeight,
      bodyScaleY: 0.6,
    });
    expect(layout.displayCenterY).toBeCloseTo(
      (layout.visualTopY + layout.visualBottomY) * 0.5,
      8
    );
  });
});

describe('isPinnedBodyFullyOffScreen', () => {
  const contactHalfHeight = 39;
  const meshBaseHeight = 70;
  const bodyScaleY = 0.6;
  const screenHeight = 800;

  it('is false while squeezed body top is still on screen', () => {
    const physicsCenterY = screenHeight - 20 + contactHalfHeight;
    expect(
      isPinnedBodyFullyOffScreen(
        physicsCenterY,
        contactHalfHeight,
        meshBaseHeight,
        bodyScaleY,
        screenHeight
      )
    ).toBe(false);
  });

  it('is true only when squeezed body top has passed screen bottom', () => {
    const physicsCenterY = screenHeight + contactHalfHeight + 1;
    const layout = computeCeilingAnchoredPinLayout({
      physicsCenterY,
      contactHalfHeight,
      meshBaseHeight,
      bodyScaleY,
    });
    expect(layout.visualTopY).toBeGreaterThan(screenHeight);
    expect(
      isPinnedBodyFullyOffScreen(
        physicsCenterY,
        contactHalfHeight,
        meshBaseHeight,
        bodyScaleY,
        screenHeight
      )
    ).toBe(true);
  });

  it('does not fire on physics center near screen bottom (old early death)', () => {
    const physicsCenterY = screenHeight - 8;
    const layout = computeCeilingAnchoredPinLayout({
      physicsCenterY,
      contactHalfHeight,
      meshBaseHeight,
      bodyScaleY,
    });
    expect(layout.visualTopY).toBeLessThan(screenHeight);
    expect(
      isPinnedBodyFullyOffScreen(
        physicsCenterY,
        contactHalfHeight,
        meshBaseHeight,
        bodyScaleY,
        screenHeight
      )
    ).toBe(false);
  });
});
