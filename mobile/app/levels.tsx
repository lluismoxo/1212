import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors, LEVELS } from "@/theme/tokens";
import { Crystal } from "@/components/Crystal";

export default function Levels() {
  const { me } = useAuth();
  const [current, setCurrent] = useState(1);
  const [sel, setSel] = useState(1);

  useEffect(() => {
    (async () => {
      if (!me?.username) return;
      const pub = await api<{ level: { current_level: number } }>(`/profiles/${me.username}`, { auth: false }).catch(() => null);
      if (pub?.level) { setCurrent(pub.level.current_level); setSel(pub.level.current_level); }
    })();
  }, [me]);

  const lv = LEVELS[sel - 1];

  return (
    <ScrollView style={styles.c} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Niveles</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
        <Crystal level={lv} size={140} />
        <Text style={styles.tag}>NIVEL {lv.n}</Text>
        <Text style={styles.name}>{lv.name}</Text>
        <Text style={styles.desc}>{lv.desc}</Text>
      </View>

      <View style={styles.path}>
        {LEVELS.map((l) => {
          const unlocked = l.n <= current;
          const isSel = l.n === sel;
          return (
            <Pressable
              key={l.n}
              style={[styles.node, isSel && styles.nodeSel, { borderColor: unlocked ? l.aura : colors.border }]}
              onPress={() => setSel(l.n)}
            >
              <Text style={[styles.nodeN, { color: unlocked ? l.aura : colors.textFaint }]}>{l.n}</Text>
              <Text style={[styles.nodeName, !unlocked && { color: colors.textFaint }]}>{l.name}</Text>
              {!unlocked && <Text style={styles.lock}>🔒</Text>}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hero: { alignItems: "center", paddingVertical: 20, gap: 6 },
  tag: { fontSize: 12, letterSpacing: 3, color: colors.textFaint, marginTop: 10 },
  name: { fontSize: 28, fontWeight: "700", color: "#fff" },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: "center", maxWidth: 260, lineHeight: 20 },
  path: { paddingHorizontal: 22, gap: 8, marginTop: 10 },
  node: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1 },
  nodeSel: { backgroundColor: "rgba(255,255,255,0.08)" },
  nodeN: { fontSize: 18, fontWeight: "800", width: 24 },
  nodeName: { color: "#fff", fontSize: 15, fontWeight: "500", flex: 1 },
  lock: { fontSize: 14 },
});
