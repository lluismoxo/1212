import { useRef, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

// La app muestra el diseño literal (Claude Design) servido por la API en /design.
// El runtime del diseño + bridge.js gestionan navegación y datos. Aquí, además,
// manejamos el login con Google: como Google bloquea el login dentro de WebViews,
// el botón del diseño nos pide (postMessage) abrir Safari; tras el login, Google
// vuelve por deep link app1212://auth#tokens, capturamos los tokens y los
// inyectamos de vuelta al WebView.
const API = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "http://localhost:8787";
const DESIGN_URL = `${API}/design/index.html`;
const RETURN_SCHEME = "app1212://auth";

export default function App() {
  const ref = useRef<WebView>(null);

  // Inyecta los tokens (del deep link) en el WebView para que el bridge cree sesión.
  const injectTokens = useCallback((access: string, refresh: string) => {
    const js = `window.__1212_setSession && window.__1212_setSession(${JSON.stringify(access)}, ${JSON.stringify(refresh)}); true;`;
    ref.current?.injectJavaScript(js);
  }, []);

  // Abre Safari para el login Google y espera el retorno por deep link.
  const startGoogle = useCallback(async () => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API}/auth/google/start?return=app`,
        RETURN_SCHEME,
      );
      if (result.type === "success" && result.url) {
        const hash = result.url.split("#")[1] ?? "";
        const params = new URLSearchParams(hash);
        const access = params.get("access");
        const refresh = params.get("refresh");
        if (access && refresh) injectTokens(access, refresh);
      }
    } catch {
      // cancelado o error: el usuario sigue en la pantalla de login del diseño.
    }
  }, [API, injectTokens]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: { type?: string } = {};
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === "google-login") startGoogle();
  }, [startGoogle]);

  return (
    <View style={styles.c}>
      <WebView
        ref={ref}
        source={{ uri: DESIGN_URL }}
        style={styles.web}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onMessage={onMessage}
        renderLoading={() => (
          <View style={styles.loading}><ActivityIndicator color="#E6C77A" /></View>
        )}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        geolocationEnabled
        hideKeyboardAccessoryView
        {...(Platform.OS === "ios" ? { allowsBackForwardNavigationGestures: true } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#070707" },
  web: { flex: 1, backgroundColor: "#070707" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#070707" },
});
