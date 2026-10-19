import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { useColors } from '@/hooks/useColors';
import { PortalState } from './PortalState';
import { classifyNavigation, shouldHandleAndroidBack } from '@/lib/portal-policy';
import { usePortalPush } from '@/hooks/usePortalPush';

type Failure = { title: string; detail: string; rendererLost?: boolean };

export default function PortalView({ url }: { url: string }) {
  const colors = useColors();
  const webview = useRef<WebView>(null);
  const currentUrl = useRef(url);
  const documentUrl = useRef(url);
  const [source, setSource] = useState({ uri: url });
  const [generation, setGeneration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const push = usePortalPush(webview,url,target=>setSource({uri:target}));

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!shouldHandleAndroidBack(canGoBack, !!failure?.rendererLost)) return false;
      setFailure(null);
      webview.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, failure?.rendererLost]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setFailure({ title: 'The portal is taking longer to respond', detail: 'Check your connection and try again. If you were submitting a request, check your bookings after reconnecting before submitting again.' });
    }, 45000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function openOutside(target: string) {
    try { await Linking.openURL(target); }
    catch { Alert.alert('Unable to open link', 'No compatible application is available, or the link could not be opened.'); }
  }

  function allowNavigation(target: string) {
    const decision = classifyNavigation(target, url);
    if (decision === 'internal' || decision === 'payment') return true;
    if (decision === 'external' || decision === 'device') {
      void openOutside(target);
    } else {
      Alert.alert('Link unavailable', 'This link cannot be opened safely in the app.');
    }
    return false;
  }

  function navigationChanged(state: WebViewNavigation) {
    setCanGoBack(state.canGoBack);
    if (classifyNavigation(state.url, url) === 'internal') currentUrl.current = state.url;
  }

  function rendererLost() {
    setLoading(false);
    setFailure({
      title: 'The portal needs to reopen',
      detail: 'Your saved account and bookings remain on the portal. Unsaved form entries may need to be entered again. Reopen only when you are ready.',
      rendererLost: true,
    });
  }

  function retry() {
    setFailure(null);
    setLoading(true);
    if (failure?.rendererLost) {
      setSource({ uri: currentUrl.current });
      setGeneration(value => value + 1);
    } else webview.current?.reload();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { borderColor: colors.border }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Live portal</Text>
        {push.isGuruji && <Pressable testID="guruji-puja-alerts" accessibilityRole="button"
          accessibilityLabel={push.enabled?'Turn off puja alerts':'Enable puja alerts'}
          disabled={push.busy} onPress={push.toggle} style={styles.reload}>
          <Text style={{color:colors.primary,fontSize:13,fontWeight:'600'}}>
            {push.busy?'Setting up…':push.enabled?'Puja alerts on':'Enable puja alerts'}
          </Text>
        </Pressable>}
        <Pressable testID="reload-live-portal" accessibilityRole="button" accessibilityLabel="Reload live portal"
          style={styles.reload} onPress={() => Alert.alert('Reload the portal?', 'Save any unfinished form first. Reloading loads the latest published portal but may discard unsaved entries.', [
            { text: 'Stay here', style: 'cancel' },
            { text: 'Reload', onPress: () => { setFailure(null); webview.current?.reload(); } },
          ])}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Reload</Text>
        </Pressable>
      </View>
      <View style={styles.container}>
      <WebView
        key={generation}
        ref={webview}
        testID="live-portal-webview"
        source={source}
        style={[styles.container, { backgroundColor: colors.background }]}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={request => {
          // Existing HTTPS map/video subframes are content, not requests to
          // replace the portal or silently open the system browser.
          if (request.isTopFrame === false) {
            const decision = classifyNavigation(request.url, url);
            return decision === 'internal' || decision === 'payment' || decision === 'external';
          }
          return allowNavigation(request.url);
        }}
        onNavigationStateChange={navigationChanged}
        onLoadStart={event => {
          documentUrl.current = event.nativeEvent.url;
          setLoading(true);
          setFailure(null);
        }}
        onLoad={() => { setLoading(false); push.onPortalLoad(); }}
        onMessage={push.onMessage}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailure({ title: 'Unable to connect to the portal', detail: 'Check your connection and retry. If a submission was interrupted, review your bookings after reconnecting before submitting again.' });
        }}
        onHttpError={event => {
          if (event.nativeEvent.url !== documentUrl.current) return;
          setLoading(false);
          setFailure({ title: 'The portal is temporarily unavailable', detail: `The server returned an error (${event.nativeEvent.statusCode}). Please retry later. Your saved data remains on the portal.` });
        }}
        onContentProcessDidTerminate={rendererLost}
        onRenderProcessGone={rendererLost}
        onOpenWindow={event => {
          const target = event.nativeEvent.targetUrl;
          if (classifyNavigation(target, url) === 'internal') {
            Alert.alert('Open portal page?', 'This will replace the current page. Save any unfinished form first.', [
              { text: 'Stay here', style: 'cancel' },
              { text: 'Open page', onPress: () => setSource({ uri: target }) },
            ]);
          } else allowNavigation(target);
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={false}
        incognito={false}
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        allowsBackForwardNavigationGestures
        allowsLinkPreview={false}
        setSupportMultipleWindows
        javaScriptCanOpenWindowsAutomatically={false}
        geolocationEnabled
        mediaCapturePermissionGrantType="prompt"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      />
      {(loading || failure) && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
          <PortalState
            title={failure?.title ?? 'Opening Sanatan Guruji'}
            detail={failure?.detail ?? 'Connecting to your live portal'}
            busy={!failure}
            buttonLabel={failure ? (failure.rendererLost ? 'Reopen portal' : 'Try again') : undefined}
            onPress={failure ? retry : undefined}
          />
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, toolbar: { minHeight: 44, paddingLeft: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reload: { minWidth: 64, minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
