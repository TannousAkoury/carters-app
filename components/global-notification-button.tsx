import { useNotifications } from "@/components/notification-context";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalization } from "@/components/localization-context";

export function GlobalNotificationButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { unread } = useNotifications();
  const { t } = useLocalization();
  if (pathname === "/notifications" || pathname === "/" || pathname === "/index") return null;
  return <TouchableOpacity style={[styles.button, (pathname === "/" || pathname === "/index") && styles.homeButton]} onPress={() => router.push("/notifications")} accessibilityLabel={t("navigation.notificationsAccessibility", { count: unread })}><Ionicons name="notifications-outline" size={22} color="#397ab5" />{unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text></View>}</TouchableOpacity>;
}
const styles=StyleSheet.create({button:{position:"absolute",zIndex:600,right:13,top:Platform.OS==="ios"?100:82,width:40,height:40,borderRadius:20,alignItems:"center",justifyContent:"center",backgroundColor:"#fff",shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:.12,shadowRadius:6,elevation:7},homeButton:{top:Platform.OS==="ios"?112:92},badge:{position:"absolute",right:-2,top:-3,minWidth:17,height:17,paddingHorizontal:3,borderRadius:9,alignItems:"center",justifyContent:"center",backgroundColor:"#e0938e",borderWidth:2,borderColor:"#fff"},badgeText:{color:"#fff",fontSize:8,fontWeight:"900"}});
