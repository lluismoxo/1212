import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors } from "@/theme/tokens";

// Pantalla de consentimiento: informa qué datos son públicos ANTES de pedir permisos.
// Conecta con RGPD (consentimiento informado) y con el riesgo de ubicación pública.
export default function Consent() {
  return (
    <View style={styles.c}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Antes de empezar</Text>
        <Text style={styles.p}>
          1212 es una app social. Para que funcione, parte de tu información es{" "}
          <Text style={styles.bold}>pública</Text> para la comunidad:
        </Text>

        <Item title="Tu perfil es público" desc="Nombre de usuario, nombre, foto, ciudad y enlaces que añadas." />
        <Item title="Tu ubicación puede ser pública" desc="Si la activas, aparecerás en el mapa global. Podrás elegir entre ubicación exacta, solo tu ciudad, o desactivarla. Puedes cambiarlo cuando quieras." />
        <Item title="Tu diario es privado" desc="Solo tú accedes a él. Nadie más, ni el equipo de 1212." />
        <Item title="No vendemos tus datos" desc="Nunca cedemos tus datos a terceros con fines comerciales." />

        <Text style={styles.legal}>
          Al continuar aceptas la Política de Privacidad y los Términos de Servicio.
        </Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => router.replace("/permissions")}>
          <Text style={styles.btnTxt}>Entiendo y acepto</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Item({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemTitle}>{title}</Text>
      <Text style={styles.itemDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, paddingTop: 64 },
  body: { padding: 28, gap: 16 },
  h1: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 4 },
  p: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  bold: { color: "#fff", fontWeight: "700" },
  item: { padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  itemTitle: { fontSize: 15, fontWeight: "600", color: "#fff", marginBottom: 4 },
  itemDesc: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  legal: { fontSize: 12, lineHeight: 18, color: "rgba(255,255,255,0.4)", marginTop: 8 },
  actions: { padding: 28, paddingBottom: 46 },
  btn: { height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "#070707", fontSize: 16, fontWeight: "600" },
});
