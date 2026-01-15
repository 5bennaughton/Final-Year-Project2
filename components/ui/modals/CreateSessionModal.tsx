import React from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";

type CreateSessionModalProps = {
  visible: boolean;
  sportOptions: string[];
  selectedSport: string;
  onSelectSport: (sport: string) => void;
  time: string;
  onChangeTime: (time: string) => void;
  location: string;
  onChangeLocation: (location: string) => void;
  createError: string | null;
  creating: boolean;
  canSubmit: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export default function CreateSessionModal({
  visible,
  sportOptions,
  selectedSport,
  onSelectSport,
  time,
  onChangeTime,
  location,
  onChangeLocation,
  createError,
  creating,
  canSubmit,
  onCancel,
  onSubmit,
}: CreateSessionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View style={{ backgroundColor: "white", padding: 16, borderRadius: 12, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>Create session</Text>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "500" }}>Sport</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {sportOptions.map((option) => (
                <Button
                  key={option}
                  onPress={() => onSelectSport(option)}
                  action={selectedSport === option ? "primary" : "secondary"}
                  variant="outline"
                >
                  <ButtonText>{option}</ButtonText>
                </Button>
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "500" }}>Time</Text>
            <Input variant="outline" size="md">
              <InputField
                placeholder="YYYY-MM-DD HH:MM"
                value={time}
                onChangeText={onChangeTime}
                autoCapitalize="none"
                style={{ color: "black" }}
                placeholderTextColor="gray"
              />
            </Input>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "500" }}>Location</Text>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Beach or spot name"
                value={location}
                onChangeText={onChangeLocation}
                autoCapitalize="words"
                style={{ color: "black" }}
                placeholderTextColor="gray"
              />
            </Input>
          </View>

          {createError && <Text style={{ color: "red" }}>{createError}</Text>}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button onPress={onCancel} action="secondary" variant="outline">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button onPress={onSubmit} disabled={!canSubmit || creating}>
              {creating ? (
                <ActivityIndicator color="white" />
              ) : (
                <ButtonText>Post</ButtonText>
              )}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
