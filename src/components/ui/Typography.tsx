import React from 'react';
import { Text, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
type TypographyColor = 'primary' | 'secondary' | 'light' | 'success' | 'error' | 'warning' | string;
type TypographyAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  align?: TypographyAlign;
  weight?: 'normal' | 'bold' | '400' | '500' | '600' | '700';
  children: React.ReactNode;
}

export const Typography = ({
  variant = 'body',
  color = 'primary',
  align = 'left',
  weight,
  style,
  children,
  ...props
}: TypographyProps) => {
  // Determine color value
  let colorValue = colors.textPrimary;
  if (color === 'secondary') colorValue = colors.textSecondary;
  else if (color === 'light') colorValue = colors.textLight;
  else if (color === 'success') colorValue = colors.success;
  else if (color === 'error') colorValue = colors.error;
  else if (color === 'warning') colorValue = colors.warning;
  else if (color !== 'primary') colorValue = color; // Allow custom color string

  // Get base style from typography.ts
  const baseStyle = variant === 'label' ? styles.label : typography[variant];

  const combinedStyle: StyleProp<TextStyle> = [
    baseStyle,
    { color: colorValue, textAlign: align },
    weight && { fontWeight: weight },
    style,
  ];

  return (
    <Text style={combinedStyle} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
