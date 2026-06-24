import { useEffect, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { colors, LEVELS } from "@/theme/tokens";
import { Crystal } from "@/components/Crystal";

interface PublicProfile {
  username: string; display_name: string; bio: string | null; city: string | null;
  links: { kind: string; url: string }[];
  level: { current_level: number; name: string } | null;
}

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try { setP(await api<PublicProfile>(`/profiles/${username}`, { auth: false })); }
      catch { setNotFound(true); }
    })();
  }, [username]);

  const lv = LEVELS[(p?.level?.current_level ?? 1) - 1];

  return (
    <View style={styles.c}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>
      {notFound ? (
        <Text style={styles.empty}>Perfil no disponible.</Text>
      ) : p ? (
        <View style={styles.body}>
          <Crystal level={lv} size={100} />
          <Text style={styles.name}>{p.display_name}</Text>
          <Text style={styles.handle}>@{p.username}</Text>
          {p.level ? <Text style={styles.level}>Nivel {p.level.current_level} · {p.level.name}</Text> : null}
          {p.city ? <Text style={styles.city}>{p.city}</Text> : null}
          {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
          <View style={styles.links}>
            {p.links.map((l, i) => (
              <Pressable key={i} style={styles.link} onPress={() => Linking.openURL(l.url)}>
                <Text style={styles.linkTxt}>{l.kind}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  body: { alignItems: "center", padding: 24, gap: 6 },
  name: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 10 },
  handle: { color: colors.textMuted, fontSize: 14 },
  level: { color: colors.gold, fontSize: 14 },
  city: { color: colors.textFaint, fontSize: 13 },
  bio: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, justifyContent: "center" },
  link: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  linkTxt: { color: "#fff", fontSize: 13, textTransform: "capitalize" },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 60 },
});
