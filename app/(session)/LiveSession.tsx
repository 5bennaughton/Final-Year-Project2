import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen() {
  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <View className="flex-1 p-5 justify-center items-center">
        <Text>Hello</Text>
      </View>
    </SafeAreaView>
  );
}
