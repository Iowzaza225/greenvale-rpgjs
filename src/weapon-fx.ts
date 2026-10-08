/** Greenvale cosmetic weapon swing. Does not alter RPGJS damage or combat rules. */
let canvas: HTMLCanvasElement | undefined;
let ctx: CanvasRenderingContext2D | null = null;
let started = 0;
let last = 0;
let raf = 0;
const duration = 260;
function ensure() {
  if (canvas || !document.body) return;
  canvas = document.createElement("canvas");
  canvas.id = "greenvale-weapon-fx";
  Object.assign(canvas.style, {position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"15"});
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
}
function frame(now:number) {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const t = Math.min(1,(now-started)/duration);
  if (t >= 1) { raf=0; return; }
  // Camera tracks the player near the center of the playable canvas.
  const gameCanvas = document.querySelector("#rpg canvas") as HTMLCanvasElement | null;
  const rect = gameCanvas?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) {raf=0;return;}
  const x=rect.left+rect.width*.5, y=rect.top+rect.height*.52;
  const scale=Math.max(.65,Math.min(1.4,rect.width/650));
  const angle=(-2.3+t*2.8);
  ctx.save();
  ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(angle);
  ctx.globalAlpha=Math.min(1,(1-t)*2.2);
  ctx.lineCap="round";
  ctx.strokeStyle="#ffe4a1";ctx.lineWidth=8;
  ctx.beginPath();ctx.arc(0,0,66,-.62,.62);ctx.stroke();
  ctx.strokeStyle="#fdf7dc";ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(0,0,76,-.58,.54);ctx.stroke();
  ctx.fillStyle="#9aa8b7";ctx.fillRect(12,-4,63,8);
  ctx.fillStyle="#eef8ff";ctx.beginPath();ctx.moveTo(75,-4);ctx.lineTo(91,0);ctx.lineTo(75,4);ctx.closePath();ctx.fill();
  ctx.fillStyle="#b98a43";ctx.fillRect(6,-12,8,24);
  ctx.fillStyle="#513929";ctx.fillRect(-12,-3,18,6);
  ctx.restore();
  raf=requestAnimationFrame(frame);
}
export function installWeaponFx() {
  if (typeof document==="undefined") return;
  ensure();
  const swing=()=>{const now=performance.now();if(now-last<135)return;last=now;started=now;if(!raf)raf=requestAnimationFrame(frame);};
  document.addEventListener("keydown",e=>{if(e.repeat)return;if(["KeyA","Space","Enter"].includes(e.code) && !(e.target instanceof HTMLInputElement))swing();},true);
  document.addEventListener("pointerdown",e=>{
    const el=e.target instanceof Element ? e.target.closest("button,[role=button],rpg-mobile-button") : null;
    const label=(el?.getAttribute("aria-label") || el?.textContent || "").trim().toLowerCase();
    if(label==="a" || label==="atk" || label==="attack" || label==="โจมตี")swing();
  },true);
}
