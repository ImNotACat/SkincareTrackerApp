import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useJournal } from '../src/hooks/useJournal';
import { useToast } from '../src/components/Toast';

type EntryMode = 'comment' | 'photo';

export default function AddEntryScreen() {
  const router = useRouter();
  const { addEntry } = useJournal();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = createStyles(colors);

  const [mode, setMode] = useState<EntryMode>('comment');
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // ── Image Picker ──────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permission Needed', { message: 'Please allow access to your photo library.', variant: 'warning' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permission Needed', { message: 'Please allow access to your camera.', variant: 'warning' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => setImageUri(null);

  // ── Save ──────────────────────────────────────────────────────────────────

  const canSave = mode === 'comment' ? text.trim().length > 0 : !!imageUri;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await addEntry({
        type: mode === 'photo' ? 'photo' : 'comment',
        text: text.trim() || undefined,
        image_uri: imageUri || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save entry. Please try again.';
      showToast('Error', { message, variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode toggle */}
        <Text style={styles.label}>TYPE</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modePill, mode === 'comment' && styles.modePillActive]}
            onPress={() => setMode('comment')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-outline"
              size={16}
              color={mode === 'comment' ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[styles.modePillText, mode === 'comment' && styles.modePillTextActive]}
            >
              Note
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, mode === 'photo' && styles.modePillActive]}
            onPress={() => setMode('photo')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="camera-outline"
              size={16}
              color={mode === 'photo' ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[styles.modePillText, mode === 'photo' && styles.modePillTextActive]}
            >
              Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photo section (shown when mode is photo) */}
        {mode === 'photo' && (
          <>
            <Text style={styles.label}>PHOTO</Text>
            {imageUri ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                  <Ionicons name="close-circle" size={28} color="rgba(0,0,0,0.6)" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.7}>
                  <View style={styles.photoBtnIcon}>
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.photoBtnLabel}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.7}>
                  <View style={styles.photoBtnIcon}>
                    <Ionicons name="images" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.photoBtnLabel}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Text input (always shown — acts as comment or caption) */}
        <Text style={styles.label}>{mode === 'photo' ? 'CAPTION (OPTIONAL)' : 'NOTE'}</Text>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder={
            mode === 'photo'
              ? 'Add a caption…'
              : 'How is your skin today? Any observations…'
          }
          placeholderTextColor={colors.textLight}
          multiline={true}
          textAlignVertical="top"
        />

        {/* Quick tags — stored as separate field */}
        <Text style={styles.label}>TAGS</Text>
        <View style={styles.tagsRow}>
          {QUICK_TAGS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selected && styles.tagSelected]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Save Entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Quick Tags ─────────────────────────────────────────────────────────────

const QUICK_TAGS = [
  'Skin peeling',
  'Breakout',
  'Redness',
  'Dry patches',
  'Glowing',
  'Oily T-zone',
  'Irritation',
  'Clear skin',
  'Dark circles',
  'Texture improved',
  'New product reaction',
  'Purging',
];

// ─── Styles ─────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.md + 4,
    paddingBottom: Spacing.xxl,
  },

  // Labels
  label: {
    ...Typography.label,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md + 4,
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modePillText: {
    ...Typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  modePillTextActive: {
    color: colors.textOnPrimary,
  },

  // Photo section
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: Spacing.sm,
  },
  photoBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnLabel: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: colors.text,
    fontSize: 13,
  },
  imagePreviewWrap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  removeImageBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
  },

  // Text input
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
    minHeight: 110,
    ...Typography.body,
    color: colors.text,
    fontSize: 14,
  },

  // Quick tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagSelected: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  tagText: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tagTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },

  // Save button
  saveBtn: {
    marginTop: Spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    ...Typography.button,
    color: colors.textOnPrimary,
  },
});
