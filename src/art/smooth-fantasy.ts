/**
 * Greenvale Afterfall – Phase 5B smooth-fantasy runtime sprite atlas.
 *
 * Original, transparent Canvas 2D art (no remote/CDN assets).
 * Each atlas contains nine distinct action banks of 3 frames × 4 facing rows:
 * down, left, right, up. Frames share the same ground anchor.
 * All poses are original, deterministic procedural placeholders; final hand-painted layered art is still pending.
 */
export const SMOOTH_ACTIONS = ["walk","idle","run","attack","cast","hit","death","rest","emote"] as const;
export type SmoothAction = (typeof SMOOTH_ACTIONS)[number];
export const SMOOTH_FRAMES_PER_ACTION = 3;
export const SMOOTH_FRAME = { width: 96, height: 112, columns: SMOOTH_ACTIONS.length * SMOOTH_FRAMES_PER_ACTION, rows: 4 } as const;
export function smoothActionOffset(action: SmoothAction): number {
  return Math.max(0, SMOOTH_ACTIONS.indexOf(action)) * SMOOTH_FRAMES_PER_ACTION;
}
export type SmoothRole = "hero" | "monster";
export type SmoothFacing = 0 | 1 | 2 | 3;
export const SMOOTH_FACING_ORDER = ["down", "left", "right", "up"] as const;

type Palette = { body: string; trim: string; dark: string; glow: string };
const palettes: Record<string, Palette> = {
  novice: { body:"#586778",trim:"#c69b65",dark:"#253040",glow:"#c65850" },
  vanguard: { body:"#66717a",trim:"#e1c28e",dark:"#292f3b",glow:"#d65f4a" },
  arcanist: { body:"#58537e",trim:"#bca9e7",dark:"#302849",glow:"#9478ff" },
  ranger: { body:"#426f57",trim:"#c8b777",dark:"#253f37",glow:"#7dd0ad" },
  mender: { body:"#879d94",trim:"#e5d5ae",dark:"#455e59",glow:"#b3e2be" },
  shade: { body:"#3b3c50",trim:"#9687b6",dark:"#252533",glow:"#b37adc" },
  trader: { body:"#8f6c53",trim:"#dab47c",dark:"#4c382e",glow:"#efbd82" },
  mara: { body:"#775849",trim:"#d5aa86",dark:"#45362f",glow:"#eeb790" },
  trainer: { body:"#52655f",trim:"#e3cb94",dark:"#2c3f3b",glow:"#e7c772" },
  merchant: { body:"#9a714c",trim:"#e1be88",dark:"#594333",glow:"#dba46e" },
  blacksmith: { body:"#4f5f6b",trim:"#c6a17e",dark:"#303844",glow:"#e5a05a" },
  healer: { body:"#7caa8f",trim:"#e8ddba",dark:"#486957",glow:"#ace4b0" },
  quest_keeper: { body:"#65758b",trim:"#dec091",dark:"#38445b",glow:"#8cb2e0" },
  gatekeeper: { body:"#566b61",trim:"#d2bb92",dark:"#2f423c",glow:"#d5ceaa" },
  settler: { body:"#8c7961",trim:"#c7ac88",dark:"#514637",glow:"#dbbd91" },
  ashfang_wolf: { body:"#626c74",trim:"#b2a89c",dark:"#2e343e",glow:"#e85349" },
  mossling: { body:"#4d865d",trim:"#c1da80",dark:"#305543",glow:"#cced8a" },
  sewer_rat: { body:"#7a6d6c",trim:"#c0a39f",dark:"#47383c",glow:"#e9969c" },
  ironthorn_boar: { body:"#77796e",trim:"#c5ac81",dark:"#43473f",glow:"#ec9562" },
  blightcap_mushroom: { body:"#8b6a81",trim:"#d0a3a9",dark:"#50405c",glow:"#f5bd9b" },
  hollow_scarecrow: { body:"#867252",trim:"#d0ab6c",dark:"#494331",glow:"#e8a452" },
  giant_mire_crab: { body:"#4e8080",trim:"#a1c4a8",dark:"#2b505a",glow:"#95dbe0" },
  ash_bat: { body:"#5b596f",trim:"#a295a4",dark:"#302f43",glow:"#f094aa" },
  stone_husk: { body:"#79817d",trim:"#b3afa0",dark:"#45544e",glow:"#9de3ac" },
  hollow_raider: { body:"#78605e",trim:"#c9ad8e",dark:"#3a333a",glow:"#ec6953" },
  field_boss: { body:"#4d605c",trim:"#c5b589",dark:"#303c38",glow:"#e68b4b" }
};

