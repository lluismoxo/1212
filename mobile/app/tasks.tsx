import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface Task { id: string; text: string; done: boolean; }

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");

  async function load() {
    try { setTasks(await api<Task[]>("/tasks")); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.trim()) return;
    const t = await api<Task>("/tasks", { method: "POST", body: { text: draft.trim() } });
    setTasks((p) => [...p, t]);
    setDraft("");
  }
  async function toggle(t: Task) {
    const upd = await api<Task>(`/tasks/${t.id}`, { method: "PATCH", body: { done: !t.done } });
    setTasks((p) => p.map((x) => (x.id === t.id ? upd : x)));
  }
  async function remove(t: Task) {
    await api(`/tasks/${t.id}`, { method: "DELETE" });
    setTasks((p) => p.filter((x) => x.id !== t.id));
  }

  return (
    <View style={styles.c}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Inicio</Text></Pressable>
      <Text style={styles.h1}>Tareas del día</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Añadir una tarea…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
        />
        <Pressable style={styles.addBtn} onPress={add}><Text style={styles.addTxt}>＋</Text></Pressable>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Pressable style={styles.task} onPress={() => toggle(item)} onLongPress={() => remove(item)}>
            <Text style={[styles.taskTxt, item.done && styles.done]}>{item.text}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Todo hecho. Disfruta el día.</Text>}
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
  task: { padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  taskTxt: { color: "#fff", fontSize: 15 },
  done: { textDecorationLine: "line-through", color: colors.textFaint },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 50 },
});
