import { GRID_SIZE, GRID_WIDTH, GRID_HEIGHT } from "../constants/game";
import randomPosition from "../core/helpers/randomPosition";

export default function GameLoop(entities, { events, dispatch }) {
  const head = entities.head;
  const food = entities.food;
  const tail = entities.tail;

  if (events.length) {
    events.forEach((e) => {
      switch (e) {
        case "move-up":
          if (head.yspeed === 1) return;
          head.yspeed = -1;
          head.xspeed = 0;
          return;
        case "move-right":
          if (head.xspeed === -1) return;
          head.xspeed = 1;
          head.yspeed = 0;
          return;
        case "move-down":
          if (head.yspeed === -1) return;
          head.yspeed = 1;
          head.xspeed = 0;
          return;
        case "move-left":
          if (head.xspeed === 1) return;
          head.xspeed = -1;
          head.yspeed = 0;
          return;
      }
    });
  }

  head.nextMove -= 1;
  if (head.nextMove === 0) {
    head.nextMove = head.updateFrequency;

    if (
      head.position[0] + head.xspeed < 0 ||
      head.position[0] + head.xspeed >= GRID_WIDTH ||
      head.position[1] + head.yspeed < 0 ||
      head.position[1] + head.yspeed >= GRID_HEIGHT
    ) {
      dispatch("game-over");
    } else {
      tail.elements = [[head.position[0], head.position[1]], ...tail.elements];
      tail.elements.pop();

      head.position[0] += head.xspeed;
      head.position[1] += head.yspeed;

      tail.elements.forEach((el, idx) => {
        if (
          head.position[0] === el[0] &&
          head.position[1] === el[1] &&
          idx !== 0
        ) {
          console.log("thiiiiiiiiiss");
          dispatch("game-over");
        }
      });
      if (
        head.position[0] === food.position[0] &&
        head.position[1] === food.position[1]
      ) {
        tail.elements = [
          [head.position[0], head.position[1]],
          ...tail.elements,
        ];
        food.position = [
          randomPosition(0, GRID_WIDTH - 1),
          randomPosition(0, GRID_HEIGHT - 1),
        ];
      }
    }
  }

  return entities;
}
