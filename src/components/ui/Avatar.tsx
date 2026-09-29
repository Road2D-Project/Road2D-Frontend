import React from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Typography } from './Typography';
import { colors } from '../../theme/colors';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnlineBadge?: boolean;
  isOnline?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export const Avatar = ({
  uri,
  name,
  size = 'md',
  showOnlineBadge = false,
  isOnline = false,
  style,
}: AvatarProps) => {
  const sizeValue = sizeMap[size];
  const radius = sizeValue / 2;

  const containerStyle = [
    styles.container,
    { width: sizeValue, height: sizeValue, borderRadius: radius },
    style,
  ];

  const getInitials = (fullName?: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <View style={containerStyle}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius: radius }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius: radius }]}>
          <Typography
            variant={size === 'xs' || size === 'sm' ? 'caption' : 'h3'}
            color="light"
            weight="600"
          >
            {getInitials(name)}
          </Typography>
        </View>
      )}

      {showOnlineBadge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isOnline ? colors.success : colors.textSecondary,
              width: sizeValue * 0.25,
              height: sizeValue * 0.25,
              borderRadius: (sizeValue * 0.25) / 2,
              bottom: sizeValue * 0.05,
              right: sizeValue * 0.05,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.textLight, // Assuming white border for the badge
  },
});
