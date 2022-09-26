export default function GameLoop(entities, { events, dispatch, touches }) {
  const winningBoard = entities.winningBoard;
  if (events.length) {
    events.forEach((e) => {
      if (e.type) {
        switch (e.type) {
          case "tile-touch":
            entities[e.payload.toString()].degree += 90;
            let hasWon = true;
            Object.keys(winningBoard.board).forEach((key) => {
              const { degree: winningBoardDegree } =
                winningBoard.board[key] || {};
              if (
                !(winningBoardDegree === entities[key].degree) &&
                !(winningBoardDegree === 0 && entities[key].degree === 0) &&
                !(
                  winningBoardDegree === 0 && entities[key].degree % 360 === 0
                ) &&
                entities[key].degree % 360 !== winningBoardDegree
              )
                hasWon = false;
            });

            if (hasWon) dispatch("level-success");
            break;

          default:
            break;
        }
      }
    });
  }
  return entities;
}
