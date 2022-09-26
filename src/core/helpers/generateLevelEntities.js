import { ENTITY_TYPES } from "../../constants/game";
export default function ({ engine, levelEntities }) {
  return !!levelEntities
    ? Object.keys(levelEntities).reduce(
        (entities, key) =>
          levelEntities[key].type === ENTITY_TYPES.TILE
            ? {
                ...entities,
                [key]: { ...levelEntities[key], engine: engine },
              }
            : { ...entities, [key]: levelEntities[key] },
        {}
      )
    : {};
}
