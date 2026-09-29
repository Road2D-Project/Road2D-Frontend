import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  marginVertical?: number;
  marginHorizontal?: number;
  style?: StyleProp<ViewStyle>;
}

export const Divider = ({
  orientation = 'horizontal',
  thickness = 1,
  color = colors.border,
  marginVertical = 0,
  marginHorizontal = 0,
  style,
}: DividerProps) => {
  const containerStyle = [
    orientation === 'horizontal' ? styles.horizontal : styles.vertical,
    {
      backgroundColor: color,
    },
    orientation === 'horizontal' && {
      height: thickness,
      marginVertical,
      marginHorizontal,
    },
    orientation === 'vertical' && {
      width: thickness,
      marginVertical,
      marginHorizontal,
    },
    style,
  ];

  return <View style={containerStyle} />;
};

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
});
