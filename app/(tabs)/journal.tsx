import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useJournal } from '../../src/hooks/useJournal';
import { EmptyState } from '../../src/components/EmptyState';
import { formatDateShort } from '../../src/lib/dateUtils';
import type { JournalEntry } from '../../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_PADDING = Spacing.md + 4;
const PHOTO_GAP = Spacing.sm;
/** 3-column grid for photo entries */
const PHOTO_THUMB_SIZE = Math.floor(
  (SCREEN_WIDTH - CONTENT_PADDING * 2 - PHOTO_GAP * 2) / 3,
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return formatDateShort(dateStr);
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const router = useRouter();
  const { groupedByDate, isLoading, deleteEntry, reload } = useJournal();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDelete = (entry: JournalEntry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteEntry(entry.id),
      },
    ]);
  };

  const hasEntries = groupedByDate.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={Colors.primary} />
        }
      >
        {!hasEntries ? (
          <EmptyState
            icon="journal-outline"
            title="No entries yet"
            message="Start tracking your skin's progress with photos and notes."
          />
        ) : (
          groupedByDate.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              {/* Date heading */}
              <Text style={styles.dateHeading}>{formatDateHeading(group.date)}</Text>

              {/* Entries for this date */}
              {group.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onImagePress={(uri) => setSelectedImage(uri)}
                  onDelete={() => handleDelete(entry)}
                />
              ))}
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB — add new entry */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-entry')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Full-screen image viewer overlay */}
      {selectedImage && (
        <ImageViewer uri={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </View>
  );
}

// ─── Entry Card Component ───────────────────────────────────────────────────

function EntryCard({
  entry,
  onImagePress,
  onDelete,
}: {
  entry: JournalEntry;
  onImagePress: (uri: string) => void;
  onDelete: () => void;
}) {
  const isPhoto = entry.type === 'photo' && !!entry.image_uri;

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryHeaderLeft}>
          <View
            style={[
              styles.entryTypeIcon,
              { backgroundColor: (isPhoto ? '#7B9AAF' : Colors.primary) + '18' },
            ]}
          >
            <Ionicons
              name={isPhoto ? 'camera-outline' : 'chatbubble-outline'}
              size={14}
              color={isPhoto ? '#7B9AAF' : Colors.primary}
            />
          </View>
          <Text style={styles.entryTime}>{formatTime(entry.created_at)}</Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Photo */}
      {isPhoto && entry.image_uri && (
        <TouchableOpacity
          style={styles.entryImageWrap}
          onPress={() => onImagePress(entry.image_uri!)}
          activeOpacity={0.85}
        >
          <Image source={{ uri: entry.image_uri }} style={styles.entryImage} />
          <View style={styles.expandHint}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Comment text */}
      {!!entry.text && (
        <Text style={styles.entryText}>{entry.text}</Text>
      )}
    </View>
  );
}

// ─── Full-Screen Image Viewer ───────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <View style={styles.viewerOverlay}>
      <TouchableOpacity style={styles.viewerClose} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>
      <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: CONTENT_PADDING,
  },

  // Date groups
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateHeading: {
    ...Typography.label,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm + 4,
  },

  // Entry card
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryTypeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTime: {
    ...Typography.caption,
    fontSize: 11,
  },
  entryImageWrap: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  entryImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  expandHint: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.md + 4,
    bottom: Spacing.md + 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  // Full-screen viewer
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 101,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH - 24,
    height: '70%',
  },

  // Bottom
  bottomSpacer: {
    height: Spacing.xxl + 48,
  },
});
