import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import PortalView from '@/components/PortalView';
import { PortalState } from '@/components/PortalState';
import { useColors } from '@/hooks/useColors';
import { resolvePortalConfig } from '@/lib/portal-policy';

const config = resolvePortalConfig({
  productionUrl: process.env.EXPO_PUBLIC_PORTAL_URL,
  developmentDomain: process.env.EXPO_PUBLIC_DOMAIN,
  development: __DEV__,
});

export default function PortalScreen() {
  const colors = useColors();
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <View style={[styles.root, Platform.OS === 'web' && styles.webInsets]}>
        {config.ok ? <>
          {config.development && <Text accessibilityRole="text" style={[styles.development, { backgroundColor: colors.muted, color: colors.foreground }]}>
            Development portal · not a published release
          </Text>}
          <PortalView url={config.url} />
        </> : <PortalState title="Live portal setup required" detail={config.reason} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, webInsets: { paddingTop: 67, paddingBottom: 34 },
  development: { fontSize: 11, paddingHorizontal: 16, paddingVertical: 6, textAlign: 'center' },
});
