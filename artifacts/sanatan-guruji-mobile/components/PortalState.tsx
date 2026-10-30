import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

const c = colors.light;
const F = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke={c.primaryForeground}>
        <Path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </Svg>
    </View>
  );
}

export interface PortalStateProps {
  title: string;
  detail: string;
  buttonLabel?: string;
  onPress?: () => void;
  busy?: boolean;
}

export function PortalState({ title, detail, buttonLabel, onPress, busy }: PortalStateProps) {
  return (
    <SafeAreaView style={styles.root} testID="portal-state">
      <View style={styles.body}>
        <BrandMark />
        <Text style={styles.brand}>Vaidik Dhara</Text>
        <View style={styles.card} accessibilityRole="summary" accessibilityLiveRegion="polite">
          {busy ? <ActivityIndicator color={c.primary} style={styles.spinner} /> : null}
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
          {buttonLabel && onPress ? (
            <Pressable
              testID="portal-state-action"
              accessibilityRole="button"
              accessibilityLabel={buttonLabel}
              accessibilityState={{ disabled: !!busy, busy: !!busy }}
              disabled={busy}
              onPress={onPress}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  brand: {
    marginTop: 12,
    marginBottom: 28,
    fontFamily: F.bold,
    fontSize: 20,
    color: c.foreground,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: c.card,
    borderRadius: colors.radius * 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
  },
  spinner: { marginBottom: 16 },
  title: { fontFamily: F.semibold, fontSize: 18, color: c.foreground, textAlign: 'center' },
  detail: {
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 22,
    color: c.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: 24,
    borderRadius: colors.radius,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: F.semibold, fontSize: 16, color: c.primaryForeground },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
