/**
 * Ceiling-anchored pin crush layout.
 *
 * Physics pin keeps an unsquashed collider; the mesh scales about its center.
 * This layout places the *display* center so the squashed body top stays on the
 * pin contact plane — top fixed, body compresses downward.
 */

export type CeilingAnchoredPinLayoutInput = {
  physicsCenterY: number;
  /** Half-height of the pin contact collider (physics truth). */
  contactHalfHeight: number;
  meshBaseHeight: number;
  bodyScaleY: number;
};

export type CeilingAnchoredPinLayout = {
  /** World Y of pin / ceiling contact (physics collider top). */
  contactTopY: number;
  /** Render center Y so squashed body top sits on contactTopY. */
  displayCenterY: number;
  /** Drawn body top — always equals contactTopY. */
  visualTopY: number;
  /** Drawn body bottom after squash. */
  visualBottomY: number;
};

/**
 * Top fixed on the contact plane; squash only moves center and bottom.
 *
 * Invariant: visualTopY === physicsCenterY - contactHalfHeight for any bodyScaleY.
 */
export const computeCeilingAnchoredPinLayout = (
  input: CeilingAnchoredPinLayoutInput
): CeilingAnchoredPinLayout => {
  'worklet';
  const contactTopY = input.physicsCenterY - input.contactHalfHeight;
  const squashedHeight = input.meshBaseHeight * input.bodyScaleY;
  const displayCenterY = contactTopY + squashedHeight * 0.5;
  return {
    contactTopY,
    displayCenterY,
    visualTopY: contactTopY,
    visualBottomY: contactTopY + squashedHeight,
  };
};

/**
 * True when the ceiling-anchored squeezed body top has fully left the screen.
 */
export const isPinnedBodyFullyOffScreen = (
  physicsCenterY: number,
  contactHalfHeight: number,
  meshBaseHeight: number,
  bodyScaleY: number,
  screenHeight: number
): boolean => {
  'worklet';
  const { visualTopY } = computeCeilingAnchoredPinLayout({
    physicsCenterY,
    contactHalfHeight,
    meshBaseHeight,
    bodyScaleY,
  });
  return visualTopY > screenHeight;
};
