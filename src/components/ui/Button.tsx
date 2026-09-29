import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textStyle?: TextStyle;
}

export const Button = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) => {
  const containerStyle = [
    styles.base,
    styles[`${variant}Variant`],
    styles[`${size}Size`],
    disabled && styles.disabled,
    style,
  ];

  const computedTextStyle = [
    styles.textBase,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'ghost'
              ? colors.primary
              : colors.textLight
          }
        />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text style={computedTextStyle}>{title}</Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  // Sizes
  smSize: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mdSize: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  lgSize: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  // Variants
  primaryVariant: {
    backgroundColor: colors.primary,
  },
  secondaryVariant: {
    backgroundColor: colors.secondary,
  },
  outlineVariant: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghostVariant: {
    backgroundColor: 'transparent',
  },
  dangerVariant: {
    backgroundColor: colors.error,
  },
  // Text Styles
  textBase: {
    ...typography.h3,
    fontWeight: '600',
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  primaryText: {
    color: colors.textLight,
  },
  secondaryText: {
    color: colors.textLight,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.textLight,
  },
});
