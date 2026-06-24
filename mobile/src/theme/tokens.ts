// Tokens del diseño 1212 (extraídos del prototipo index.html).

export const colors = {
  bg: "#070707",
  bgDeep: "#050506",
  gold: "#E6C77A",
  white: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.5)",
  textFaint: "rgba(255,255,255,0.4)",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
};

export interface Level {
  n: number;
  name: string;
  desc: string;
  aura: string;
  colors: { deep: string; mid: string; light: string; edge: string; glow: string };
}

// 9 niveles (idénticos a LEVELS[] del prototipo y a la semilla de la DB).
export const LEVELS: Level[] = [
  { n: 1, name: "Aprendiz", desc: "El primer paso. La piedra aún en bruto.", aura: "#8B3FE6", colors: { deep: "#160F26", mid: "#241738", light: "#3C2A5E", edge: "#6A4FB0", glow: "#8B3FE6" } },
  { n: 2, name: "Acompañante", desc: "Caminas con constancia. La forma emerge.", aura: "#3F63E6", colors: { deep: "#0C1626", mid: "#142540", light: "#22416E", edge: "#4F74E6", glow: "#3F63E6" } },
  { n: 3, name: "Maestro", desc: "Dominas tu disciplina. La gema toma color.", aura: "#2FB98A", colors: { deep: "#0A211B", mid: "#103229", light: "#1A5141", edge: "#2FB98A", glow: "#2FB98A" } },
  { n: 4, name: "Guardián", desc: "Proteges tu progreso. La luz crece.", aura: "#FF4FA8", colors: { deep: "#2A0F22", mid: "#451631", light: "#7C2A57", edge: "#FF4FA8", glow: "#FF4FA8" } },
  { n: 5, name: "Vidente", desc: "Ves más allá. Brillo y claridad.", aura: "#2FE0D2", colors: { deep: "#0C2F3A", mid: "#134E5C", light: "#21788C", edge: "#2FE0D2", glow: "#2FE0D2" } },
  { n: 6, name: "Arquitecto", desc: "Construyes tu propio camino. Energía pura.", aura: "#4F9BFF", colors: { deep: "#15334C", mid: "#28567B", light: "#4787BE", edge: "#4F9BFF", glow: "#4F9BFF" } },
  { n: 7, name: "Soberano", desc: "Dueño de tu evolución. Casi pulido.", aura: "#9FB2D0", colors: { deep: "#34415A", mid: "#566A8C", light: "#869CC0", edge: "#B0C4E0", glow: "#9FB2D0" } },
  { n: 8, name: "Iluminado", desc: "Resplandor sereno. La perfección se acerca.", aura: "#6FE6FF", colors: { deep: "#6A6A80", mid: "#9696AE", light: "#C6C6D8", edge: "#E6E6F0", glow: "#6FE6FF" } },
  { n: 9, name: "Grado Supremo", desc: "La cima. Cristal puro de luz y oro.", aura: "#E6C77A", colors: { deep: "#9A8748", mid: "#D0AE5A", light: "#F2DC90", edge: "#FFF6D6", glow: "#E6C77A" } },
];
