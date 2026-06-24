import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors, LEVELS } from "@/theme/tokens";

interface LevelInfo { current_level: number; progress: number; }

export default function Home() {
  const { me, signOut } = useAuth();
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const st = await api<{ streak: number }>("/habits/streak");
      setStreak(st.streak);
    } catch {}
    try {
      // nivel desde el perfil público propio (incluye level)
      if (me?.username) {
        const pub = await api<{ level: LevelInfo }>(`/profiles/${me.username}`, { auth: false }).catch(() => null);
        if (pub?.level) setLevel(pub.level);
      }
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const lv = LEVELS[(level?.current_level ?? 1) - 1];

  return (
    <ScrollView
      style={styles.c}
      contentContainerStyle={{ padding: 22, paddingTop: 64, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Bienvenido</Text>
          <Text style={styles.name}>{me?.display_name ?? "—"}</Text>
        </View>
        <Pressable onPress={signOut}><Text style={styles.signout}>Salir</Text></Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.levelTag}>NIVEL {lv.n}</Text>
        <Text style={styles.levelName}>{lv.name}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${level?.progress ?? 0}%`, backgroundColor: lv.aura }]} />
        </View>
      </View>

      <Text style={styles.section}>Resumen del día</Text>
      <View style={styles.cards}>
        <Stat value={String(streak)} label="Días de racha" accent />
      </View>

      <View style={styles.grid}>
        <Quick label="Hábitos" onPress={() => router.push("/habits")} />
        <Quick label="Tareas" onPress={() => router.push("/tasks")} />
        <Quick label="Diario" onPress={() => router.push("/journal")} />
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: colors.gold }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Quick({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quick} onPress={onPress}>
      <Text style={styles.quickTxt}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcome: { fontSize: 13, color: colors.textFaint },
  name: { fontSize: 17, fontWeight: "600", color: "#fff" },
  signout: { color: colors.textMuted, fontSize: 14 },
  hero: { alignItems: "center", marginVertical: 36 },
  levelTag: { fontSize: 12, letterSpacing: 4, color: colors.textFaint, marginTop: 10 },
  levelName: { fontSize: 34, fontWeight: "800", color: "#fff", marginTop: 4 },
  barBg: { width: 240, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 20 },
  barFill: { height: "100%", borderRadius: 4 },
  section: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 12 },
  cards: { flexDirection: "row", gap: 10, marginBottom: 22 },
  stat: { flex: 1, padding: 18, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 28, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  grid: { flexDirection: "row", gap: 10 },
  quick: { flex: 1, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  quickTxt: { fontSize: 13, fontWeight: "500", color: "#fff" },
});
