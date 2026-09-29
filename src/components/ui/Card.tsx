import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bgColor?: string;
}

export const Card = ({
  children,
  shadow = 'sm',
  radius = 'md',
  padding = 'md',
  bgColor = colors.textLight,
  style,
  ...props
}: CardProps) => {
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    { backgroundColor: bgColor },
    styles[`shadow_${shadow}`],
    styles[`radius_${radius}`],
    styles[`padding_${padding}`],
    style,
  ];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    // Base styles if any
  },
  // Shadows
  shadow_none: {
    elevation: 0,
    shadowColor: 'transparent',
  },
  shadow_sm: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shadow_md: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  shadow_lg: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  // Radius
  radius_sm: {
    borderRadius: 8,
  },
  radius_md: {
    borderRadius: 12,
  },
  radius_lg: {
    borderRadius: 16,
  },
  radius_full: {
    borderRadius: 9999,
  },
  // Padding
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: 8,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 24,
  },
});
