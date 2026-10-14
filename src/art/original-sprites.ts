/**
 * Greenvale Afterfall — original, deterministic pixel art rendered to a small
 * 3x4 spritesheet in the browser. No third-party RPG portraits or CDN textures.
 * Each 48x56 cell is hand-composed from pixel rectangles, and three motion
 * frames × four facings support the RPGJS RM spritesheet preset.
 */
export const HERO_STYLES = ["novice","vanguard","arcanist","ranger","mender","shade","trader"] as const;
export const MONSTER_STYLES = [
  "ashfang_wolf","mossling","sewer_rat","ironthorn_boar","blightcap_mushroom",
  "hollow_scarecrow","giant_mire_crab","ash_bat","stone_husk",
  "hollow_raider","field_boss",
] as const;
export const NPC_STYLES = [
  "mara","trainer","merchant","blacksmith","healer","quest_keeper","gatekeeper","settler",
] as const;

type Palette={ body:string; trim:string; skin:string; shadow:string; eyes:string; head:string; special:string };
const humanoid: Record<string,Partial<Palette>>={
 novice:{body:"#66826e",trim:"#d0b97d",head:"#384c43",special:"#d0bd79"},
 vanguard:{body:"#62676a",trim:"#c6ae79",head:"#394348",special:"#e6d1a5"},
 arcanist:{body:"#555475",trim:"#acb6ed",head:"#252c56",special:"#a58ce8"},
 ranger:{body:"#3c6851",trim:"#d9ba70",head:"#355044",special:"#8dbda3"},
 mender:{body:"#9bb9a3",trim:"#dcd3a1",head:"#52665a",special:"#eff2c8"},
 shade:{body:"#333743",trim:"#8c81a9",head:"#22212d",special:"#b6a7d0"},
 trader:{body:"#896548",trim:"#e4b968",head:"#514136",special:"#c49c5e"},
 mara:{body:"#6e554a",trim:"#efbd8a",head:"#3c3431",special:"#b37e61"},
 trainer:{body:"#535e59",trim:"#c9ae76",head:"#313e3a",special:"#ede1a7"},
 merchant:{body:"#986f48",trim:"#dfbd78",head:"#453729",special:"#e7aa74"},
 blacksmith:{body:"#4b5a61",trim:"#d2a37a",head:"#34363a",special:"#b1bcc0"},
 healer:{body:"#729981",trim:"#d0e1c2",head:"#526354",special:"#b4d6b6"},
 quest_keeper:{body:"#68798b",trim:"#e0c08c",head:"#334356",special:"#cad4e1"},
 gatekeeper:{body:"#576b5d",trim:"#c1b58c",head:"#35453a",special:"#d0cbac"},
 settler:{body:"#7a6d5c",trim:"#d0ac85",head:"#5b493b",special:"#dbc09e"}
};
const monsterPalette:Record<string,Partial<Palette>>={
 ashfang_wolf:{body:"#5d6864",trim:"#8da193",head:"#394b46",eyes:"#e8a25f",special:"#d9d5af"},
 mossling:{body:"#3f7654",trim:"#a0ce76",head:"#2d533a",eyes:"#fbcd86",special:"#e6c870"},
 sewer_rat:{body:"#83746b",trim:"#bb9d8f",head:"#594f4d",eyes:"#efb6ae",special:"#e3b0a5"},
 ironthorn_boar:{body:"#777262",trim:"#a19b81",head:"#4a4b43",eyes:"#e4a260",special:"#c3b68c"},
 blightcap_mushroom:{body:"#b3ac86",trim:"#8f5970",head:"#613e53",eyes:"#e8dcaa",special:"#d4a3ba"},
 hollow_scarecrow:{body:"#938564",trim:"#bea478",head:"#524e39",eyes:"#f2b971",special:"#d5a355"},
 giant_mire_crab:{body:"#4d777b",trim:"#88a49d",head:"#315b63",eyes:"#f6b87a",special:"#8fd0c2"},
 ash_bat:{body:"#67677e",trim:"#9c8fa5",head:"#34374e",eyes:"#ef93aa",special:"#c4b2d0"},
 stone_husk:{body:"#747b77",trim:"#a4a39a",head:"#4c5650",eyes:"#a6d9ad",special:"#b4b9a5"},
 hollow_raider:{body:"#73534e",trim:"#aa8371",head:"#33282c",eyes:"#d7aa85",special:"#d6b97f"},
 field_boss:{body:"#495d58",trim:"#a3b37c",head:"#2e413b",eyes:"#f2a65e",special:"#deb966"}
};

