import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { colors, spacing, typography } from '../constants/theme';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

/** Catches unhandled render errors so testers see a recovery screen instead of a white screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Verdora] Unhandled error:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🌱</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Verdora hit an unexpected error. Close and reopen the app, or tap below to try again.
          </Text>
          <Button title="Try again" onPress={this.handleReset} fullWidth />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
