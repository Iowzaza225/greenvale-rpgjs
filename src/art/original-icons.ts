/** Original procedural Greenvale pixel icons — no third-party icons or CDN. */
type IconKind="active"|"passive"|"buff"|"debuff"|"toggle"|"item";
const cache=new Map<string,string>();
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0;}
const pal:Record<IconKind,[string,string,string]>={
 active:["#344f49","#e7bd79","#a9d4c5"],
 passive:["#41445d","#c3b2e6","#e3d1a2"],
 buff:["#2a5c55","#b2ecd2","#d9cb87"],
 debuff:["#654148","#e6a69a","#eac18d"],
 toggle:["#5b5136","#f2db98","#a3c0a7"],
 item:["#4d5946","#e3cd94","#b8d7ae"],
};
export function originalIconDataUrl(id:string,kind:IconKind="active"):string{
 const key=kind+":"+id;const cached=cache.get(key);if(cached)return cached;
 const n=hash(id),c=pal[kind],canvas=document.createElement("canvas");canvas.width=32;canvas.height=32;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas 2D unavailable");
 ctx.imageSmoothingEnabled=false;
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 rect(0,0,32,32,"#111c1b");rect(2,2,28,28,c[0]);rect(3,3,26,3,"#d7ca9980");
 rect(5,26,22,3,"#172b2a");rect(7,5,18,20,"#0e242680");
 const shape=n%7;
 if(shape===0){ // orb with rays
   rect(13,11,7,9,c[1]);rect(10,14,13,4,c[1]);rect(15,7,3,5,c[2]);rect(15,20,3,5,c[2]);rect(6,16,5,3,c[2]);rect(22,16,5,3,c[2]);
 }else if(shape===1){ // split blade
   rect(20,5,4,6,c[2]);rect(17,9,5,9,c[1]);rect(13,16,5,7,c[2]);rect(9,22,8,3,c[1]);rect(8,24,4,4,c[2]);
 }else if(shape===2){ // shield
   rect(10,7,13,5,c[1]);rect(8,11,17,11,c[2]);rect(11,20,11,4,c[1]);rect(14,24,5,3,c[1]);rect(14,13,5,8,c[0]);
 }else if(shape===3){ // crystal
   rect(15,6,5,5,c[2]);rect(11,10,12,13,c[1]);rect(14,23,6,5,c[2]);rect(15,12,4,7,c[0]);
 }else if(shape===4){ // spiral lightning
   rect(18,7,8,4,c[2]);rect(14,10,8,5,c[1]);rect(10,14,8,5,c[2]);rect(14,18,8,5,c[1]);rect(9,22,6,4,c[2]);
 }else if(shape===5){ // leaf
   rect(12,7,9,6,c[2]);rect(8,12,17,9,c[1]);rect(12,19,9,6,c[2]);rect(15,12,3,12,c[0]);
 }else { // crossed runes
   rect(8,9,16,4,c[1]);rect(14,6,5,21,c[2]);rect(7,21,18,3,c[1]);rect(9,12,4,9,c[2]);rect(21,12,4,9,c[2]);
 }
 for(let i=0;i<5;i++){const x=5+(Math.floor(n/(i+3))%22),y=5+(Math.floor(n/(i+11))%21);rect(x,y,2,2,i%2?c[2]:c[1]);}
 const url=canvas.toDataURL("image/png");cache.set(key,url);return url;
}
