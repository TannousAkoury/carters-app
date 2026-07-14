import type { AdminPlacement, AdminSection } from "@/services/admin-content";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

type NativeCustomStyles={section:ViewStyle;title:TextStyle;description:TextStyle;button:ViewStyle;buttonText:TextStyle};
const numberValue=(value:string)=>{const parsed=Number.parseFloat(value);return Number.isFinite(parsed)?parsed:undefined};
function parseCustomCss(source=""):NativeCustomStyles{
  const result:NativeCustomStyles={section:{},title:{},description:{},button:{},buttonText:{}};
  for(const block of source.matchAll(/\.(section|title|description|button)\s*\{([^}]*)\}/gi)){
    const group=block[1].toLowerCase() as "section"|"title"|"description"|"button";
    for(const declaration of block[2].split(";")){
      const separator=declaration.indexOf(":");if(separator<0)continue;
      const property=declaration.slice(0,separator).trim().toLowerCase();const value=declaration.slice(separator+1).trim();if(!value||/url\s*\(|@import|expression\s*\(/i.test(value))continue;
      const numeric=numberValue(value);
      if(group==="section"){
        if(property==="background-color")result.section.backgroundColor=value;
        else if(property==="padding"&&numeric!==undefined)result.section.padding=numeric;
        else if(property==="padding-top"&&numeric!==undefined)result.section.paddingTop=numeric;
        else if(property==="padding-right"&&numeric!==undefined)result.section.paddingRight=numeric;
        else if(property==="padding-bottom"&&numeric!==undefined)result.section.paddingBottom=numeric;
        else if(property==="padding-left"&&numeric!==undefined)result.section.paddingLeft=numeric;
        else if(property==="margin"&&numeric!==undefined)result.section.margin=numeric;
        else if(property==="margin-top"&&numeric!==undefined)result.section.marginTop=numeric;
        else if(property==="margin-bottom"&&numeric!==undefined)result.section.marginBottom=numeric;
        else if(property==="border-radius"&&numeric!==undefined)result.section.borderRadius=numeric;
        else if(property==="border-width"&&numeric!==undefined)result.section.borderWidth=numeric;
        else if(property==="border-color")result.section.borderColor=value;
        else if(property==="min-height"&&numeric!==undefined)result.section.minHeight=numeric;
      }else if(group==="button"){
        if(property==="background-color")result.button.backgroundColor=value;
        else if(property==="color")result.buttonText.color=value;
        else if(property==="font-size"&&numeric!==undefined)result.buttonText.fontSize=numeric;
        else if(property==="font-weight")result.buttonText.fontWeight=value as TextStyle["fontWeight"];
        else if(property==="border-radius"&&numeric!==undefined)result.button.borderRadius=numeric;
        else if(property==="padding"&&numeric!==undefined)result.button.padding=numeric;
        else if(property==="padding-left"&&numeric!==undefined)result.button.paddingLeft=numeric;
        else if(property==="padding-right"&&numeric!==undefined)result.button.paddingRight=numeric;
        else if(property==="padding-top"&&numeric!==undefined)result.button.paddingTop=numeric;
        else if(property==="padding-bottom"&&numeric!==undefined)result.button.paddingBottom=numeric;
        else if(property==="margin-top"&&numeric!==undefined)result.button.marginTop=numeric;
      }else{
        const textStyle=group==="title"?result.title:result.description;
        if(property==="color")textStyle.color=value;
        else if(property==="font-size"&&numeric!==undefined)textStyle.fontSize=numeric;
        else if(property==="font-weight")textStyle.fontWeight=value as TextStyle["fontWeight"];
        else if(property==="text-align"&&["auto","left","right","center","justify"].includes(value))textStyle.textAlign=value as TextStyle["textAlign"];
        else if(property==="line-height"&&numeric!==undefined)textStyle.lineHeight=numeric;
        else if(property==="margin-top"&&numeric!==undefined)textStyle.marginTop=numeric;
        else if(property==="margin-bottom"&&numeric!==undefined)textStyle.marginBottom=numeric;
      }
    }
  }
  return result;
}

export function AdminSections({ sections, placement, onOpen }: { sections: AdminSection[]; placement: AdminPlacement; onOpen: (url?: string) => void }) {
  const ordered = sections.filter((section) => (section.placement ?? "before-hero") === placement);
  if (!ordered.length) return null;
  return <>{ordered.map((section) => {
    const custom=parseCustomCss(section.customCss);
    if (section.type === "announcement") return <View key={section.id} style={[styles.notice,{backgroundColor:section.background},custom.section]}><Text style={[styles.noticeText,custom.title]}>{section.title}</Text></View>;
    if (section.type === "hero") return <ImageBackground key={section.id} source={section.image?{uri:section.image}:undefined} style={[styles.hero,{backgroundColor:section.background},custom.section]} imageStyle={styles.image}><View style={styles.overlay}><Text style={[styles.heroTitle,custom.title]}>{section.title}</Text><Text style={[styles.heroCopy,custom.description]}>{section.subtitle}</Text>{section.buttonLabel?<TouchableOpacity style={[styles.button,custom.button]} onPress={()=>onOpen()}><Text style={[styles.buttonText,custom.buttonText]}>{section.buttonLabel}</Text></TouchableOpacity>:null}</View></ImageBackground>;
    return <View key={section.id} style={[styles.text,{backgroundColor:section.background},custom.section]}><Text style={[styles.title,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.copy,custom.description]}>{section.subtitle}</Text>:null}{section.buttonLabel?<TouchableOpacity style={custom.button} onPress={()=>onOpen()}><Text style={[styles.link,custom.buttonText]}>{section.buttonLabel} →</Text></TouchableOpacity>:null}</View>;
  })}</>;
}
const styles=StyleSheet.create({notice:{paddingVertical:11,paddingHorizontal:18},noticeText:{color:"#fff",textAlign:"center",fontSize:12,fontWeight:"900"},hero:{minHeight:310,justifyContent:"flex-end"},image:{resizeMode:"cover"},overlay:{padding:24,paddingTop:90,backgroundColor:"rgba(0,0,0,.22)"},heroTitle:{color:"#fff",fontSize:27,fontWeight:"900",maxWidth:280},heroCopy:{color:"#fff",fontSize:14,lineHeight:20,marginTop:7,maxWidth:280},button:{alignSelf:"flex-start",marginTop:15,backgroundColor:"#fff",paddingHorizontal:16,paddingVertical:11,borderRadius:5},buttonText:{color:"#0b2944",fontSize:12,fontWeight:"900"},text:{padding:25,alignItems:"center"},title:{fontSize:22,fontWeight:"900",color:"#0b2944",textAlign:"center"},copy:{fontSize:13,lineHeight:20,color:"#61707d",textAlign:"center",marginTop:8},link:{color:"#397ab5",fontSize:12,fontWeight:"900",marginTop:12}});
