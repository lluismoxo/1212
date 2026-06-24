import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { getCurrentCoords, getLocationState } from "@/services/permissions";
import { colors, LEVELS } from "@/theme/tokens";

interface NearbyUser {
  username: string; display_name: string; city: string | null;
  current_level: number | null; dist_m: number;
}

export default function MapScreen() {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const st = await getLocationState();
      if (st === "denied" || st === "undetermined") { setDenied(true); setLoading(false); return; }
      try {
        const { lat, lng } = await getCurrentCoords();
        const near = await api<NearbyUser[]>(`/location/nearby?lat=${lat}&lng=${lng}&radiusKm=500&limit=100`);
        setUsers(near);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <View style={styles.c}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Mapa global</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 60 }} />
      ) : denied ? (
        <Text style={styles.empty}>Activa la ubicación para ver a personas cerca de ti.</Text>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 20 }}
          data={users}
          keyExtractor={(u) => u.username}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/u/${item.username}`)}>
              <View style={[styles.dot, { backgroundColor: LEVELS[(item.current_level ?? 1) - 1].aura }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text style={styles.meta}>
                  {item.city ?? "—"} · {(item.dist_m / 1000).toFixed(0)} km
                </Text>
              </View>
              <Text style={styles.lvl}>Nv {item.current_level ?? 1}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nadie cerca todavía.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#05070b", paddingTop: 58 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  back: { color: "#fff", fontSize: 30 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  meta: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  lvl: { color: colors.gold, fontSize: 13 },
  empty: { color: colors.textFaint, textAlign: "center", marginTop: 60, paddingHorizontal: 30, lineHeight: 20 },
});
