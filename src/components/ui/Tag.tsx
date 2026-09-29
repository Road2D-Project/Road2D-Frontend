import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Typography } from './Typography';
import { colors } from '../../theme/colors';

type TagVariant = 'default' | 'success' | 'warning' | 'error';

interface TagProps {
  label: string;
  variant?: TagVariant;
  style?: StyleProp<ViewStyle>;
}

export const Tag = ({ label, variant = 'default', style }: TagProps) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return colors.success + '20'; // 20% opacity
      case 'warning':
        return colors.warning + '20';
      case 'error':
        return colors.error + '20';
      default:
        return colors.border;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }, style]}>
      <Typography variant="caption" color={getTextColor()} weight="600">
        {label}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
