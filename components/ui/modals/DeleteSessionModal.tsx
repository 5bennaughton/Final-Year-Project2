import React from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import type { SessionPost } from "@/helpers/helpers";

type DeleteSessionModalProps = {
  visible: boolean;
  post: SessionPost | null;
  deleting: boolean;
  deleteError: string | null;
  onCancel: () => void;
  onDelete: () => void;
};

export default function DeleteSessionModal({
  visible,
  post,
  deleting,
  deleteError,
  onCancel,
  onDelete,
}: DeleteSessionModalProps) {
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
          <Text style={{ fontSize: 18, fontWeight: "600" }}>Delete session</Text>
          <Text style={{ color: "#666" }}>
            {post?.sport} • {post ? new Date(post.time).toLocaleString() : ""}
          </Text>
          {deleteError && <Text style={{ color: "red" }}>{deleteError}</Text>}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button onPress={onCancel} action="secondary" variant="outline">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button onPress={onDelete} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ButtonText>Delete</ButtonText>
              )}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
