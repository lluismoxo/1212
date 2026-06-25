import { useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";

// La app muestra el diseño real (prototipo Claude Design) servido por la API
// en /design. El runtime del diseño gestiona la navegación; aquí solo lo
// embebemos a pantalla completa. La conexión con datos del backend se inyecta
// progresivamente (siguiente paso).
const API = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "http://localhost:8787";
const DESIGN_URL = `${API}/design/index.html`;

export default function App() {
  const ref = useRef<WebView>(null);
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
        renderLoading={() => (
          <View style={styles.loading}><ActivityIndicator color="#E6C77A" /></View>
        )}
        mixedContentMode="always"
        allowsInlineMediaPlayback
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
