import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Typography } from '../ui/Typography';
import { colors } from '../../theme/colors';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = 'Đang tải...' }: LoadingScreenProps) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Typography variant="body" color="primary" style={styles.message}>
        {message}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: 16,
  },
});
