import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { colors } from '../../theme/colors';

interface ChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
}

export const Chip = ({
  label,
  isActive = false,
  onPress,
  onDismiss,
  style,
}: ChipProps) => {
  const containerStyle = [
    styles.container,
    isActive ? styles.activeContainer : styles.inactiveContainer,
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Typography
        variant="caption"
        weight="600"
        color={isActive ? 'light' : 'primary'}
      >
        {label}
      </Typography>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {/* Typically an 'x' icon. Using text fallback here */}
          <Typography
            variant="caption"
            weight="bold"
            color={isActive ? 'light' : 'primary'}
          >
             ✕
          </Typography>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  activeContainer: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inactiveContainer: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  dismissButton: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
