import type { AdminPlacement, AdminSection } from "@/services/admin-content";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function AdminSections({ sections, placement, onOpen }: { sections: AdminSection[]; placement: AdminPlacement; onOpen: (url?: string) => void }) {
  const ordered = sections.filter((section) => (section.placement ?? "before-hero") === placement);
  if (!ordered.length) return null;
  return <>{ordered.map((section) => {
    if (section.type === "announcement") return <View key={section.id} style={[styles.notice,{backgroundColor:section.background}]}><Text style={styles.noticeText}>{section.title}</Text></View>;
    if (section.type === "hero") return <ImageBackground key={section.id} source={section.image?{uri:section.image}:undefined} style={[styles.hero,{backgroundColor:section.background}]} imageStyle={styles.image}><View style={styles.overlay}><Text style={styles.heroTitle}>{section.title}</Text><Text style={styles.heroCopy}>{section.subtitle}</Text>{section.buttonLabel?<TouchableOpacity style={styles.button} onPress={()=>onOpen()}><Text style={styles.buttonText}>{section.buttonLabel}</Text></TouchableOpacity>:null}</View></ImageBackground>;
    return <View key={section.id} style={[styles.text,{backgroundColor:section.background}]}><Text style={styles.title}>{section.title}</Text>{section.subtitle?<Text style={styles.copy}>{section.subtitle}</Text>:null}{section.buttonLabel?<TouchableOpacity onPress={()=>onOpen()}><Text style={styles.link}>{section.buttonLabel} →</Text></TouchableOpacity>:null}</View>;
  })}</>;
}
const styles=StyleSheet.create({notice:{paddingVertical:11,paddingHorizontal:18},noticeText:{color:"#fff",textAlign:"center",fontSize:12,fontWeight:"900"},hero:{minHeight:310,justifyContent:"flex-end"},image:{resizeMode:"cover"},overlay:{padding:24,paddingTop:90,backgroundColor:"rgba(0,0,0,.22)"},heroTitle:{color:"#fff",fontSize:27,fontWeight:"900",maxWidth:280},heroCopy:{color:"#fff",fontSize:14,lineHeight:20,marginTop:7,maxWidth:280},button:{alignSelf:"flex-start",marginTop:15,backgroundColor:"#fff",paddingHorizontal:16,paddingVertical:11,borderRadius:5},buttonText:{color:"#0b2944",fontSize:12,fontWeight:"900"},text:{padding:25,alignItems:"center"},title:{fontSize:22,fontWeight:"900",color:"#0b2944",textAlign:"center"},copy:{fontSize:13,lineHeight:20,color:"#61707d",textAlign:"center",marginTop:8},link:{color:"#397ab5",fontSize:12,fontWeight:"900",marginTop:12}});
