import { View, Text, Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { colors } from "./tokens";

// Sistema visual del prototipo: glass cards, fondo con aura del nivel, etc.

// Tarjeta "glass" (cristal esmerilado) como en el diseño.
export function Glass({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

// Fondo de pantalla con aura radial del color del nivel (como el prototipo).
export function ScreenBg({ aura = colors.gold, children }: { aura?: string; children: ReactNode }) {
  return (
    <View style={styles.bgRoot}>
      <LinearGradient
        colors={[hexA(aura, 0.14), "transparent"]}
        style={styles.aura}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

// Botón de acción "glass" con icono + label (grid del home).
export function ActionTile({ label, icon, onPress, accent }: {
  label: string; icon: ReactNode; onPress: () => void; accent: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
      <View style={[styles.glass, styles.tileInner]}>
        <View style={{ marginBottom: 12 }}>{icon}</View>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

// hex + alpha → rgba
export function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    // sutil resalte superior tipo cristal
    shadowColor: "#fff",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  bgRoot: { flex: 1, backgroundColor: colors.bg },
  aura: { position: "absolute", top: 0, left: 0, right: 0, height: 320 },
  tile: { flex: 1 },
  tileInner: { padding: 16, alignItems: "flex-start", minHeight: 92, justifyContent: "space-between" },
  tileLabel: { color: "#fff", fontSize: 13, fontWeight: "500" },
});
