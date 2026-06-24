import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/theme/tokens";

interface PublicProfile {
  username: string; display_name: string; city: string | null;
  level: { current_level: number; name: string } | null;
}

export default function Search() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function go() {
    const username = q.trim().replace(/^@/, "").toLowerCase();
    if (!username) return;
    setResult(null); setNotFound(false);
    try {
      const p = await api<PublicProfile>(`/profiles/${username}`, { auth: false });
      setResult(p);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
    }
  }

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
          placeholder="Nombre de usuario exacto…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={go}
        />
      </View>
      {result && (
        <Pressable style={styles.card} onPress={() => router.push(`/u/${result.username}`)}>
          <Text style={styles.name}>{result.display_name}</Text>
          <Text style={styles.handle}>@{result.username}</Text>
          {result.level ? <Text style={styles.level}>Nivel {result.level.current_level} · {result.level.name}</Text> : null}
        </Pressable>
      )}
      {notFound && <Text style={styles.empty}>No existe ese usuario (o su perfil es privado).</Text>}
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
  card: { marginHorizontal: 20, padding: 18, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  name: { color: "#fff", fontSize: 17, fontWeight: "600" },
  handle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  level: { color: colors.gold, fontSize: 13, marginTop: 6 },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 30, paddingHorizontal: 30 },
});
