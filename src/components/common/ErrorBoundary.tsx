import React, { Component, ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { colors } from '../../theme/colors';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render(): any {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Typography variant="h1" color="error" align="center" style={styles.title}>
              Oops!
            </Typography>
            <Typography variant="body" color="primary" align="center" style={styles.message}>
              Đã có lỗi xảy ra. Đừng lo, dữ liệu hành trình của bạn vẫn an toàn.
            </Typography>
            
            {/* Developer Only Error Stack */}
            {__DEV__ && this.state.error && (
              <View style={styles.errorBox}>
                <Typography variant="caption" color="error">
                  {this.state.error.toString()}
                </Typography>
              </View>
            )}

            <Button
              title="Thử lại"
              onPress={this.handleReset}
              size="lg"
              style={styles.button}
            />
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 16,
  },
  message: {
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  button: {
    width: '100%',
  },
});
