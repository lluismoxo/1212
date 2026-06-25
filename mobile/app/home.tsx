import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors, LEVELS } from "@/theme/tokens";
import { Crystal } from "@/components/Crystal";
import { Glass, ScreenBg, ActionTile } from "@/theme/ui";

interface LevelInfo { current_level: number; progress: number; }

const ACTIONS: { label: string; icon: keyof typeof Feather.glyphMap; route: string }[] = [
  { label: "Hábitos", icon: "check-square", route: "/habits" },
  { label: "Tareas", icon: "check-circle", route: "/tasks" },
  { label: "Diario", icon: "book", route: "/journal" },
  { label: "Comunidad", icon: "users", route: "/communities" },
  { label: "Mapa", icon: "globe", route: "/map" },
  { label: "Buscar", icon: "search", route: "/search" },
];

export default function Home() {
  const { me } = useAuth();
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [streak, setStreak] = useState(0);
  const [habitsToday, setHabitsToday] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setStreak((await api<{ streak: number }>("/habits/streak")).streak); } catch {}
    try { setHabitsToday((await api<{ habit_id: string }[]>("/habits/today")).length); } catch {}
    try { setLevel(await api<LevelInfo>("/levels/me")); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const lv = LEVELS[(level?.current_level ?? 1) - 1];

  return (
    <ScreenBg aura={lv.aura}>
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingTop: 64, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={lv.aura} />}
      >
        {/* header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Bienvenido</Text>
            <Text style={styles.name}>{me?.display_name ?? "—"}</Text>
          </View>
          <View style={styles.headerRight}>
            <Glass style={styles.streakChip}>
              <Feather name="zap" size={14} color={colors.gold} />
              <Text style={styles.streakTxt}>{streak}</Text>
            </Glass>
            <Pressable onPress={() => router.push("/profile")}>
              <Glass style={styles.avatarBtn}><Feather name="user" size={20} color="#fff" /></Glass>
            </Pressable>
          </View>
        </View>

        {/* hero: cristal + nivel */}
        <Pressable style={styles.hero} onPress={() => router.push("/levels")}>
          <Crystal level={lv} size={130} />
          <Text style={styles.levelTag}>NIVEL {lv.n}</Text>
          <Text style={styles.levelName}>{lv.name}</Text>
          <View style={styles.barWrap}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${level?.progress ?? 0}%`, backgroundColor: lv.aura }]} />
            </View>
            <Text style={styles.barLabel}>Progreso de evolución</Text>
          </View>
        </Pressable>

        {/* grid de acciones */}
        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <View key={a.label} style={styles.gridItem}>
              <ActionTile
                label={a.label}
                accent={lv.aura}
                icon={<Feather name={a.icon} size={22} color={lv.aura} />}
                onPress={() => router.push(a.route as any)}
              />
            </View>
          ))}
        </View>

        {/* resumen del día */}
        <Text style={styles.section}>Resumen del día</Text>
        <View style={styles.stats}>
          <Glass style={styles.stat}>
            <Text style={styles.statValue}>{habitsToday}</Text>
            <Text style={styles.statLabel}>Hábitos hoy</Text>
          </Glass>
          <Glass style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{streak}</Text>
            <Text style={styles.statLabel}>Días de racha</Text>
          </Glass>
        </View>
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcome: { fontSize: 13, color: colors.textFaint },
  name: { fontSize: 17, fontWeight: "600", color: "#fff" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  streakChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 36, borderRadius: 14 },
  streakTxt: { fontSize: 14, fontWeight: "600", color: colors.gold },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", marginVertical: 30 },
  levelTag: { fontSize: 12, letterSpacing: 4, color: colors.textFaint, marginTop: 14 },
  levelName: { fontSize: 34, fontWeight: "800", color: "#fff", letterSpacing: -0.7, marginTop: 4 },
  barWrap: { width: 240, maxWidth: "86%", marginTop: 20 },
  barBg: { height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barLabel: { fontSize: 12, color: colors.textMuted, marginTop: 9, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 26 },
  gridItem: { width: "31.5%" },
  section: { fontSize: 13, fontWeight: "600", color: colors.textMuted, letterSpacing: 0.3, marginBottom: 12 },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, padding: 18 },
  statValue: { fontSize: 28, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
});
