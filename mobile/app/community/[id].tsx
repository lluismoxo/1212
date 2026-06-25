import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface Msg {
  id: string; kind: string; body: string | null; created_at: string;
  username: string | null; display_name: string | null;
}

export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("Comunidad");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");

  async function loadMessages() {
    try {
      const m = await api<Msg[]>(`/communities/${id}/messages?limit=50`);
      setMsgs(m);
    } catch {}
  }

  // nombre una vez; mensajes con refresco (polling cada 4s) — "tiempo casi real"
  useEffect(() => {
    if (!id) return;
    api<{ name: string }>(`/communities/${id}`).then((c) => setName(c.name)).catch(() => {});
    loadMessages();
    const iv = setInterval(loadMessages, 4000);
    return () => clearInterval(iv);
  }, [id]);

  async function send() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      await api(`/communities/${id}/messages`, { method: "POST", body: { kind: "text", body: text } });
      await loadMessages();
    } catch {}
  }

  return (
    <KeyboardAvoidingView style={styles.c} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>{name}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        inverted
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={msgs}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.author}>{item.display_name ?? "Anónimo"}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Sé el primero en escribir.</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
        />
        <Pressable style={styles.send} onPress={send}><Text style={styles.sendTxt}>➤</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingBottom: 8 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  msg: { padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  author: { color: colors.gold, fontSize: 12, marginBottom: 3 },
  body: { color: "#fff", fontSize: 15 },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 40 },
  inputRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 30 },
  input: { flex: 1, height: 50, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: colors.card, color: "#fff", paddingHorizontal: 18 },
  send: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  sendTxt: { color: "#070707", fontSize: 18 },
});
