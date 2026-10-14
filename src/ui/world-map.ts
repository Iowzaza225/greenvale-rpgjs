import mapsData from "../data/maps.json";
import { t } from "../core/i18n";
import "./world-map.css";

let initialized=false;
let currentMapId="greenvale-camp";
const zones=mapsData.maps;
const escapeHtml=(s:unknown)=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const zoneColor=(id:string)=>({
 "greenvale-camp":"#5a8268",
 "training-plains":"#9fa56b",
 "mutant-grove":"#5e8d69",
 "stoneburrow-cavern":"#879da1",
 "rotten-core":"#b67b75",
} as Record<string,string>)[id]||"#aeb2a6";
export function openWorldMap():void{
 const host=document.getElementById("gv-world-map");if(!host)return;
 host.innerHTML=`<section class="gv-world-sheet">
 <header><div><small>GREENVALE · WORLD MAP</small><h2>${escapeHtml(t("world.title"))}</h2></div><button data-world-close aria-label="Close">×</button></header>
 <p>${escapeHtml(t("world.instructions"))}</p>
 <div class="gv-world-grid">
 ${zones.map((zone:any,index)=>`<article class="gv-world-zone ${zone.id===currentMapId?"active":""}" style="--zone-color:${zoneColor(zone.id)}">
 <div class="gv-world-map-preview">
   ${Array.from({length:23},(_,i)=>`<i style="left:${(i*31+index*13)%90+5}%;top:${(i*17+index*23)%80+9}%;width:${2+i%3}%;height:${2+i%4}%"></i>`).join("")}
   <em class="gv-world-path"></em>
   <b>${index+1}</b>
 </div>
 <strong>${escapeHtml(t(zone.nameKey))}</strong>
 <span>${zone.safeZone?escapeHtml(t("world.safe")):`Lv ${zone.levelRange?.[0]||1}–${zone.levelRange?.[1]||10}`}</span>
 <small>${escapeHtml(t("world.warps"))}: ${(zone.warps||[]).map((warp:any)=>escapeHtml(t(zones.find((entry:any)=>entry.id===warp.to)?.nameKey||warp.to))).join(" · ")||"—"}</small>
 ${zone.id===currentMapId?`<mark>${escapeHtml(t("world.youAreHere"))}</mark>`:""}
 </article>`).join("")}
 </div>
 <footer>${escapeHtml(t("world.help"))}</footer>
 </section>`;
 host.querySelector("[data-world-close]")?.addEventListener("click",()=>{host.hidden=true;});
 host.hidden=false;
}
export function initWorldMap():void{
 if(initialized)return;initialized=true;
 document.getElementById("gv-world-btn")?.addEventListener("click",openWorldMap);
 window.addEventListener("greenvale:world-map-open",openWorldMap);
 window.addEventListener("greenvale:map-changed",(event)=>{
   const detail=(event as CustomEvent).detail||{};
   if(zones.some((zone:any)=>zone.id===detail.id)){
     currentMapId=detail.id;
     document.body.dataset.gvMap=currentMapId;
     if(!document.getElementById("gv-world-map")?.hidden)openWorldMap();
   }
 });
 document.body.dataset.gvMap=currentMapId;
}
