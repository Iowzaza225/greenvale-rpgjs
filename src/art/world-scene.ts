import { Graphics } from 'pixi.js';
import { worldGeometry } from '../core/world-geometry';
import maps from '../data/maps.json';
/** Oblique 2.5D: world XY remains authoritative; height only affects drawing.
 * Props share RPGJS's event layer, sorted by ground-foot Y, so entities can pass
 * behind their elevated roof/canopy. Their ground footprint is shared collision.
 */
export function createWorldScene(id:string){
  const map=worldGeometry[id];
  const palette:Record<string,number[]>={
    camp:[0x233b32,0x344e3b,0x706248,0x514839,0x658377],
    plains:[0x4c6541,0x62794c,0x988058,0x5e593c,0x8fa36a],
    grove:[0x1d3c35,0x2e5742,0x595c43,0x283b35,0x6b9875],
    cavern:[0x262e3b,0x35404c,0x505568,0x1c2535,0x7aabb7],
    core:[0x332d36,0x49373f,0x67504d,0x251f2b,0xb2877b],
  };
  const [floor,grass,road,dark,light]=palette[map.biome];
  const ground=new Graphics();ground.label=`${id}:ground`;ground.zIndex=-10000;
  ground.rect(0,0,1600,1000).fill(floor);
  for(let row=0;row<32;row++)for(let col=0;col<50;col++){
    const seed=(row*173+col*79+row*col*13)%97;
    if(seed<42)ground.rect(col*32+seed%11,row*32+seed%9,4+seed%13,2+seed%5).fill({color:grass,alpha:.65});
  }
  // Broad intersecting paths preserve the existing warp and spawn routes.
  ground.rect(0,450,1600,122).fill(dark).rect(0,460,1600,102).fill(road);
  ground.rect(700,0,120,1000).fill(dark).rect(710,0,100,1000).fill(road);
  for(let i=0;i<100;i++)ground.rect((i*71)%1580,466+(i*17)%85,18,3).fill({color:light,alpha:.23});
  // Stepped perimeter gives height cues without changing the camera/input basis.
  for(let i=0;i<50;i++){
    ground.rect(i*32,10,31,22).fill(dark).rect(i*32,10,31,6).fill(light);
    ground.rect(i*32,968,31,22).fill(dark).rect(i*32,968,31,5).fill(light);
  }
  const layers:Graphics[]=[ground];
  for(const p of map.props){
    if(p.kind==='water'){
      ground.rect(p.x,p.y,p.width,p.depth).fill(0x182b37).rect(p.x+8,p.y+8,p.width-16,p.depth-16).fill(0x315f71);
      for(let i=0;i<18;i++)ground.rect(p.x+20+(i*47)%(p.width-50),p.y+20+(i*31)%(p.depth-40),22,2).fill({color:0x91b6b0,alpha:.5});
      continue;
    }
    const {x,y,width:w,depth:d,height:h}=p;
    ground.poly([x,y+d,x+w,y+d,x+w+h*.35,y+d+h*.3,x+h*.35,y+d+h*.3]).fill({color:0x09151c,alpha:.38});
    const prop=new Graphics();prop.label=p.id;prop.zIndex=y+d;
    if(p.kind==='building'){
      const roof=map.biome==='camp'?0x59746a:light;
      prop.rect(x,y-h,w,d+h).fill(0x3a3835);
      prop.poly([x,y-h,x+w,y-h,x+w,y+d-h,x,y+d-h]).fill(roof);
      prop.rect(x,y+d-h,w,h).fill(0x79664f);
      prop.rect(x+w-15,y-h,15,d+h).fill(0x424a42);
      prop.rect(x-8,y-h-9,w+16,9).fill(0xa0ad89);
      prop.rect(x-8,y+d-h-7,w+16,10).fill(0x263f39);
      for(let v=15;v<h;v+=16)prop.rect(x+4,y+d-h+v,w-24,2).fill(0x5b503e);
      for(let u=18;u<w-25;u+=40)prop.rect(x+u,y-h+5,2,d-18).fill({color:0xb1b68d,alpha:.35});
      prop.rect(x+w*.43,y+d-45,30,45).fill(0x252e29).rect(x+w*.43+5,y+d-38,21,38).fill(0xa18456);
      prop.rect(x+22,y+d-h+23,27,26).fill(0x263d3e).rect(x+25,y+d-h+26,21,20).fill(0xc6b873);
    }else if(p.kind==='tree'){
      prop.rect(x+w*.4,y-h*.45,w*.22,d+h*.45).fill(0x66563e);
      prop.poly([x-w*.25,y-h*.25,x+w*.5,y-h,x+w*1.2,y-h*.25,x+w,y+4,x,y+4]).fill(0x183e32);
      prop.poly([x-w*.2,y-h*.5,x+w*.48,y-h-12,x+w*1.15,y-h*.5,x+w*.8,y-h*.24,x+w*.12,y-h*.24]).fill(grass);
      prop.poly([x+w*.12,y-h*.65,x+w*.48,y-h-12,x+w*.7,y-h*.57]).fill(light);
    }else{
      prop.poly([x,y+d,x+w*.2,y-h*.5,x+w*.55,y-h,x+w,y-h*.2,x+w,y+d]).fill(dark);
      prop.poly([x+w*.2,y-h*.5,x+w*.55,y-h,x+w*.55,y+d,x,y+d]).fill(light);
      prop.poly([x+w*.55,y-h,x+w,y-h*.2,x+w,y+d,x+w*.55,y+d]).fill(grass);
      prop.poly([x+w*.24,y-h*.48,x+w*.49,y-h*.85,x+w*.49,y-h*.05]).fill({color:0xdae8ca,alpha:.42});
    }
    layers.push(prop);
  }
  const zone=maps.maps.find(zone=>zone.id===id);
  for(const gate of zone?.warps||[]){
    const portal=new Graphics();portal.label=`warp:${gate.to}`;portal.zIndex=gate.y+18;
    portal.ellipse(gate.x,gate.y+15,30,10).fill({color:0xb9d6b4,alpha:.3});
    portal.rect(gate.x-28,gate.y-65,9,80).fill(light).rect(gate.x+19,gate.y-65,9,80).fill(light);
    portal.rect(gate.x-28,gate.y-70,56,9).fill(0xc8bd8b);
    portal.rect(gate.x-17,gate.y-55,34,64).fill({color:0x86c3b2,alpha:.14});layers.push(portal);
  }
  return {layers,dispose:()=>{for(const layer of layers)if(!layer.destroyed)layer.destroy();}};
}
