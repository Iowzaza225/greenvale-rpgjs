/** Floating desktop windows. Position lives on the stable host, surviving rerenders. */
export const panelIds = ['gv-world-map','gv-character-system','gv-skill-system','gv-combat-system','gv-inventory','gv-quests','gv-panel'];
let layer = 250000;
const positions = new Map<string, {x:number;y:number}>();
export function isPanelVisible(id:string):boolean {
  const el=document.getElementById(id);
  return !!el&&!el.hidden&&getComputedStyle(el).display!=='none';
}
export function raisePanel(host:HTMLElement):void { host.style.zIndex=String(++layer); }
export function closeTopPanel():boolean {
  const nodes=panelIds.map(id=>document.getElementById(id)).filter((el):el is HTMLElement=>!!el&&isPanelVisible(el.id));
  nodes.sort((a,b)=>Number(getComputedStyle(b).zIndex)-Number(getComputedStyle(a).zIndex));
  if(!nodes[0])return false;
  nodes[0].hidden=true;
  return true;
}
function clampPanel(host:HTMLElement):void {
  const sheet=host.firstElementChild as HTMLElement|null;
  if(!sheet)return;
  const pos=positions.get(host.id); if(!pos)return;
  const width=sheet.getBoundingClientRect().width;
  const height=sheet.getBoundingClientRect().height;
  pos.x=Math.max(8,Math.min(innerWidth-width-8,pos.x));
  pos.y=Math.max(8,Math.min(innerHeight-height-110,pos.y));
  host.style.setProperty('--panel-x',`${pos.x}px`);
  host.style.setProperty('--panel-y',`${pos.y}px`);
}
export function initDesktopLayout():void {
  const opened=new Set<string>();
  let drag:{host:HTMLElement;pointer:number;ox:number;oy:number}|null=null;
  for(const [index,id] of panelIds.entries()){
    const host=document.getElementById(id);if(!host)continue;
    host.classList.add('gv-floating-host');
    positions.set(id,{x:24+(index%2)*Math.max(320,innerWidth/2),y:100+(index%3)*22});
    const observer=new MutationObserver(records=>{
      if(records.some(r=>r.attributeName==='hidden')&&!host.hidden){
        if(!opened.has(id)&&document.body.dataset.gvDevice==='desktop'){
          const other=panelIds.map(key=>document.getElementById(key)).find(el=>el&&el!==host&&!el.hidden);
          if(other){
            const rect=other.firstElementChild?.getBoundingClientRect();
            positions.set(id,{x:rect&&rect.left<innerWidth/2?innerWidth/2+12:24,y:100});
          }
          opened.add(id);
        }
        raisePanel(host);
      }
      clampPanel(host);
    });
    observer.observe(host,{childList:true,attributes:true,attributeFilter:['hidden']});
    host.addEventListener('pointerdown',event=>{
      if(document.body.dataset.gvDevice!=='desktop')return;
      raisePanel(host);
      const target=event.target as HTMLElement;
      if(event.button!==0||!target.closest('header, #gv-panel-title')||target.closest('button,input,a,select'))return;
      const sheet=host.firstElementChild as HTMLElement;
      const rect=sheet.getBoundingClientRect();
      drag={host,pointer:event.pointerId,ox:event.clientX-rect.left,oy:event.clientY-rect.top};
      host.setPointerCapture(event.pointerId);event.preventDefault();
    });
  }
  window.addEventListener('pointermove',event=>{
    if(!drag||drag.pointer!==event.pointerId)return;
    positions.set(drag.host.id,{x:event.clientX-drag.ox,y:event.clientY-drag.oy});
    clampPanel(drag.host);
  });
  const end=()=>{drag=null;};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('blur',end);
  window.addEventListener('resize',()=>{end();panelIds.forEach(id=>{const el=document.getElementById(id);if(el)clampPanel(el);});});
}
