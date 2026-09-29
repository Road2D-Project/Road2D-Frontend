import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Typography } from './Typography';
import { colors } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showCharacterCount?: boolean;
}

export const Input = ({
  label,
  error,
  leftIcon,
  rightIcon,
  showCharacterCount,
  maxLength,
  value = '',
  style,
  secureTextEntry,
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const containerBorderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <Typography variant="label" style={styles.label}>
          {label}
        </Typography>
      )}

      <View style={[styles.inputContainer, { borderColor: containerBorderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, style]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          value={value}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          placeholderTextColor={colors.textSecondary}
          {...props}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {/* Ideally replace with an eye icon from vector-icons passed from parent, but we handle the toggle here */}
            <Typography variant="caption" color="secondary">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Typography>
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.errorContainer}>
          {error ? (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          ) : (
            <View /> // Placeholder to push character count to the right
          )}
        </View>

        {showCharacterCount && maxLength && (
          <Typography variant="caption" color="secondary">
            {value.length}/{maxLength}
          </Typography>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.textLight,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    minHeight: 20,
  },
  errorContainer: {
    flex: 1,
    marginRight: 8,
  },
});
