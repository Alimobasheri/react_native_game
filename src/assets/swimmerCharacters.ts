/** Swimmer character skin sprites (body + secondary attachment). */

export const floaterGoggledBody = require('../../assets/swimmer/characters/goggled/floater_goggled_body.webp');
export const floaterGoggledGoggles = require('../../assets/swimmer/characters/goggled/floater_goggled_goggles.webp');

/** Keys registered in RNTGE image cache via `<Asset type="image" name="…" />`. */
export const SWIMMER_CHARACTER_IMAGE = {
  floaterGoggledBody: 'floater_goggled_body',
  floaterGoggledGoggles: 'floater_goggled_goggles',
} as const;
