import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { PortalState } from './PortalState';

/** Browser-only aid; iframe behavior is not proof of a native WebView test. */
export default function PortalView({ url }: { url: string }) {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.text, { color: colors.mutedForeground }]}>Browser preview · use Expo Go to test native login and device features.</Text>
        <Pressable testID="open-portal-browser" accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
          <Text style={[styles.link, { color: colors.primary }]}>Open portal</Text>
        </Pressable>
      </View>
      {failed ? <PortalState title="Portal preview unavailable" detail="Open the portal directly or try again. Browser privacy settings may restrict embedded sessions."
        buttonLabel="Try again" onPress={() => { setFailed(false); setGeneration(n => n + 1); }} /> :
        <iframe key={generation} title="Live Sanatan Guruji portal" src={url}
          style={{ flex: 1, width: '100%', height: Math.max(320, height - 190), minHeight: 320, display: 'block', border: 0, background: colors.background }}
          allow="geolocation; camera; microphone" onError={() => setFailed(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, notice: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, gap: 4 },
  text: { fontSize: 11 }, link: { fontSize: 12, fontWeight: '600' },
});
