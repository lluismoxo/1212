import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors } from "@/theme/tokens";

const STEPS = [
  { title: "Evoluciona cada día", body: "Hábitos, tareas y diario que hacen crecer tu nivel." },
  { title: "9 niveles, un camino", body: "Del Aprendiz al Grado Supremo. Tu cristal evoluciona contigo." },
  { title: "No estás solo", body: "Comunidades y un mapa global de personas como tú." },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  return (
    <View style={styles.c}>
      <View style={styles.body}>
        <Text style={styles.title}>{STEPS[step].title}</Text>
        <Text style={styles.sub}>{STEPS[step].body}</Text>
      </View>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.actions}>
        {last ? (
          <Pressable style={styles.btn} onPress={() => router.replace("/permissions")}>
            <Text style={styles.btnTxt}>Empezar</Text>
          </Pressable>
        ) : (
          <View style={styles.row}>
            <Pressable onPress={() => router.replace("/permissions")}>
              <Text style={styles.skip}>Saltar</Text>
            </Pressable>
            <Pressable style={styles.btnSmall} onPress={() => setStep((s) => s + 1)}>
              <Text style={styles.btnTxt}>Siguiente</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingBottom: 46 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  title: { fontSize: 30, fontWeight: "600", color: "#fff", textAlign: "center" },
  sub: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: "center", maxWidth: 300 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  dotOn: { width: 22, backgroundColor: colors.gold },
  actions: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skip: { color: colors.textFaint, fontSize: 15, fontWeight: "500" },
  btn: { height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  btnSmall: { height: 54, paddingHorizontal: 30, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "#070707", fontSize: 15, fontWeight: "600" },
});
