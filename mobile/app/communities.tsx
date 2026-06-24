import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface Community {
  id: string; name: string; description: string | null; members: number; joined: boolean; is_private: boolean;
}

export default function Communities() {
  const [items, setItems] = useState<Community[]>([]);

  async function load() {
    try { setItems(await api<Community[]>("/communities")); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function join(c: Community) {
    if (c.joined) { router.push(`/community/${c.id}`); return; }
    try { await api(`/communities/${c.id}/join`, { method: "POST" }); await load(); } catch {}
  }

  return (
    <View style={styles.c}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Comunidad</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        contentContainerStyle={{ padding: 20 }}
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => join(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
              <Text style={styles.meta}>{item.members} miembros{item.is_private ? " · privada" : ""}</Text>
            </View>
            <Text style={[styles.cta, item.joined && { color: colors.gold }]}>{item.joined ? "Abrir" : "Unirse"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay comunidades todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  desc: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  meta: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  cta: { color: "#fff", fontSize: 14, fontWeight: "600" },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 60 },
});
