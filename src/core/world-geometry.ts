import camp from '../assets/maps/greenvale-camp.json';
import plains from '../assets/maps/training-plains.json';
import grove from '../assets/maps/mutant-grove.json';
import cavern from '../assets/maps/stoneburrow-cavern.json';
import core from '../assets/maps/rotten-core.json';
export const worldGeometry:Record<string,typeof camp> = {
  [camp.id]:camp,[plains.id]:plains,[grove.id]:grove,[cavern.id]:cavern,[core.id]:core,
};
export function worldHitboxes(id:string){
  const map=worldGeometry[id]||camp;
  return [
    {id:'top',x:0,y:0,width:map.width,height:10},
    {id:'bottom',x:0,y:map.height-10,width:map.width,height:10},
    {id:'left',x:0,y:0,width:10,height:map.height},
    {id:'right',x:map.width-10,y:0,width:10,height:map.height},
    ...map.props.filter(p=>p.solid).map(p=>({id:p.id,x:p.x,y:p.y,width:p.width,height:p.depth})),
  ];
}
