import { View } from "react-native";
import Svg, { Polygon, Defs, RadialGradient, LinearGradient, Stop, Ellipse } from "react-native-svg";
import type { Level } from "@/theme/tokens";

// Cristal facetado por nivel (versión RN fiel al SVG del prototipo).
export function Crystal({ level, size = 120 }: { level: Level; size?: number }) {
  const { deep, mid, light, edge, glow } = level.colors;
  const id = `c${level.n}`;
  return (
    <View style={{ width: size, height: size * 1.12 }}>
      <Svg width={size} height={size * 1.12} viewBox="0 0 200 224">
        <Defs>
          <RadialGradient id={`${id}g`} cx="50%" cy="54%" r="55%">
            <Stop offset="0" stopColor={glow} stopOpacity="0.55" />
            <Stop offset="1" stopColor={glow} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mid} />
            <Stop offset="1" stopColor={deep} />
          </LinearGradient>
          <LinearGradient id={`${id}c`} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={edge} />
            <Stop offset="1" stopColor={light} />
          </LinearGradient>
          <LinearGradient id={`${id}u`} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="1" stopColor={mid} />
          </LinearGradient>
        </Defs>

        {/* halo */}
        <Ellipse cx="100" cy="120" rx="86" ry="96" fill={`url(#${id}g)`} />

        {/* cara izquierda (oscura) */}
        <Polygon points="28,200 64,120 100,12 100,224" fill={`url(#${id}f)`} />
        {/* cara derecha (clara) */}
        <Polygon points="100,12 136,120 172,200 100,224" fill={`url(#${id}u)`} />
        {/* faceta central brillante */}
        <Polygon points="64,120 100,12 136,120 100,160" fill={`url(#${id}c)`} fillOpacity={0.9} />
        {/* faceta inferior */}
        <Polygon points="64,120 100,160 136,120 100,224" fill={light} fillOpacity={0.35} />
        {/* destello superior */}
        <Polygon points="100,12 118,76 100,90 82,76" fill="#fff" fillOpacity={0.25} />
      </Svg>
    </View>
  );
}
