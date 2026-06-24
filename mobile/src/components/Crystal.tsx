import { View } from "react-native";
import Svg, { Polygon, Defs, RadialGradient, Stop, Ellipse } from "react-native-svg";
import type { Level } from "@/theme/tokens";

// Cristal simplificado por nivel (versión RN del SVG del prototipo).
export function Crystal({ level, size = 120 }: { level: Level; size?: number }) {
  const { deep, mid, light, glow } = level.colors;
  return (
    <View style={{ width: size, height: size * 1.12 }}>
      <Svg width={size} height={size * 1.12} viewBox="0 0 200 224">
        <Defs>
          <RadialGradient id={`g${level.n}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glow} stopOpacity="0.5" />
            <Stop offset="1" stopColor={glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="100" cy="120" rx="86" ry="96" fill={`url(#g${level.n})`} />
        <Polygon points="28,200 64,120 100,12" fill={deep} />
        <Polygon points="100,12 136,120 172,200 100,224" fill={mid} />
        <Polygon points="64,120 100,12 136,120 100,224 28,200" fill={light} fillOpacity={0.55} />
      </Svg>
    </View>
  );
}
