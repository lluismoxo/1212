import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { colors, LEVELS } from "@/theme/tokens";
import { Crystal } from "@/components/Crystal";

interface FullProfile {
  username: string; display_name: string; bio: string | null; city: string | null;
  avatar_url: string | null;
  location_sharing: "exact" | "city" | "off";
}

export default function Profile() {
  const { me, signOut } = useAuth();
  const [p, setP] = useState<FullProfile | null>(null);
  const [level, setLevel] = useState(1);

  async function load() {
    try { setP(await api<FullProfile>("/profiles/me")); } catch {}
    if (me?.username) {
      const pub = await api<{ level: { current_level: number } }>(`/profiles/${me.username}`, { auth: false }).catch(() => null);
      if (pub?.level) setLevel(pub.level.current_level);
    }
  }
  useEffect(() => { load(); }, [me]);

  async function setSharing(value: "exact" | "city" | "off") {
    await api("/profiles/me", { method: "PATCH", body: { locationSharing: value } });
    setP((x) => (x ? { ...x, location_sharing: value } : x));
  }

  // MVP: avatar por URL (sin storage propio). Más adelante → subida a R2.
  function editAvatar() {
    Alert.prompt?.(
      "Foto de perfil",
      "Pega la URL de una imagen (https://…)",
      async (url) => {
        if (!url) return;
        try {
          await api("/profiles/me", { method: "PATCH", body: { avatarUrl: url } });
          setP((x) => (x ? { ...x, avatar_url: url } : x));
        } catch {
          Alert.alert("Error", "URL no válida.");
        }
      },
      "plain-text",
      p?.avatar_url ?? "",
    );
  }

  function confirmDelete() {
    Alert.alert(
      "Eliminar cuenta",
      "Esto borra tu cuenta y tus datos de forma permanente. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try { await api("/auth/account", { method: "DELETE" }); } catch {}
            await signOut();
            router.replace("/auth");
          },
        },
      ],
    );
  }

  const lv = LEVELS[level - 1];

  return (
    <ScrollView style={styles.c} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.top}>
        <Pressable onPress={editAvatar}>
          {p?.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarEmpty}><Crystal level={lv} size={70} /></View>
          )}
          <Text style={styles.editAvatar}>Cambiar foto</Text>
        </Pressable>
        <Text style={styles.name}>{p?.display_name ?? "—"}</Text>
        <Text style={styles.handle}>@{p?.username}</Text>
        <Text style={styles.levelTxt}>Nivel {lv.n} · {lv.name}</Text>
        {p?.city ? <Text style={styles.city}>{p.city}</Text> : null}
      </View>

      <Text style={styles.section}>Ubicación pública</Text>
      <View style={styles.segment}>
        {(["exact", "city", "off"] as const).map((v) => (
          <Pressable
            key={v}
            style={[styles.seg, p?.location_sharing === v && styles.segOn]}
            onPress={() => setSharing(v)}
          >
            <Text style={[styles.segTxt, p?.location_sharing === v && styles.segTxtOn]}>
              {v === "exact" ? "Exacta" : v === "city" ? "Ciudad" : "Oculta"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        Controla cómo te ven en el mapa. "Ciudad" oculta tu posición exacta; "Oculta" te quita del mapa.
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => router.push("/levels")}>
          <Text style={styles.actionTxt}>Ver mi evolución</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={signOut}>
          <Text style={styles.actionTxt}>Cerrar sesión</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.danger]} onPress={confirmDelete}>
          <Text style={styles.dangerTxt}>Eliminar cuenta</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  top: { alignItems: "center", gap: 6, paddingVertical: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: colors.gold },
  avatarEmpty: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  editAvatar: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 6 },
  name: { fontSize: 22, fontWeight: "700", color: "#fff", marginTop: 8 },
  handle: { fontSize: 14, color: colors.textMuted },
  levelTxt: { fontSize: 14, color: colors.gold },
  city: { fontSize: 13, color: colors.textFaint },
  section: { fontSize: 13, fontWeight: "600", color: colors.textMuted, paddingHorizontal: 22, marginTop: 16, marginBottom: 10 },
  segment: { flexDirection: "row", gap: 4, marginHorizontal: 22, padding: 4, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  seg: { flex: 1, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: "rgba(230,199,122,0.15)" },
  segTxt: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  segTxtOn: { color: colors.gold },
  hint: { fontSize: 12, color: colors.textFaint, paddingHorizontal: 22, marginTop: 8, lineHeight: 17 },
  actions: { padding: 22, gap: 10, marginTop: 16 },
  action: { padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionTxt: { color: "#fff", fontSize: 15, textAlign: "center" },
  danger: { backgroundColor: "rgba(255,79,79,0.08)", borderColor: "rgba(255,79,79,0.3)" },
  dangerTxt: { color: "#ff6b6b", fontSize: 15, textAlign: "center", fontWeight: "600" },
});
