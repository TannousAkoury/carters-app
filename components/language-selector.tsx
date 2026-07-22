import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalization } from "@/components/localization-context";
import type { AppLocale } from "@/services/locale";
import { hasArabicText } from "@/services/locale";

const options: { locale: AppLocale; key: "language.english" | "language.arabic" | "language.french" | "language.romanian" }[] = [
  { locale: "en", key: "language.english" },
  { locale: "ar", key: "language.arabic" },
  { locale: "fr", key: "language.french" },
  { locale: "ro", key: "language.romanian" },
];

export function LanguageSelector({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { locale, setLocale, t } = useLocalization();
  const select = (next: AppLocale) => { setLocale(next); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View style={styles.titleRow}><Ionicons name="language-outline" size={22} color="#397ab5" /><Text style={[styles.title, locale === "ar" && styles.arabicText]}>{t("language.title")}</Text></View>
            <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")}><Ionicons name="close" size={24} color="#52616d" /></TouchableOpacity>
          </View>
          {options.map((option) => {
            const selected = option.locale === locale;
            const label = t(option.key);
            return <TouchableOpacity key={option.locale} style={[styles.option, selected && styles.optionSelected]} onPress={() => select(option.locale)} accessibilityRole="radio" accessibilityState={{ checked: selected }}><Text style={[styles.optionText, selected && styles.optionTextSelected, hasArabicText(label) && styles.arabicText]}>{label}</Text><Text style={styles.code}>{option.locale.toUpperCase()}</Text>{selected ? <Ionicons name="checkmark-circle" size={21} color="#397ab5" /> : <View style={styles.checkPlaceholder} />}</TouchableOpacity>;
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function LanguageButton({ onPress }: { onPress: () => void }) {
  const { locale, t } = useLocalization();
  return <TouchableOpacity style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel={t("language.selectorLabel")}><Ionicons name="globe-outline" size={18} color="#4b7fb9" /><Text style={styles.buttonCode}>{locale.toUpperCase()}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(5,24,42,.38)", justifyContent: "flex-end" },
  arabicText: { writingDirection: "rtl" },
  sheet: { width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  title: { color: "#0b2944", fontSize: 19, fontWeight: "900", textAlign: "left" },
  close: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  option: { minHeight: 54, flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, marginTop: 7, borderWidth: 1, borderColor: "#e2e8ec", backgroundColor: "#fff" },
  optionSelected: { backgroundColor: "#eef6fb", borderColor: "#b8d5e8" },
  optionText: { flex: 1, color: "#26364d", fontSize: 15, fontWeight: "700", textAlign: "left" },
  optionTextSelected: { color: "#174e7a", fontWeight: "900" },
  code: { color: "#8a98a5", fontSize: 10, fontWeight: "800", marginHorizontal: 10 },
  checkPlaceholder: { width: 21 },
  button: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  buttonCode: { color: "#4b7fb9", fontSize: 7, lineHeight: 8, fontWeight: "900" },
});
