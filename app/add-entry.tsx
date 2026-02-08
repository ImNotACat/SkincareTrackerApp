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
import { Colors, Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { useJournal } from '../src/hooks/useJournal';

type EntryMode = 'comment' | 'photo';

export default function AddEntryScreen() {
  const router = useRouter();
  const { addEntry } = useJournal();

  const [mode, setMode] = useState<EntryMode>('comment');
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Image Picker ──────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
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
      Alert.alert('Permission needed', 'Please allow access to your camera.');
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
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
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
              color={mode === 'comment' ? Colors.textOnPrimary : Colors.text}
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
              color={mode === 'photo' ? Colors.textOnPrimary : Colors.text}
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
                    <Ionicons name="camera" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.photoBtnLabel}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.7}>
                  <View style={styles.photoBtnIcon}>
                    <Ionicons name="images" size={24} color={Colors.primary} />
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
          placeholderTextColor={Colors.textLight}
          multiline={true}
          textAlignVertical="top"
        />

        {/* Quick tags */}
        <Text style={styles.label}>QUICK TAGS</Text>
        <View style={styles.tagsRow}>
          {QUICK_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={styles.tag}
              onPress={() => setText((prev) => (prev ? prev + ', ' + tag : tag))}
              activeOpacity={0.7}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md + 4,
    paddingBottom: Spacing.xxl,
  },

  // Labels
  label: {
    ...Typography.label,
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modePillText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '500',
  },
  modePillTextActive: {
    color: Colors.textOnPrimary,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  photoBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnLabel: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text,
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
    backgroundColor: Colors.surfaceSecondary,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 110,
    ...Typography.body,
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
    backgroundColor: Colors.surfaceSecondary,
  },
  tagText: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Save button
  saveBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
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
    color: Colors.textOnPrimary,
  },
});
