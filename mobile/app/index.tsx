import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/state/auth";
import { colors } from "@/theme/tokens";

// Splash + enrutado inicial según sesión y onboarding.
export default function Splash() {
  const { loading, me } = useAuth();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (!me) router.replace("/auth");
      else if (!me.onboarding_done) router.replace("/onboarding");
      else router.replace("/home");
    }, 1200);
    return () => clearTimeout(t);
  }, [loading, me]);

  return (
    <View style={styles.c}>
      <Text style={styles.logo}>1212</Text>
      <Text style={styles.sub}>EVOLUCIONA</Text>
      <ActivityIndicator color={colors.gold} style={{ marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 40, fontWeight: "300", letterSpacing: 14, color: "#fff", paddingLeft: 14 },
  sub: { fontSize: 12, fontWeight: "500", letterSpacing: 4, color: colors.textFaint, marginTop: 10 },
});
