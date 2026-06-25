import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface Result {
  username: string; display_name: string; avatar_url: string | null;
  city: string | null; current_level: number | null;
}

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);

  // búsqueda parcial con debounce
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api<Result[]>(`/profiles/search?q=${encodeURIComponent(term)}`);
        setResults(r);
        setSearched(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <View style={styles.c}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Buscar perfiles</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Nombre o usuario…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          value={q}
          onChangeText={setQ}
        />
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: 20 }}
        data={results}
        keyExtractor={(r) => r.username}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/u/${item.username}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.display_name}</Text>
              <Text style={styles.handle}>@{item.username}{item.city ? ` · ${item.city}` : ""}</Text>
            </View>
            <Text style={styles.level}>Nv {item.current_level ?? 1}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          searched ? <Text style={styles.empty}>Sin resultados.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  searchBox: { padding: 20 },
  input: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: colors.card, color: "#fff", paddingHorizontal: 18 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  handle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  level: { color: colors.gold, fontSize: 13 },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 30 },
});