const cache = new Map<string, string>();
const E = (c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string) => {
  c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
};
const P = (c:CanvasRenderingContext2D,points:number[],color:string) => {
  c.fillStyle=color;c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
  c.closePath();c.fill();
};
const S = (c:CanvasRenderingContext2D,points:number[],color:string,width:number) => {
  c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.lineJoin="round";
  c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
  c.stroke();
};
function shaded(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,highlight:string):void{
  const g=c.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,highlight);g.addColorStop(.42,color);g.addColorStop(1,"#20232e");
  c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}
function humanoid(c:CanvasRenderingContext2D,key:string,p:Palette,facing:SmoothFacing,step:number):void{
  const side=facing===1?-1:facing===2?1:0;
  const back=facing===3;
  const walk=step===0?-5:step===2?5:0;
  const coat=key==="arcanist"||key==="mender"||key==="shade"||key==="healer";
  const armored=key==="vanguard"||key==="novice"||key==="trainer"||key==="gatekeeper"||key==="blacksmith";
  // A fixed foot anchor at y=102; short walk stride never shifts pivot.
  S(c,[39,72,36-walk,88,35-walk,98],p.dark,10);
  S(c,[56,72,59+walk,88,61+walk,98],p.dark,10);
  E(c,35-walk,98,10,4,"#151b27");E(c,61+walk,98,10,4,"#151b27");
  P(c,[30,57,66,57,73,90,57,96,48,87,38,96,23,90],p.dark);
  if(coat){
    P(c,[31,55,67,57,77,96,61,91,51,82,37,97,21,92],p.body);
    S(c,[46,68,46,88],p.trim,2);
  }
  if(key==="shade"||key==="ranger")P(c,[29,49,62,49,77,94,44,84,22,94],p.dark);
  S(c,[31,53,23+walk*.3,65,20+walk*.3,75],p.dark,13);
  S(c,[64,53,75-walk*.3,65,75-walk*.3,77],p.dark,13);
  E(c,20+walk*.3,76,7,8,p.trim);E(c,75-walk*.3,78,7,8,p.trim);
  shaded(c,48,59,21,24,p.body,p.trim);
  P(c,[29,47,40,44,48,51,56,44,68,47,64,55,33,55],p.trim);
  if(armored){
    E(c,29,51,10,9,p.trim);E(c,67,51,10,9,p.trim);
    S(c,[37,55,57,71],p.dark,4);
    E(c,47,67,6,6,p.trim);
  }
  S(c,[37,76,60,76],p.dark,5);E(c,48,75,7,3,p.trim);
  E(c,47+side*3,33,16,19,back?p.dark:"#cda38c");
  if(back){
    P(c,[30,30,37,16,49,12,60,20,64,34,57,44,34,43],p.dark);
    S(c,[30,31,35,20,45,16,55,19,62,33],p.trim,3);
  }else{
    P(c,[31,31,36,17,46,15,54,16,62,23,64,33,55,28,45,28,36,34],p.dark);
    S(c,[33,27,40,17,51,17,62,25],p.trim,2);
    E(c,42+side*4,35,2.6,2,p.dark);E(c,53+side*4,35,2.6,2,p.dark);
    S(c,[46+side*3,43,52+side*3,43],p.dark,1.5);
  }
  if(key==="arcanist"||key==="mender"||key==="healer"||key==="quest_keeper"){
    S(c,[78,80,78,35],p.trim,4);E(c,78,33,7,8,p.glow);
  }else if(key==="ranger"){
    S(c,[76,85,82,58,76,34],p.trim,4);
    S(c,[77,34,87,60,77,85],p.dark,2);
  }else{
    S(c,[76,82,85,44],p.trim,4);
    P(c,[85,43,80,46,91,18,96,12,96,36,87,47],"#dbe0dc");
    S(c,[91,19,88,39],"#788c9d",1);
  }
  if(key==="hollow_raider"){
    E(c,48,35,12,13,"#d4c5ac");E(c,43+side*3,36,3,4,p.glow);E(c,55+side*3,36,3,4,p.glow);
  }
}
function wolf(c:CanvasRenderingContext2D,p:Palette,facing:SmoothFacing,step:number,kind:string):void{
  const rev=facing===1?-1:1;
  const hop=step===1?-4:0;
  c.save();
  if(facing===1){c.translate(96,0);c.scale(-1,1);}
  if(facing===3){c.translate(96,0);c.scale(-1,1);}
  S(c,[31,73,18,62,10,60],p.dark,12);
  S(c,[23,66,12,54,8,45],p.trim,6);
  for(let i=0;i<4;i++){
    const lx=i<2?31:65;
    const yy=i%2?93+hop:92-hop;
    S(c,[lx+(i%2)*5,75,lx+(i%2)*7,yy],p.dark,9);
    E(c,lx+(i%2)*7,yy,6,5,p.trim);
  }
  shaded(c,43,65,32,20,p.body,p.trim);
  P(c,[19,54,28,38,38,48,51,36,65,47,77,53,64,61,31,60],p.trim);
  shaded(c,72,53,19,17,p.body,p.trim);
  P(c,[61,43,63,24,74,40,81,22,86,43],p.dark);
  P(c,[74,53,92,51,93,62,76,67],p.trim);
  E(c,82,48,3.6,3.8,p.glow);
  S(c,[83,65,93,67],p.dark,2.4);
  if(kind==="ironthorn_boar"){
    E(c,80,58,13,10,p.dark);P(c,[80,60,90,59,85,72],p.trim);
    for(let i=0;i<3;i++)P(c,[27+i*16,50,32+i*16,33,38+i*16,51],p.dark);
  }else if(kind==="sewer_rat"){
    S(c,[15,66,5,78,7,89],p.glow,3);
    E(c,63,39,10,10,p.trim);
  }else{
    for(let i=0;i<3;i++)P(c,[30+i*13,51,33+i*13,39,39+i*13,51],p.dark);
  }
  c.restore();void rev;
}
function fantasyCreature(c:CanvasRenderingContext2D,key:string,p:Palette,facing:SmoothFacing,step:number):void{
  if(["ashfang_wolf","sewer_rat","ironthorn_boar"].includes(key)){wolf(c,p,facing,step,key);return;}
  if(key==="hollow_raider"||key==="hollow_scarecrow"){humanoid(c,key,p,facing,step);return;}
  const wobble=step===1?-4:step===2?2:0;
  if(key==="giant_mire_crab"){
    S(c,[29,73,10,91],p.dark,9);S(c,[68,73,86,91],p.dark,9);
    E(c,48,67+wobble,30,22,p.body);
    E(c,48,59+wobble,24,13,p.trim);
    E(c,35,57+wobble,4,4,p.glow);E(c,61,57+wobble,4,4,p.glow);
    E(c,10,77,13,14,p.trim);E(c,86,77,13,14,p.trim);
  }else if(key==="ash_bat"){
    P(c,[45,55,21,42,4,35,9,66,26,76,43,66],p.dark);
    P(c,[51,55,75,42,93,35,87,66,70,76,53,66],p.body);
    E(c,48,59+wobble,15,17,p.body);
    P(c,[37,51,35,30,46,45,56,30,59,52],p.trim);
    E(c,42,57,3,3,p.glow);E(c,54,57,3,3,p.glow);
  }else if(key==="blightcap_mushroom"){
    S(c,[46,72,42,98],p.dark,16);
    shaded(c,48,61+wobble,20,25,p.body,p.trim);
    E(c,48,48+wobble,35,18,p.trim);
    P(c,[16,49,22,25,37,18,52,19,72,25,81,49],p.body);
    for(const [x,y] of [[30,32],[55,29],[66,42]])E(c,x,y+wobble,5,3,p.trim);
    E(c,42,64+wobble,3,3,p.glow);E(c,55,64+wobble,3,3,p.glow);
  }else if(key==="mossling"){
    S(c,[37,78,33,99],p.dark,9);S(c,[58,78,63,99],p.dark,9);
    shaded(c,48,65+wobble,27,27,p.body,p.trim);
    P(c,[23,54,17,30,36,45,47,26,59,44,76,29,72,56],p.trim);
    E(c,39,69+wobble,4,4,p.glow);E(c,58,69+wobble,4,4,p.glow);
  }else{
    const boss=key==="field_boss";
    const radius=boss?31:25;
    S(c,[36,79,31,99],p.dark,boss?15:12);S(c,[61,79,66,99],p.dark,boss?15:12);
    S(c,[26,60,13,77],p.dark,boss?17:13);S(c,[70,60,84,76],p.dark,boss?17:13);
    shaded(c,48,66+wobble,radius,31,p.body,p.trim);
    shaded(c,48,37+wobble,20,19,p.body,p.trim);
    E(c,39,37+wobble,4,3,p.glow);E(c,57,37+wobble,4,3,p.glow);
    for(let i=0;i<3;i++)P(c,[27+i*16,50,30+i*16,35,36+i*16,49],p.dark);
  }
}
function paint(c:CanvasRenderingContext2D,id:string,frame:number,facing:SmoothFacing,action:SmoothAction):void{
  const key=id.replace(/^(hero|monster|npc)-/,"");
  const role=id.startsWith("monster-")?"monster":"hero";
  const p=palettes[key]??palettes[role==="monster"?"ashfang_wolf":"novice"];
  const w=SMOOTH_FRAME.width,h=SMOOTH_FRAME.height;
  const offset=smoothActionOffset(action);
  const phase=frame/2;
  c.save();
  c.translate((offset+frame)*w,facing*h);
  // Ground contact remains anchored across every facing and every action.
  E(c,48,104,27,5,"#07131a55");
  if(action==="death"){
    // A collapse has a distinct horizontal silhouette; not a reused idle pose.
    c.translate(48,92+frame*3);c.rotate((frame+1)*.35);c.scale(1,1-(frame+1)*.17);c.translate(-48,-92);
  } else if(action==="hit"){
    c.translate((frame%2===0?-5:4),frame===1?3:0);
  } else if(action==="rest"){
    c.translate(0,18);c.scale(1,.76);
  } else if(action==="attack"){
    c.translate(frame===1?10:0,frame===1?-5:0);
    c.rotate((frame-1)*.045);
  } else if(action==="run"){
    c.translate((frame-1)*7,frame===1?-7:0);
    c.rotate((frame-1)*.055);
  } else if(action==="walk"){
    c.translate((frame-1)*2,frame===1?-3:0);
  } else if(action==="idle"){
    c.translate(0,frame===1?-1:0);
  } else if(action==="cast"){
    c.translate(0,frame===1?-3:0);
  }
  if(role==="monster") fantasyCreature(c,key,p,facing,frame);
  else humanoid(c,key,p,facing,frame);

  // Purpose-drawn FX and action silhouettes; idle/walk frames are never
  // recycled as attack/cast/hit poses.
  if(action==="attack"){
    const angle=-1.3+phase*2.1;
    const cx=role==="monster"?72:76,cy=role==="monster"?65:61;
    c.strokeStyle=frame===1?"#fff4b8":"#edc178";
    c.lineWidth=frame===1?6:4;c.lineCap="round";
    c.beginPath();c.arc(cx,cy,23,angle,angle+.8);c.stroke();
    S(c,[cx-8,cy+12,cx+Math.cos(angle)*27,cy+Math.sin(angle)*27],p.trim,5);
  }
  if(action==="cast"){
    const x=48+(facing===1?-14:facing===2?14:0);
    const size=6+frame*4;
    E(c,x,25-frame*3,size,size,p.glow);
    c.strokeStyle=p.trim;c.lineWidth=2;c.beginPath();
    c.arc(x,25-frame*3,size+6,frame,frame+Math.PI*1.4);c.stroke();
  }
  if(action==="hit"){
    c.globalAlpha=frame===1?.7:.35;
    E(c,48,56,25+frame*4,30,p.glow);
    c.globalAlpha=1;
  }
  if(action==="death" && frame===2){
    S(c,[18,91,72,91],"#16242b",6);
  }
  if(action==="rest"){
    E(c,48,93,25,5,p.trim);
  }
  if(action==="emote"){
    const x=frame===0?70:frame===1?79:68;
    S(c,[64,62,x,frame===1?16:28],p.trim,9);
    E(c,x,frame===1?16:28,7,7,p.glow);
    E(c,49,15-frame*3,4+frame,4+frame,p.glow);
  }
  c.restore();
}
export function smoothFantasySheetDataUrl(id:string,_role:SmoothRole="hero"):string{
  if(typeof document==="undefined")throw new Error("Canvas requires a browser");
  // The id prefix determines character family; _role is kept for compatibility.
  const key=id.startsWith("hero-")||id.startsWith("monster-")||id.startsWith("npc-")?id:
    (_role==="monster"?"monster-":"hero-")+id;
  const hit=cache.get(key);if(hit)return hit;
  const canvas=document.createElement("canvas");
  canvas.width=SMOOTH_FRAME.width*SMOOTH_FRAME.columns;
  canvas.height=SMOOTH_FRAME.height*SMOOTH_FRAME.rows;
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled=true;
  for(let facing=0;facing<4;facing++)
    for(const action of SMOOTH_ACTIONS)
      for(let frame=0;frame<SMOOTH_FRAMES_PER_ACTION;frame++)
        paint(ctx,key,frame,facing as SmoothFacing,action);
  const url=canvas.toDataURL("image/png");
  cache.set(key,url);
  return url;
}
