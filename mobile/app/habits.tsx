import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface Habit { id: string; name: string; }

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [draft, setDraft] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    try { setHabits(await api<Habit[]>("/habits")); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.trim()) return;
    const h = await api<Habit>("/habits", { method: "POST", body: { name: draft.trim() } });
    setHabits((p) => [...p, h]);
    setDraft("");
  }
  async function check(h: Habit) {
    await api(`/habits/${h.id}/log`, { method: "PUT", body: { date: today, done: true } });
  }

  return (
    <View style={styles.c}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Inicio</Text></Pressable>
      <Text style={styles.h1}>Hábitos</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo hábito…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
        />
        <Pressable style={styles.addBtn} onPress={add}><Text style={styles.addTxt}>＋</Text></Pressable>
      </View>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => (
          <Pressable style={styles.habit} onPress={() => check(item)}>
            <Text style={styles.habitTxt}>{item.name}</Text>
            <Text style={styles.tick}>✓ hoy</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Crea tu primer hábito.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: 22, paddingTop: 64 },
  back: { color: colors.textMuted, fontSize: 15, marginBottom: 10 },
  h1: { fontSize: 26, fontWeight: "700", color: "#fff", marginBottom: 18 },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  input: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: colors.card, color: "#fff", paddingHorizontal: 18 },
  addBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  addTxt: { color: "#070707", fontSize: 24, fontWeight: "700" },
  habit: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  habitTxt: { color: "#fff", fontSize: 15 },
  tick: { color: colors.gold, fontSize: 13 },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 50 },
});
