import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { appTheme, uiStyles } from '@/constants/theme';
import type { DeleteSessionModalProps } from '@/helpers/types';

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
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Delete session</Text>
          <Text style={styles.metaText}>
            {post?.sport} • {post ? new Date(post.time).toLocaleString() : ''}
          </Text>
          {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
          <View style={styles.actionsRow}>
            <Button onPress={onCancel} action="secondary" variant="outline">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button onPress={onDelete} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color={appTheme.colors.white} />
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

const styles = StyleSheet.create({
  backdrop: {
    ...uiStyles.modalBackdrop,
  },
  card: {
    ...uiStyles.modalCard,
  },
  title: {
    fontSize: appTheme.fontSize.lg,
    fontWeight: '600',
    color: appTheme.colors.textStrong,
  },
  metaText: {
    color: appTheme.colors.textMuted,
  },
  errorText: {
    ...uiStyles.errorText,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