const FRAME_W=48,FRAME_H=56;
const cache=new Map<string,string>();

function palette(id:string):Palette{
 const p=id.startsWith("monster-")?monsterPalette[id.slice(8)]:id.startsWith("npc-")?humanoid[id.slice(4)]:humanoid[id.replace(/^hero-?/,"")];
 return {
  body:p?.body||"#5e7b67",trim:p?.trim||"#e0c48e",skin:"#ca9a74",
  shadow:"#162b2c",eyes:p?.eyes||"#292a2d",head:p?.head||"#374d41",special:p?.special||"#cabc84",
 };
}

function paintFrame(ctx:CanvasRenderingContext2D,id:string,frame:number,direction:number):void{
 const p=palette(id);const monster=id.startsWith("monster-");
 const key=id.replace(/^monster-/,"").replace(/^hero-/,"").replace(/^npc-/,"");
 const x=frame*FRAME_W,y=direction*FRAME_H;
 const step=frame===0?-2:frame===2?2:0;
 const side=direction===1?-1:direction===2?1:0;
 const px=(xx:number,yy:number,w:number,h:number,color:string)=>{
   ctx.fillStyle=color;ctx.fillRect(x+xx,y+yy,w,h);
 };
 // Transparent background plus subtle contact shadow; each pixel is 2-6 px.
 px(9,48,30,4,"#12232166");
 if(monster){
   if(key==="blightcap_mushroom"){
     px(18,30+step,12,17,p.trim);px(8,19+step,32,15,p.head);px(13,13+step,22,11,p.body);
     px(15,25+step,5,4,p.special);px(29,23+step,5,4,p.special);
     px(17,34+step,4,4,p.eyes);px(29,34+step,4,4,p.eyes);
   } else if(key==="giant_mire_crab"){
     px(11,28+step,26,18,p.body);px(15,22+step,18,8,p.trim);
     px(2,29+step,12,8,p.special);px(34,29+step,12,8,p.special);
     px(2,23+step,7,7,p.body);px(39,23+step,7,7,p.body);
     px(16,18+step,4,7,p.eyes);px(28,18+step,4,7,p.eyes);
     for(let i=0;i<3;i++){px(8,39+i*3+step,6,2,p.shadow);px(34,39+i*3+step,6,2,p.shadow)}
   } else if(key==="ash_bat"){
     px(3,24+step,12,15,p.trim);px(33,24+step,12,15,p.trim);
     px(1,21+step,7,7,p.head);px(40,21+step,7,7,p.head);
     px(14,21+step,20,19,p.body);px(14,15+step,5,8,p.head);px(29,15+step,5,8,p.head);
     px(19,27+step,4,4,p.eyes);px(26,27+step,4,4,p.eyes);
   } else if(key==="mossling"){
     px(14,26+step,20,20,p.body);px(10,19+step,28,13,p.head);px(11,14+step,7,9,p.trim);px(28,11+step,8,12,p.trim);
     px(18,29+step,4,4,p.eyes);px(27,29+step,4,4,p.eyes);px(17,45+step,5,3,p.shadow);px(27,45+step,5,3,p.shadow);
   } else if(key==="stone_husk"||key==="field_boss"){
     const big=key==="field_boss";
     px(big?8:12,23+step,big?32:24,26,p.body);px(14,12+step,20,16,p.head);
     px(4,25+step,9,21,p.trim);px(35,25+step,9,21,p.trim);
     px(16,17+step,5,4,p.eyes);px(27,17+step,5,4,p.eyes);
     px(16,39+step,7,9,p.shadow);px(26,39+step,7,9,p.shadow);
     if(big){px(8,12+step,8,10,p.special);px(32,12+step,8,10,p.special);}
   } else if(key==="hollow_scarecrow"||key==="hollow_raider"){
     px(20,13+step,8,35,p.shadow);px(9,26+step,30,6,p.trim);
     px(13,20+step,22,25,p.body);px(15,12+step,18,15,p.head);
     px(19,21+step,3,3,p.eyes);px(28,21+step,3,3,p.eyes);
     px(5,24+step,8,4,p.special);px(35,24+step,8,4,p.special);
   } else {
     // Quadrupeds: asymmetrical ears, tails and tusks distinguish species.
     const boar=key==="ironthorn_boar",rat=key==="sewer_rat";
     px(7,28+step,31,17,p.body);px(24,21+step,18,18,p.head);
     px(27,17+step,7,8,p.trim);px(37,16+step,6,10,p.trim);
     px(32,26+step,4,3,p.eyes);
     px(9,42+step,6,7,p.shadow);px(26,42-step,6,7,p.shadow);
     px(1,23+step,9,6,p.trim);
     if(boar){px(17,18+step,5,12,p.special);px(28,34+step,9,5,p.special);}
     if(rat){px(1,41+step,12,3,p.special);px(39,32+step,6,4,p.skin);}
   }
 } else {
   const jog=frame===1?-2:frame===2?2:0;
   px(16,38+jog,7,12,p.shadow);px(26,38-jog,7,12,p.shadow);
   px(13,23+jog,23,19,p.body);
   px(13,22+jog,23,4,p.trim);
   px(8+step,24+jog,6,16,p.skin);px(35-step,24-jog,6,16,p.skin);
   px(15,8+jog,19,18,p.skin);px(15,7+jog,19,7,p.head);
   px(14,13+jog,4,10,p.head);px(32,13+jog,4,10,p.head);
   if(direction!==3){px(18+side,18+jog,3,3,p.eyes);px(27+side,18+jog,3,3,p.eyes);}
   if(["vanguard","trainer","gatekeeper"].includes(key)){
     px(9,26+jog,8,12,p.trim);px(36,28+jog,8,15,p.special);
   }else if(["ranger","shade"].includes(key)){
     px(36,20+jog,4,28,p.special);px(33,20+jog,4,7,p.head);
   }else if(["arcanist","mender","healer"].includes(key)){
     px(39,14+jog,3,30,p.special);px(36,11+jog,9,6,p.trim);
   }else if(["trader","merchant","blacksmith"].includes(key)){
     px(8,31+jog,9,13,p.trim);px(33,31+jog,9,13,p.special);
   }else if(key==="mara"||key==="quest_keeper"){
     px(12,24+jog,24,6,p.special);
   }else{px(38,28+jog,4,20,p.special);}
 }
}

export function originalSpriteDataUrl(id:string):string{
 const cached=cache.get(id);if(cached)return cached;
 const canvas=document.createElement("canvas");
 canvas.width=FRAME_W*3;canvas.height=FRAME_H*4;
 const ctx=canvas.getContext("2d",{alpha:true});
 if(!ctx)throw new Error("Pixel sprite canvas unavailable");
 ctx.imageSmoothingEnabled=false;
 for(let direction=0;direction<4;direction++)for(let frame=0;frame<3;frame++)paintFrame(ctx,id,frame,direction);
 const url=canvas.toDataURL("image/png");
 cache.set(id,url);
 return url;
}
export const ORIGINAL_SPRITE_SIZE={width:FRAME_W*3,height:FRAME_H*4,frameWidth:FRAME_W,frameHeight:FRAME_H};
