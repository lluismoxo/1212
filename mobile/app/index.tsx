import { useRef, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet, Platform, Linking } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
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

  // Pide permiso de notificaciones (cuando el usuario las activa en Ajustes).
  const enableNotifications = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      let granted = status === "granted";
      if (!granted) {
        const req = await Notifications.requestPermissionsAsync();
        granted = req.status === "granted";
      }
      // refleja el resultado real en el WebView (si no se concede, el toggle vuelve a off)
      ref.current?.injectJavaScript(
        `window.__1212_notifResult && window.__1212_notifResult(${granted ? "true" : "false"}); true;`,
      );
    } catch { /* noop */ }
  }, []);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: { type?: string; on?: boolean; which?: string } = {};
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === "google-login") startGoogle();
    else if (msg.type === "notif") {
      if (msg.on) enableNotifications();
      // desactivar: el sistema no permite revocar por código; se gestiona en Ajustes.
    } else if (msg.type === "perm") {
      // abrir los Ajustes del sistema de la app para gestionar el permiso.
      Linking.openSettings().catch(() => {});
    }
  }, [startGoogle, enableNotifications]);

  return (
    <View style={styles.c}>
      <WebView
        ref={ref}
        source={{ uri: DESIGN_URL }}
        style={styles.web}
        // Solo permitimos cargar nuestra API y el deep link de la app; ningún
        // otro origen se renderiza dentro del WebView (anti-MITM/phishing).
        originWhitelist={[API, "app1212://*"]}
        // Los enlaces externos (perfiles sociales) se abren en el navegador del
        // sistema, no dentro del WebView.
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith(API) || req.url.startsWith("app1212://")) return true;
          if (/^https?:\/\//.test(req.url)) { Linking.openURL(req.url).catch(() => {}); return false; }
          return true;
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onMessage={onMessage}
        renderLoading={() => (
          <View style={styles.loading}><ActivityIndicator color="#E6C77A" /></View>
        )}
        // En desarrollo la API es http://localhost; en producción debe ser https,
        // por lo que el contenido mixto se deshabilita salvo en dev.
        mixedContentMode={API.startsWith("https") ? "never" : "always"}
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
