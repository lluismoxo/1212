import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { login } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors } from "@/theme/tokens";

export default function Auth() {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  async function afterLogin() {
    await refresh();
    router.replace("/onboarding");
  }

  async function onApple() {
    try {
      setBusy(true);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error("sin id_token");
      await login("apple", cred.identityToken);
      await afterLogin();
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") Alert.alert("Error", "No se pudo iniciar sesión con Apple.");
    } finally {
      setBusy(false);
    }
  }

  function onGoogle() {
    // Flujo Google con expo-auth-session: requiere GOOGLE_CLIENT_ID configurado.
    // Se cablea cuando estén las credenciales (ver docs/06-oauth-setup.md).
    Alert.alert("Google", "Configura GOOGLE_CLIENT_ID para habilitar el login con Google.");
  }

  return (
    <View style={styles.c}>
      <View style={styles.top}>
        <Text style={styles.logo}>1212</Text>
        <Text style={styles.sub}>Tu camino de evolución empieza aquí</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnWhite]} onPress={onGoogle} disabled={busy}>
          <Text style={styles.btnWhiteTxt}>Continuar con Google</Text>
        </Pressable>
        {Platform.OS === "ios" && (
          <Pressable style={[styles.btn, styles.btnDark]} onPress={onApple} disabled={busy}>
            <Text style={styles.btnDarkTxt}>Continuar con Apple</Text>
          </Pressable>
        )}
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
  btn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnWhite: { backgroundColor: "#fff" },
  btnWhiteTxt: { color: "#0b0b0b", fontSize: 15, fontWeight: "600" },
  btnDark: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  btnDarkTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  legal: { marginTop: 14, fontSize: 12, lineHeight: 18, color: "rgba(255,255,255,0.32)", textAlign: "center" },
});
