/* One discrete clock controls position, facing and stride in both directions. */
function chooseZooWalk(random = Math.random) {
  const directions = [[-2,0],[2,0],[-2,-1],[2,-1],[-2,1],[2,1],[0,-2],[0,2]];
  const [dx,dy] = directions[Math.floor(random()*directions.length)];
  return {dx,dy,steps:6+Math.floor(random()*15),interval:220+Math.floor(random()*140),rest:600+Math.floor(random()*2200)};
}

function stepZooWalk(state, bounds) {
  const x=state.x+state.walk.dx, y=state.y+state.walk.dy;
  if(x<bounds.minX || x>bounds.maxX || y<bounds.minY || y>bounds.maxY) {
    state.remaining=0;
    return false;
  }
  state.x=x; state.y=y;
  if(state.walk.dx) state.facing=state.walk.dx>0?-1:1;
  state.stride=1-state.stride;
  state.remaining--;
  return true;
}

function startZooMotion(container) {
  const states=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const positionKey='tabZooMotionPositions';
  let savedPositions={};
  let saveTimer;
  const canStore=typeof chrome!=='undefined' && chrome.storage?.local;
  function clampToBounds(state) {
    const halfW=Math.min(state.button.offsetWidth/2,(container.clientWidth-12)/2);
    const halfH=Math.min(state.button.offsetHeight/2,(container.clientHeight-12)/2);
    const bounds={minX:Math.ceil(6+halfW-46),maxX:Math.floor(container.clientWidth-6-halfW-46),minY:Math.ceil(6+halfH-31),maxY:Math.floor(container.clientHeight-6-halfH-31)};
    state.x=Math.max(bounds.minX,Math.min(bounds.maxX,state.x));
    state.y=Math.max(bounds.minY,Math.min(bounds.maxY,state.y));
    return bounds;
  }
  function persist() {
    if(!canStore) return;
    const next={};
    for(const state of states.values()) next[state.key]={x:state.x,y:state.y,facing:state.facing};
    chrome.storage.local.set({[positionKey]:next});
  }
  function schedulePersist() {
    if(!canStore || saveTimer) return;
    saveTimer=setTimeout(()=>{saveTimer=undefined;persist()},700);
  }
  if(canStore) chrome.storage.local.get(positionKey).then(stored=>{
    savedPositions=stored[positionKey]||{};
    for(const state of states.values()) {
      const saved=savedPositions[state.key];
      if(!saved) continue;
      state.x=saved.x;state.y=saved.y;state.facing=saved.facing||1;
      clampToBounds(state);
      state.el.style.left=`${state.x}px`;state.el.style.top=`${state.y}px`;
      state.sprite.style.transform=`scaleX(${state.facing})`;
    }
  });
  function sync() {
    for(const el of states.keys()) if(!container.contains(el)) states.delete(el);
    for(const el of container.querySelectorAll('.creature:not(.egg):not(.asleep)')) {
      if(states.has(el)) continue;
      const sprite=el.querySelector('.sprite-facing'),button=el.querySelector('button');
      if(!sprite || !button) continue;
      const key=el.getAttribute('data-motion-key');
      const saved=savedPositions[key];
      const state={x:saved?.x??Math.round(el.offsetLeft),y:saved?.y??Math.round(el.offsetTop),facing:saved?.facing||1,stride:0,remaining:0,wait:Math.random()*2000,el,sprite,button,key};
      state.slowdown=Math.max(1,(parseFloat(el.style.getPropertyValue('--roam-speed')) || 12)/12);
      clampToBounds(state);
      el.style.left=`${state.x}px`;el.style.top=`${state.y}px`;
      sprite.style.transform=`scaleX(${state.facing})`;
      states.set(el,state);
    }
  }
  const observer=new MutationObserver(sync);
  observer.observe(container,{childList:true});
  sync();
  const timer=setInterval(()=>{
    if(document.hidden) return;
    for(const state of states.values()) {
      const {el,sprite,button}=state;
      const frozen=reduced.matches || el.matches(':hover,:focus-within,.egg,.asleep') || el.hidden;
      if(frozen) {sprite.style.transform=`scaleX(${state.facing})`;continue;}
      state.wait-=50;
      if(state.wait>0) continue;
      const bounds=clampToBounds(state);
      if(!state.remaining) {
        state.walk=chooseZooWalk(); state.remaining=state.walk.steps;state.stride=0;
      }
      const moved=stepZooWalk(state,bounds);
      el.style.left=`${state.x}px`;el.style.top=`${state.y}px`;
      const bob=moved && state.remaining && el.querySelector('[data-species="elephant"]')===null ? -state.stride:0;
      sprite.style.transform=`translateY(${bob}px) scaleX(${state.facing})`;
      state.wait=state.remaining?state.walk.interval*state.slowdown:state.walk.rest;
      if(moved) schedulePersist();
    }
  },50);
  return ()=>{clearInterval(timer);observer.disconnect();if(saveTimer)clearTimeout(saveTimer);persist();states.clear();};
}

if(typeof document!=='undefined') {
  const habitat=document.querySelector('#creatures');
  if(habitat) {
    const stopZooMotion=startZooMotion(habitat);
    window.addEventListener('pagehide',stopZooMotion,{once:true});
  }
}
