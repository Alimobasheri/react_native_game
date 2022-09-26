import { View, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function ({ onReplay, onNextLevel }) {
  return (
    <View style={styles.root}>
      <View style={styles.titleWrapper}>
        <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
          Level Complete!
        </Text>
      </View>
      <View style={styles.actionsWrapper}>
        <TouchableOpacity style={styles.btn} onPress={onReplay}>
          <Text style={styles.btnText}>Replay Level!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={onNextLevel}>
          <Text style={styles.btnText}>Next Level!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    height: "100%",
    flex: 1,
    position: "absolute",
    backgroundColor: "#F2B705",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "50%",
    paddingBottom: "20%",
  },
  titleWrapper: {
    width: "100%",
    paddingHorizontal: 20,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 40,
    color: "#50B4F2",
  },
  actionsWrapper: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 30,
  },
  btn: {
    backgroundColor: "#0487D9",
    padding: 5,
    borderRadius: 5,
  },
  btnText: {
    fontWeight: "600",
    fontSize: 20,
    color: "#E1D5F2",
  },
});
