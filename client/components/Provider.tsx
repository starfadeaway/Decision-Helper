import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { type ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { WebOnlyPrettyScrollbar } from './PrettyScrollbar'
import { HeroUINativeProvider } from '@/heroui';
import { ConfirmProvider } from './ConfirmDialog';

function Provider({ children }: { children: ReactNode }) {
  return <WebOnlyColorSchemeUpdater>
    <WebOnlyPrettyScrollbar>
      <AuthProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <HeroUINativeProvider>
                {children}
              </HeroUINativeProvider>
            </GestureHandlerRootView>
          </ConfirmProvider>
        </ThemeProvider>
      </AuthProvider>
    </WebOnlyPrettyScrollbar>
  </WebOnlyColorSchemeUpdater>
}

export {
  Provider,
}
