/** Swimmer character skin sprites (body + secondary attachment). */

export const floaterGoggledBody = require('../../assets/swimmer/characters/goggled/floater_goggled_body.webp');
export const floaterGoggledGoggles = require('../../assets/swimmer/characters/goggled/floater_goggled_goggles.webp');

export const aquaSproutBody = require('../../assets/swimmer/characters/aqua-sprout/aqua-sprout-body.webp');
export const aquaSproutHair = require('../../assets/swimmer/characters/aqua-sprout/aqua-sprout-hair.webp');
export const aquaSproutEyes = require('../../assets/swimmer/characters/aqua-sprout/aqua-sprout-eyes.webp');

/** Keys registered in RNTGE image cache via `<Asset type="image" name="…" />`. */
export const SWIMMER_CHARACTER_IMAGE = {
  floaterGoggledBody: 'floater_goggled_body',
  floaterGoggledGoggles: 'floater_goggled_goggles',
  aquaSproutBody: 'aqua_sprout_body',
  aquaSproutHair: 'aqua_sprout_hair',
  aquaSproutEyes: 'aqua_sprout_eyes',
} as const;
