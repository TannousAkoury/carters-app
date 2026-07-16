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
    if (section.type === "image") return <ImageBackground key={section.id} source={section.image?{uri:section.image}:undefined} style={[styles.imageBanner,{backgroundColor:section.background},custom.section]} imageStyle={styles.image}><View style={styles.imageOverlay}><Text style={[styles.imageTitle,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.imageCopy,custom.description]}>{section.subtitle}</Text>:null}{section.buttonLabel?<TouchableOpacity style={[styles.button,custom.button]} onPress={()=>onOpen()}><Text style={[styles.buttonText,custom.buttonText]}>{section.buttonLabel}</Text></TouchableOpacity>:null}</View></ImageBackground>;
    if (section.type === "categories") return <View key={section.id} style={[styles.contentSection,{backgroundColor:section.background},custom.section]}><Text style={[styles.title,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.copy,custom.description]}>{section.subtitle}</Text>:null}<View style={styles.categoryGrid}>{(section.items??[]).map((item,index)=><TouchableOpacity key={`${item}-${index}`} style={styles.categoryTile} onPress={()=>onOpen()}><Text style={styles.categoryIcon}>{["♡","★","☀","✦"][index%4]}</Text><Text style={styles.categoryLabel}>{item}</Text></TouchableOpacity>)}</View></View>;
    if (section.type === "features") return <View key={section.id} style={[styles.contentSection,{backgroundColor:section.background},custom.section]}><Text style={[styles.title,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.copy,custom.description]}>{section.subtitle}</Text>:null}<View style={styles.featureList}>{(section.items??[]).map((item,index)=><View key={`${item}-${index}`} style={styles.featureRow}><Text style={styles.featureCheck}>✓</Text><Text style={styles.featureText}>{item}</Text></View>)}</View></View>;
    if (section.type === "testimonials") return <View key={section.id} style={[styles.contentSection,{backgroundColor:section.background},custom.section]}><Text style={[styles.title,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.copy,custom.description]}>{section.subtitle}</Text>:null}<View style={styles.quoteList}>{(section.items??[]).slice(0,3).map((item,index)=><View key={`${item}-${index}`} style={styles.quoteCard}><Text style={styles.quoteStars}>★★★★★</Text><Text style={styles.quoteText}>“{item}”</Text></View>)}</View></View>;
    if (section.type === "newsletter") return <View key={section.id} style={[styles.newsletter,{backgroundColor:section.background},custom.section]}><Text style={styles.newsletterIcon}>✉</Text><Text style={[styles.title,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.copy,custom.description]}>{section.subtitle}</Text>:null}{section.buttonLabel?<TouchableOpacity style={[styles.newsletterButton,custom.button]} onPress={()=>onOpen()}><Text style={[styles.newsletterButtonText,custom.buttonText]}>{section.buttonLabel}</Text></TouchableOpacity>:null}</View>;
    if (section.type === "divider") return <View key={section.id} style={[styles.dividerWrap,custom.section]}><View style={[styles.divider,{backgroundColor:section.background}]}/></View>;
    return <View key={section.id} style={[styles.text,{backgroundColor:section.background},custom.section]}><Text style={[styles.title,custom.title]}>{section.title}</Text>{section.subtitle?<Text style={[styles.copy,custom.description]}>{section.subtitle}</Text>:null}{section.buttonLabel?<TouchableOpacity style={custom.button} onPress={()=>onOpen()}><Text style={[styles.link,custom.buttonText]}>{section.buttonLabel} →</Text></TouchableOpacity>:null}</View>;
  })}</>;
}
const styles=StyleSheet.create({notice:{paddingVertical:11,paddingHorizontal:18},noticeText:{color:"#fff",textAlign:"center",fontSize:12,fontWeight:"900"},hero:{minHeight:310,justifyContent:"flex-end"},image:{resizeMode:"cover"},overlay:{padding:24,paddingTop:90,backgroundColor:"rgba(0,0,0,.22)"},heroTitle:{color:"#fff",fontSize:27,fontWeight:"900",maxWidth:280},heroCopy:{color:"#fff",fontSize:14,lineHeight:20,marginTop:7,maxWidth:280},button:{alignSelf:"flex-start",marginTop:15,backgroundColor:"#fff",paddingHorizontal:16,paddingVertical:11,borderRadius:5},buttonText:{color:"#0b2944",fontSize:12,fontWeight:"900"},text:{padding:25,alignItems:"center"},contentSection:{paddingHorizontal:20,paddingVertical:25},title:{fontSize:22,fontWeight:"900",color:"#0b2944",textAlign:"center"},copy:{fontSize:13,lineHeight:20,color:"#61707d",textAlign:"center",marginTop:8},link:{color:"#397ab5",fontSize:12,fontWeight:"900",marginTop:12},imageBanner:{minHeight:260,justifyContent:"flex-end"},imageOverlay:{padding:22,paddingTop:80,backgroundColor:"rgba(8,35,55,.3)"},imageTitle:{color:"#fff",fontSize:25,fontWeight:"900"},imageCopy:{maxWidth:290,marginTop:7,color:"#fff",fontSize:13,lineHeight:19},categoryGrid:{marginTop:18,flexDirection:"row",flexWrap:"wrap",gap:10},categoryTile:{width:"48%",minHeight:90,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#dce6ed",borderRadius:14,backgroundColor:"#fff",padding:12},categoryIcon:{fontSize:22,color:"#397ab5"},categoryLabel:{marginTop:7,color:"#183b55",fontSize:12,fontWeight:"800",textAlign:"center"},featureList:{marginTop:17,gap:9},featureRow:{flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:"#e0e7ec",borderRadius:11,backgroundColor:"#fff",padding:13},featureCheck:{width:24,height:24,borderRadius:12,backgroundColor:"#e6f5ee",color:"#16815b",fontSize:12,fontWeight:"900",textAlign:"center",lineHeight:24},featureText:{flex:1,color:"#334b5d",fontSize:12,fontWeight:"700"},quoteList:{marginTop:17,gap:10},quoteCard:{borderWidth:1,borderColor:"#eadfce",borderRadius:12,backgroundColor:"#fff",padding:15},quoteStars:{color:"#d89924",fontSize:10,letterSpacing:1},quoteText:{marginTop:8,color:"#40515d",fontSize:12,lineHeight:18,fontWeight:"600"},newsletter:{alignItems:"center",paddingHorizontal:25,paddingVertical:30},newsletterIcon:{width:42,height:42,borderRadius:21,backgroundColor:"#fff",color:"#397ab5",fontSize:19,textAlign:"center",lineHeight:42,marginBottom:12},newsletterButton:{marginTop:16,borderRadius:8,backgroundColor:"#0d416c",paddingHorizontal:22,paddingVertical:12},newsletterButtonText:{color:"#fff",fontSize:12,fontWeight:"900"},dividerWrap:{paddingHorizontal:20,paddingVertical:16},divider:{height:1,width:"100%"}});
