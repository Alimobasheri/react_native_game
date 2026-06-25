/** Swimmer character skin sprites (body + secondary attachment). */

export const floaterGoggledBody = require('../../assets/swimmer/characters/goggled/floater_goggled_body.webp');
export const floaterGoggledGoggles = require('../../assets/swimmer/characters/goggled/floater_goggled_goggles.webp');

export const aquaSproutBody = require('../../assets/swimmer/characters/aqua-sprout/aqua-sprout-body.webp');
export const aquaSproutHair = require('../../assets/swimmer/characters/aqua-sprout/aqua-sprout-hair.webp');
export const aquaSproutEyes = require('../../assets/swimmer/characters/aqua-sprout/aqua-sprout-eyes.webp');

export const kelpDrifterBody = require('../../assets/swimmer/characters/kelp-drifter/kelp-drifter-body.webp');
export const kelpDrifterHair = require('../../assets/swimmer/characters/kelp-drifter/kelp-drifter-hair.webp');
export const kelpDrifterEyes = require('../../assets/swimmer/characters/kelp-drifter/kelp-drifter-eyes.webp');
/** kelp-drifter: body 330×607, hair 438×407, eyes 188×22 */

/** Keys registered in RNTGE image cache via `<Asset type="image" name="…" />`. */
export const SWIMMER_CHARACTER_IMAGE = {
  floaterGoggledBody: 'floater_goggled_body',
  floaterGoggledGoggles: 'floater_goggled_goggles',
  aquaSproutBody: 'aqua_sprout_body',
  aquaSproutHair: 'aqua_sprout_hair',
  aquaSproutEyes: 'aqua_sprout_eyes',
  kelpDrifterBody: 'kelp_drifter_body',
  kelpDrifterHair: 'kelp_drifter_hair',
  kelpDrifterEyes: 'kelp_drifter_eyes',
} as const;
