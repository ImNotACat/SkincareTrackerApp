import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export interface ConfirmButton {
  text: string;
  onPress?: () => void;
  style?: 'cancel' | 'destructive' | 'default';
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ConfirmButton[];
  onRequestClose: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  buttons,
  onRequestClose,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = createStyles(colors);

  const cardWidth = Math.min(width - Spacing.lg * 2, 340);

  const handlePress = (button: ConfirmButton) => {
    onRequestClose();
    button.onPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <Pressable style={[styles.card, { width: cardWidth }]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={buttons.length > 2 ? styles.buttonsColumn : styles.buttonsRow}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isLast = index === buttons.length - 1;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                    !isCancel && !isDestructive && styles.buttonDefault,
                    !isLast && (buttons.length > 2 ? styles.buttonSpacerVertical : styles.buttonSpacerHorizontal),
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                      !isCancel && !isDestructive && styles.buttonTextDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: typeof import('../constants/theme').Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
    title: {
      ...Typography.subtitle,
      fontSize: 18,
      color: colors.text,
    },
    message: {
      ...Typography.body,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
      lineHeight: 22,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: Spacing.lg,
      gap: Spacing.sm,
    },
    buttonsColumn: {
      marginTop: Spacing.lg,
      gap: Spacing.sm,
    },
    button: {
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      minWidth: 72,
      alignItems: 'center',
    },
    buttonSpacerHorizontal: {
      marginRight: 0,
    },
    buttonSpacerVertical: {
      marginBottom: 0,
    },
    buttonCancel: {
      backgroundColor: colors.surfaceSecondary,
    },
    buttonDefault: {
      backgroundColor: colors.primary,
    },
    buttonDestructive: {
      backgroundColor: colors.error + '18',
    },
    buttonText: {
      ...Typography.button,
      fontSize: 15,
    },
    buttonTextCancel: {
      color: colors.textSecondary,
    },
    buttonTextDefault: {
      color: colors.textOnPrimary,
    },
    buttonTextDestructive: {
      color: colors.error,
      fontWeight: '600',
    },
  });
