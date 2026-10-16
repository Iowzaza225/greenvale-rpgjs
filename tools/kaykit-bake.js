import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ACTIONS=["walk","idle","run","attack","cast","hit","death","rest","emote"];
const REGEX={
  walk:/walk/i,idle:/idle/i,run:/run/i,
  attack:/attack|melee|slash|swing/i,
  cast:/cast|spell|magic/i,
  hit:/hit|hurt|damage|impact/i,
  death:/death|die/i,
  rest:/rest|sit|sleep/i,
  emote:/wave|cheer|emote|dance|celebrat/i
};
const FALLBACK={cast:"attack",rest:"idle",emote:"idle"};
const WIDTH=96, HEIGHT=112, POSES=3, FACINGS=[0,Math.PI/2,-Math.PI/2,Math.PI];
async function bake(){
  const gltf=await new GLTFLoader().loadAsync("/assets/vendor/kaykit/Knight.glb");
  if(!gltf.animations.length)throw new Error("KayKit GLB has no animation clips");
  console.log("KayKit clips",gltf.animations.map(x=>x.name).join(", "));
  const lookup=new Map();
  for(const action of ACTIONS){
    let clip=gltf.animations.find(c=>REGEX[action].test(c.name));
    if(!clip && FALLBACK[action]) clip=lookup.get(FALLBACK[action]);
    if(!clip)throw new Error("Missing required real action clip: "+action);
    lookup.set(action,clip);
    console.log("mapped",action,"->",clip.name,clip.duration.toFixed(2)+" s");
  }
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:"low-power"});
  renderer.setSize(WIDTH,HEIGHT,false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.28;
  const scene=new THREE.Scene();
  scene.background=null;
  scene.add(new THREE.HemisphereLight(0xd8ecfa,0x596157,3.2));
  const sun=new THREE.DirectionalLight(0xffe8bd,3.2);
  sun.position.set(-3,6,7);
  scene.add(sun);
  const fill=new THREE.DirectionalLight(0xb2c7ff,1.3);fill.position.set(4,2,-3);scene.add(fill);
  const rig=new THREE.Group();
  const model=gltf.scene;
  rig.add(model);
  scene.add(rig);
  const bounds=new THREE.Box3().setFromObject(model);
  const s=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  const h=Math.max(0.5,s.y),width=Math.max(s.x,s.z);
  model.position.x-=center.x;
  model.position.z-=center.z;
  model.position.y-=bounds.min.y;
  const camera=new THREE.PerspectiveCamera(29,WIDTH/HEIGHT,.05,200);
  const distance=Math.max(h*2.45,width*3);
  camera.position.set(distance*.22,h*.95,distance);
  camera.lookAt(0,h*.49,0);
  camera.updateProjectionMatrix();
  const mixer=new THREE.AnimationMixer(model);
  const atlas=document.createElement("canvas");
  atlas.width=WIDTH*ACTIONS.length*POSES;
  atlas.height=HEIGHT*FACINGS.length;
  const ctx=atlas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw new Error("2D canvas unavailable");
  for(let direction=0;direction<FACINGS.length;direction++){
    rig.rotation.y=FACINGS[direction];
    for(let actionIndex=0;actionIndex<ACTIONS.length;actionIndex++){
      const action=ACTIONS[actionIndex], clip=lookup.get(action);
      for(let frame=0;frame<POSES;frame++){
        mixer.stopAllAction();
        mixer.setTime(0);
        const motion=mixer.clipAction(clip);
        motion.enabled=true;
        motion.reset().play();
        mixer.setTime(Math.min(Math.max(clip.duration-.02,.01),clip.duration*((frame+.25)/POSES)));
        model.updateMatrixWorld(true);
        renderer.render(scene,camera);
        const x=(actionIndex*POSES+frame)*WIDTH, y=direction*HEIGHT;
        ctx.clearRect(x,y,WIDTH,HEIGHT);
        ctx.drawImage(renderer.domElement,x,y,WIDTH,HEIGHT);
      }
    }
  }
  const samples=Array.from({length:ACTIONS.length},(_,i)=>{
    const p=ctx.getImageData((i*POSES+1)*WIDTH,0,WIDTH,HEIGHT).data;
    let alpha=0;for(let k=3;k<p.length;k+=4)if(p[k]>20)alpha++;
    return {action:ACTIONS[i],opaque:alpha};
  });
  console.log("atlas validation",JSON.stringify(samples));
  if(samples.some(s=>s.opaque<200))throw Error("KayKit atlas has empty action cells");
  const backgroundAlpha=ctx.getImageData(0,0,1,1).data[3];
  if(backgroundAlpha!==0)throw Error("KayKit atlas transparency mismatch");
  const data=atlas.toDataURL("image/webp",.9);
  if(!data.startsWith("data:image/webp;base64,"))throw Error("Chrome cannot encode WebP");
  window.__KAYKIT_DONE__=data;
  renderer.dispose();
}
bake().catch(e=>{window.__KAYKIT_ERROR__=String(e.stack||e);console.error(e)});
