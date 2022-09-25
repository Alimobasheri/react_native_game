import { View } from "react-native";
import { GRID_WIDTH, GRID_HEIGHT } from "../../constants/game";

export default function Tail({ elements, position, size }) {
  const tailList = elements.map((el, idx) => (
    <View
      key={idx}
      style={{
        width: size,
        height: size,
        position: "absolute",
        left: el[0] * size,
        top: el[1] * size,
        backgroundColor: "red",
      }}
    />
  ));

  return (
    <View
      style={{
        width: GRID_WIDTH * size,
        height: GRID_HEIGHT * size,
      }}
    >
      {tailList}
    </View>
  );
}
