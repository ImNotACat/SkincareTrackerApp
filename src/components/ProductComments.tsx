import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useProductComments } from '../hooks/useProductComments';

interface ProductCommentsProps {
  productId: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function ProductComments({ productId }: ProductCommentsProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { comments, addComment, deleteComment } = useProductComments(productId);
  const [newComment, setNewComment] = useState('');

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment.trim());
    setNewComment('');
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment(commentId) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Add comment input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a note or comment..."
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
          onPress={handleAdd}
          disabled={!newComment.trim()}
        >
          <Ionicons
            name="send"
            size={18}
            color={newComment.trim() ? colors.textOnPrimary : colors.textLight}
          />
        </TouchableOpacity>
      </View>

      {/* Comments list */}
      {comments.length === 0 ? (
        <Text style={styles.emptyText}>No comments yet</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Ionicons name="chatbubble-outline" size={12} color={colors.textLight} />
              <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
              <TouchableOpacity
                onPress={() => handleDelete(comment.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={14} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.sm + 2,
    paddingTop: Spacing.sm + 2,
    ...Typography.body,
    fontSize: 14,
    color: colors.text,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
  emptyText: {
    ...Typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  commentCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  commentTime: {
    ...Typography.caption,
    fontSize: 11,
    color: colors.textLight,
    flex: 1,
  },
  deleteBtn: {
    padding: 2,
  },
  commentText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});
