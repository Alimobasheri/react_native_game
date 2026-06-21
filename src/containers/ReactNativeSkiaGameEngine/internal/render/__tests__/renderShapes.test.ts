import {
  borderRadiusHasAny,
  clampBorderRadii,
  normalizeBorderRadius,
} from '../renderShapes';

describe('renderShapes', () => {
  it('normalizeBorderRadius accepts uniform number', () => {
    expect(normalizeBorderRadius(10)).toEqual({
      tl: 10,
      tr: 10,
      bl: 10,
      br: 10,
    });
  });

  it('borderRadiusHasAny detects partial corners', () => {
    expect(borderRadiusHasAny({ tr: 24 })).toBe(true);
    expect(borderRadiusHasAny({ tl: 0, tr: 0, bl: 0, br: 0 })).toBe(false);
  });

  it('clampBorderRadii scales down overlapping radii', () => {
    expect(
      clampBorderRadii(40, 50, normalizeBorderRadius({ tl: 30, tr: 30, bl: 0, br: 0 }))
    ).toEqual({ tl: 20, tr: 20, bl: 0, br: 0 });
  });
});
