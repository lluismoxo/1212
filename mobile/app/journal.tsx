import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

export default function Journal() {
  const today = new Date().toISOString().slice(0, 10);
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const e = await api<{ body: string } | null>(`/journal/${today}`);
      if (e?.body) setBody(e.body);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await api(`/journal/${today}`, { method: "PUT", body: { body } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <View style={styles.c}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Inicio</Text></Pressable>
      <Text style={styles.h1}>Diario</Text>
      <TextInput
        style={styles.area}
        placeholder="Escribe sobre tu día…"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />
      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveTxt}>{saved ? "Guardado ✓" : "Guardar"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: 22, paddingTop: 64 },
  back: { color: colors.textMuted, fontSize: 15, marginBottom: 10 },
  h1: { fontSize: 26, fontWeight: "700", color: "#fff", marginBottom: 18 },
  area: { minHeight: 220, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: "#fff", fontSize: 16, lineHeight: 24, padding: 18 },
  save: { height: 54, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 18 },
  saveTxt: { color: "#070707", fontSize: 15, fontWeight: "600" },
});
