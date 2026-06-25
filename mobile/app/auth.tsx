import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { login, register, loginPassword, forgotPassword } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

export default function Auth() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const clientId = Constants.expoConfig?.extra?.googleClientId as string | undefined;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({ clientId: clientId ?? "" });

  async function afterLogin() {
    await refresh();
    router.replace("/onboarding");
  }

  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;
      const idToken = response.params.id_token;
      if (!idToken) return;
      try { setBusy(true); await login("google", idToken); await afterLogin(); }
      catch { Alert.alert("Error", "No se pudo iniciar sesión."); }
      finally { setBusy(false); }
    })();
  }, [response]);

  async function onSubmit() {
    if (!email.trim() || !password) { Alert.alert("Faltan datos", "Introduce email y contraseña."); return; }
    if (mode === "register" && !name.trim()) { Alert.alert("Faltan datos", "Introduce tu nombre."); return; }
    try {
      setBusy(true);
      if (mode === "register") await register(email.trim(), password, name.trim());
      else await loginPassword(email.trim(), password);
      await afterLogin();
    } catch (e: any) {
      const code = e?.code ?? e?.message;
      Alert.alert(
        "Error",
        code === "email_taken" ? "Ese email ya está registrado."
          : code === "invalid_credentials" ? "Email o contraseña incorrectos."
          : "No se pudo continuar.",
      );
    } finally { setBusy(false); }
  }

  async function onForgot() {
    if (!email.trim()) { Alert.alert("Email", "Escribe tu email primero."); return; }
    const r = await forgotPassword(email.trim()).catch(() => null);
    Alert.alert("Recuperar contraseña", "Si el email existe, recibirás instrucciones." +
      (r?.devResetToken ? `\n\n(dev) token: ${r.devResetToken}` : ""));
  }

  function onGoogle() {
    if (!clientId) { Alert.alert("Google", "Configura googleClientId en app.json."); return; }
    promptAsync();
  }

  return (
    <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
      <View style={styles.top}>
        <Text style={styles.logo}>1212</Text>
        <Text style={styles.sub}>Tu camino de evolución empieza aquí</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, mode === "login" && styles.tabOn]} onPress={() => setMode("login")}>
            <Text style={[styles.tabTxt, mode === "login" && styles.tabTxtOn]}>Entrar</Text>
          </Pressable>
          <Pressable style={[styles.tab, mode === "register" && styles.tabOn]} onPress={() => setMode("register")}>
            <Text style={[styles.tabTxt, mode === "register" && styles.tabTxtOn]}>Crear cuenta</Text>
          </Pressable>
        </View>

        {mode === "register" && (
          <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="rgba(255,255,255,0.3)"
            value={name} onChangeText={setName} />
        )}
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry value={password} onChangeText={setPassword} />

        <Pressable style={styles.btn} onPress={onSubmit} disabled={busy}>
          <Text style={styles.btnTxt}>{mode === "register" ? "Crear cuenta" : "Entrar"}</Text>
        </Pressable>

        {mode === "login" && (
          <Pressable onPress={onForgot}><Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text></Pressable>
        )}

        <View style={styles.divider}><Text style={styles.dividerTxt}>o</Text></View>

        <Pressable style={[styles.btn, styles.btnGoogle]} onPress={onGoogle} disabled={busy || !request}>
          <Text style={styles.btnGoogleTxt}>Continuar con Google</Text>
        </Pressable>

        <Text style={styles.legal}>Al continuar aceptas los Términos y la Política de Privacidad de 1212.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flexGrow: 1, backgroundColor: colors.bg, justifyContent: "flex-end", paddingTop: 80 },
  top: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30 },
  logo: { fontSize: 26, fontWeight: "600", letterSpacing: 8, color: "#fff", paddingLeft: 8 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  form: { padding: 28, paddingBottom: 40, gap: 12 },
  tabs: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: "rgba(255,255,255,0.1)" },
  tabTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  tabTxtOn: { color: "#fff" },
  input: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: colors.card, color: "#fff", paddingHorizontal: 18 },
  btn: { height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnTxt: { color: "#0b0b0b", fontSize: 15, fontWeight: "600" },
  forgot: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 4 },
  divider: { alignItems: "center", marginVertical: 6 },
  dividerTxt: { color: colors.textFaint, fontSize: 13 },
  btnGoogle: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  btnGoogleTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  legal: { marginTop: 10, fontSize: 12, lineHeight: 18, color: "rgba(255,255,255,0.32)", textAlign: "center" },
});
