import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { colors } from '../../theme/colors';

interface BadgeProps {
  count?: number;
  status?: 'online' | 'offline' | 'busy';
  style?: StyleProp<ViewStyle>;
}

export const Badge = ({ count, status, style }: BadgeProps) => {
  if (status) {
    let backgroundColor = colors.textSecondary; // offline
    if (status === 'online') backgroundColor = colors.success;
    if (status === 'busy') backgroundColor = colors.error;

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor },
          style,
        ]}
      />
    );
  }

  if (count !== undefined) {
    return (
      <View style={[styles.countBadge, style]}>
        <Typography variant="caption" color="light" weight="bold">
          {count > 99 ? '99+' : count}
        </Typography>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  countBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textLight,
  },
});
