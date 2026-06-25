import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface Habit { id: string; name: string; }

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [compliance, setCompliance] = useState<number | null>(null);

  async function load() {
    try {
      const [hs, today, lvl] = await Promise.all([
        api<Habit[]>("/habits"),
        api<{ habit_id: string }[]>("/habits/today"),
        api<{ current_month_compliance: number }>("/levels/me").catch(() => null),
      ]);
      setHabits(hs);
      setDoneToday(new Set(today.map((t) => t.habit_id)));
      if (lvl) setCompliance(lvl.current_month_compliance);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.trim()) return;
    const h = await api<Habit>("/habits", { method: "POST", body: { name: draft.trim() } });
    setHabits((p) => [...p, h]);
    setDraft("");
  }

  async function toggle(h: Habit) {
    const isDone = doneToday.has(h.id);
    // la fecha la pone el servidor; aquí solo decimos done true/false
    await api(`/habits/${h.id}/log`, { method: "PUT", body: { done: !isDone } });
    setDoneToday((p) => {
      const n = new Set(p);
      if (isDone) n.delete(h.id); else n.add(h.id);
      return n;
    });
    load();
  }

  function remove(h: Habit) {
    Alert.alert("Eliminar hábito", `¿Eliminar "${h.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          await api(`/habits/${h.id}`, { method: "DELETE" });
          setHabits((p) => p.filter((x) => x.id !== h.id));
        },
      },
    ]);
  }

  return (
    <View style={styles.c}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Inicio</Text></Pressable>
      <Text style={styles.h1}>Hábitos</Text>
      {compliance != null && (
        <Text style={styles.compliance}>Cumplimiento de este mes: {compliance}% (necesitas 70% para subir de nivel)</Text>
      )}
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
        renderItem={({ item }) => {
          const done = doneToday.has(item.id);
          return (
            <Pressable style={styles.habit} onPress={() => toggle(item)} onLongPress={() => remove(item)}>
              <View style={[styles.check, done && styles.checkOn]}>
                {done && <Text style={styles.checkTxt}>✓</Text>}
              </View>
              <Text style={[styles.habitTxt, done && styles.habitDone]}>{item.name}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Crea tu primer hábito.</Text>}
      />
      <Text style={styles.hint}>Toca para marcar/desmarcar hoy · mantén pulsado para eliminar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: 22, paddingTop: 64 },
  back: { color: colors.textMuted, fontSize: 15, marginBottom: 10 },
  h1: { fontSize: 26, fontWeight: "700", color: "#fff", marginBottom: 8 },
  compliance: { color: colors.gold, fontSize: 13, marginBottom: 16 },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  input: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: colors.card, color: "#fff", paddingHorizontal: 18 },
  addBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  addTxt: { color: "#070707", fontSize: 24, fontWeight: "700" },
  habit: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkTxt: { color: "#070707", fontSize: 15, fontWeight: "700" },
  habitTxt: { color: "#fff", fontSize: 15, flex: 1 },
  habitDone: { color: colors.textFaint },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 50 },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: "center", marginTop: 10 },
});
