import { getSelectedCharacter } from '../core/save';
import { gameEvents } from '../core/event-bus';
import { t } from '../core/i18n';
import items from '../data/items.json';
import { originalIconDataUrl } from '../art/original-icons';
import { raisePanel } from './desktop-layout';
const safe=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function render(kind:'inventory'|'quests'):void {
  const host=document.getElementById(`gv-${kind}`),char=getSelectedCharacter();if(!host||!char)return;
  let content='';
  if(kind==='inventory'){
    const entries=Object.entries(char.lootBag).filter(([,n])=>n>0);
    content=`<p>${safe(t('desktop.bagHelp'))}</p><div class="gv-bag-grid">${entries.length?entries.map(([id,count])=>{
      const item=items.items.find(item=>item.id===id);
      return `<article tabindex="0" title="${safe(item?t(item.descriptionKey):id)}"><img src="${originalIconDataUrl(id,'item')}" alt=""><span>${safe(item?t(item.nameKey):id)}</span><b>×${count}</b></article>`;
    }).join(''):`<p>${safe(t('combat.emptyBag'))}</p>`}</div>`;
  }else{
    content=`<article class="gv-quest-entry"><h3>${safe(t('desktop.firstHunt'))}</h3><p>${safe(char.quest.completed?t('quest.complete'):t('quest.tracker',{kills:char.quest.kills}))}</p><progress max="3" value="${Math.min(3,char.quest.kills)}"></progress><p>${safe(t('desktop.questHelp'))}</p></article>`;
  }
  host.innerHTML=`<section class="gv-utility-window"><header><h2>${safe(t(`desktop.${kind}`))}</h2><button aria-label="${safe(t('desktop.close'))}">×</button></header><main>${content}</main></section>`;
  host.querySelector('header button')?.addEventListener('click',()=>{host.hidden=true;});
}
export function openUtility(kind:'inventory'|'quests'):void {
  render(kind);const host=document.getElementById(`gv-${kind}`);if(host){host.hidden=false;raisePanel(host);}
}
export function initUtilityWindows():void {
  for(const kind of ['inventory','quests'] as const){
    const host=document.createElement('div');host.id=`gv-${kind}`;host.hidden=true;document.body.appendChild(host);
    const button=document.createElement('button');button.id=`gv-${kind}-btn`;button.className='gv-primary';button.type='button';button.textContent=t(`desktop.${kind}`);
    button.addEventListener('click',()=>{const menu=document.getElementById('gv-panel');if(menu)menu.hidden=true;openUtility(kind);});
    document.getElementById('gv-resume')?.before(button);
  }
  document.getElementById('gv-quest')?.addEventListener('click',()=>openUtility('quests'));
  const refresh=()=>{for(const kind of ['inventory','quests'] as const){if(!document.getElementById(`gv-${kind}`)?.hidden)render(kind);const button=document.getElementById(`gv-${kind}-btn`);if(button)button.textContent=t(`desktop.${kind}`);}};
  gameEvents.on('save:changed',refresh);gameEvents.on('i18n:changed',refresh);
}
