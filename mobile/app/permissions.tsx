import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import {
  requestCamera, requestPhotos, requestLocation, getCurrentCoords, openSystemSettings,
  type PermState,
} from "@/services/permissions";
import { colors } from "@/theme/tokens";

// Fase 5: permisos contextuales, con todos los estados y la ubicación marcada como PÚBLICA.
export default function Permissions() {
  const [phase, setPhase] = useState<"camera" | "location">("camera");
  const [busy, setBusy] = useState(false);

  function explainDenied(what: string) {
    Alert.alert(
      `Permiso de ${what} rechazado`,
      "Puedes concederlo más tarde desde Ajustes del sistema.",
      [
        { text: "Ahora no", style: "cancel" },
        { text: "Abrir Ajustes", onPress: openSystemSettings },
      ],
    );
  }

  async function onCamera() {
    setBusy(true);
    try {
      const cam: PermState = await requestCamera();
      await requestPhotos(); // foto de perfil desde galería
      if (cam === "denied") explainDenied("cámara");
    } finally {
      setBusy(false);
      setPhase("location");
    }
  }

  async function onLocation() {
    setBusy(true);
    try {
      const st = await requestLocation();
      if (st === "granted" || st === "limited") {
        // sube ubicación (será pública según el perfil)
        const coords = await getCurrentCoords();
        try { await api("/location/me", { method: "PUT", body: coords }); } catch {}
      } else if (st === "denied") {
        explainDenied("ubicación");
      }
    } finally {
      setBusy(false);
      await finish();
    }
  }

  async function finish() {
    try { await api("/profiles/me/onboarding-done", { method: "POST" }); } catch {}
    router.replace("/home");
  }

  if (phase === "camera") {
    return (
      <Screen
        tag="Permiso 1 de 2"
        title="Cámara y Fotos"
        body="Para tu foto de perfil y capturar los momentos de tu evolución."
        cta="Permitir acceso"
        onCta={onCamera}
        onSkip={() => setPhase("location")}
        busy={busy}
      />
    );
  }
  return (
    <Screen
      tag="Permiso 2 de 2"
      title="Localización"
      body="Para aparecer en el mapa global y descubrir a otros cerca de ti. Tu ubicación será PÚBLICA para la comunidad."
      cta="Permitir y hacer pública mi ubicación"
      onCta={onLocation}
      onSkip={finish}
      busy={busy}
    />
  );
}

function Screen(p: {
  tag: string; title: string; body: string; cta: string;
  onCta: () => void; onSkip: () => void; busy: boolean;
}) {
  return (
    <View style={styles.c}>
      <Text style={styles.tag}>{p.tag}</Text>
      <View style={styles.mid}>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.body}>{p.body}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={p.onCta} disabled={p.busy}>
          <Text style={styles.btnTxt}>{p.cta}</Text>
        </Pressable>
        <Pressable onPress={p.onSkip} disabled={p.busy}>
          <Text style={styles.skip}>Ahora no</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: 30, paddingTop: 80, paddingBottom: 46, justifyContent: "space-between" },
  tag: { textAlign: "center", fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" },
  mid: { alignItems: "center", gap: 14 },
  title: { fontSize: 24, fontWeight: "600", color: "#fff", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: "center", maxWidth: 300 },
  actions: { gap: 12 },
  btn: { height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "#070707", fontSize: 16, fontWeight: "600" },
  skip: { textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "500", paddingVertical: 14 },
});
