import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { login } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

// MVP: solo login con Google. Apple se añade más adelante (requiere cuenta dev de pago).
export default function Auth() {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const clientId = Constants.expoConfig?.extra?.googleClientId as string | undefined;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: clientId ?? "",
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;
      const idToken = response.params.id_token;
      if (!idToken) return;
      try {
        setBusy(true);
        await login("google", idToken);
        await refresh();
        router.replace("/onboarding");
      } catch {
        Alert.alert("Error", "No se pudo iniciar sesión.");
      } finally {
        setBusy(false);
      }
    })();
  }, [response]);

  function onGoogle() {
    if (!clientId) {
      Alert.alert("Google", "Configura googleClientId en app.json para habilitar el login.");
      return;
    }
    promptAsync();
  }

  return (
    <View style={styles.c}>
      <View style={styles.top}>
        <Text style={styles.logo}>1212</Text>
        <Text style={styles.sub}>Tu camino de evolución empieza aquí</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={onGoogle} disabled={busy || !request}>
          <Text style={styles.btnTxt}>Continuar con Google</Text>
        </Pressable>
        <Text style={styles.legal}>
          Al continuar aceptas los Términos y la Política de Privacidad de 1212.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, justifyContent: "flex-end" },
  top: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 26, fontWeight: "600", letterSpacing: 8, color: "#fff", paddingLeft: 8 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  actions: { padding: 28, paddingBottom: 46, gap: 12 },
  btn: { height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "#0b0b0b", fontSize: 15, fontWeight: "600" },
  legal: { marginTop: 14, fontSize: 12, lineHeight: 18, color: "rgba(255,255,255,0.32)", textAlign: "center" },
});
