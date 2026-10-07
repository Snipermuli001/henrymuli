const GameAudio=(()=>{let ac=null,master=null,enabled=true,volume=.65,engine=null;function init(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=volume;master.connect(ac.destination)}async function wake(){init();if(ac.state==="suspended")await ac.resume()}function tone(f,d=.09,type="sine",g=.045,delay=0,slide=0){if(!enabled)return;wake().then(()=>{const t=ac.currentTime+delay,o=ac.createOscillator(),v=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(g,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(v);v.connect(master);o.start(t);o.stop(t+d+.02)})}function click(){tone(520,.055,"square",.025,0,90)}function hit(){tone(760,.07,"sine",.055,0,180);tone(1080,.12,"triangle",.035,.045,260)}function miss(){tone(150,.11,"sawtooth",.025,0,-55)}function count(n){tone(n===1?880:660,.16,"square",.04)}function go(){tone(520,.09,"square",.04);tone(780,.13,"square",.045,.09,250)}function crash(){tone(110,.35,"sawtooth",.06,0,-70);tone(70,.45,"triangle",.035,.03,-25)}function win(){[523,659,784,1047].forEach((f,i)=>tone(f,.14,"triangle",.045,i*.09))}function lose(){[440,330,220].forEach((f,i)=>tone(f,.16,"sawtooth",.035,i*.12,-40))}function puzzle(){tone(620,.07,"sine",.035);tone(850,.1,"triangle",.03,.05)}function startEngine(){if(!enabled)return;wake().then(()=>{if(engine)return;const o=ac.createOscillator(),v=ac.createGain();o.type="sawtooth";o.frequency.value=72;v.gain.value=.0001;o.connect(v);v.connect(master);o.start();engine={o,v};loop()})}function loop(){if(!engine)return;engine.o.frequency.setTargetAtTime(70+Math.random()*18,ac.currentTime,.08);engine.v.gain.setTargetAtTime(enabled?.018:0,ac.currentTime,.12);setTimeout(loop,100)}function stopEngine(){if(!engine)return;try{engine.v.gain.setTargetAtTime(.0001,ac.currentTime,.06);engine.o.stop(ac.currentTime+.12)}catch(e){}engine=null}function setEnabled(v){enabled=v;if(!enabled)stopEngine();if(master)master.gain.value=enabled?volume:0}function setVolume(v){volume=v;if(master&&enabled)master.gain.value=v}return{wake,click,hit,miss,count,go,crash,win,lose,puzzle,startEngine,stopEngine,setEnabled,setVolume,get enabled(){return enabled}}})();
const soundToggle=document.querySelector("#sound-toggle"),soundVolume=document.querySelector("#sound-volume");if(soundToggle){soundToggle.addEventListener("click",()=>{const on=!GameAudio.enabled;GameAudio.setEnabled(on);soundToggle.textContent=on?"🔊 SOUND ON":"🔇 SOUND OFF";if(on)GameAudio.wake()});soundVolume.addEventListener("input",e=>GameAudio.setVolume(Number(e.target.value)))}

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const tabs=$$(".game-tab"),panels=$$(".game-panel");
tabs.forEach(tab=>tab.addEventListener("click",()=>{GameAudio.click();tabs.forEach(t=>t.classList.remove("active"));panels.forEach(p=>p.classList.remove("active"));tab.classList.add("active");$("#"+tab.dataset.game+"-panel").classList.add("active");}));

(()=>{const c=$("#shooter-canvas"),ctx=c.getContext("2d"),scoreEl=$("#shooter-score"),timeEl=$("#shooter-time"),msg=$("#shooter-message"),start=$("#shooter-start"),restart=$("#shooter-restart");let score=0,time=30,running=false,paused=false,timer,raf,target=null;const rand=(a,b)=>Math.random()*(b-a)+a;
function spawn(){const r=rand(18,30);target={x:rand(r+8,c.width-r-8),y:rand(65,c.height-r-8),r,dx:rand(-70,70),dy:rand(-55,55),pulse:Math.random()*6}}
function draw(t){ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#020711";ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle="rgba(82,232,255,.07)";for(let x=0;x<c.width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()}for(let y=0;y<c.height;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke()}if(target){target.x+=target.dx/60;target.y+=target.dy/60;if(target.x<target.r||target.x>c.width-target.r)target.dx*=-1;if(target.y<target.r+45||target.y>c.height-target.r)target.dy*=-1;ctx.shadowBlur=12+Math.sin(t/120+target.pulse)*4;ctx.shadowColor="#52e8ff";ctx.beginPath();ctx.arc(target.x,target.y,target.r,0,Math.PI*2);ctx.fillStyle="#0a2636";ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(target.x,target.y,target.r*.72,0,Math.PI*2);ctx.strokeStyle="#52e8ff";ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(target.x,target.y,target.r*.22,0,Math.PI*2);ctx.fillStyle="#ff4f9a";ctx.fill()}if(running&&!paused)raf=requestAnimationFrame(draw)}
function end(){running=false;paused=false;clearInterval(timer);cancelAnimationFrame(raf);GameAudio.lose();msg.textContent="SCORE: "+score+" • PLAY AGAIN";msg.classList.remove("hidden");start.textContent="PLAY AGAIN"}
function begin(){GameAudio.wake();paused=false;GameAudio.count(3);setTimeout(()=>GameAudio.count(2),450);setTimeout(()=>GameAudio.count(1),900);setTimeout(()=>GameAudio.go(),1350);score=0;time=30;running=true;scoreEl.textContent=0;timeEl.textContent=30;msg.classList.add("hidden");start.textContent="Ⅱ PAUSE";spawn();clearInterval(timer);timer=setInterval(()=>{time--;timeEl.textContent=time;if(time<=0)end()},1000);cancelAnimationFrame(raf);raf=requestAnimationFrame(draw)}
start.addEventListener("click",()=>{GameAudio.click();if(!running){begin();return}paused=!paused;start.textContent=paused?"▶ RESUME":"Ⅱ PAUSE";if(!paused)raf=requestAnimationFrame(draw)});restart.addEventListener("click",()=>{GameAudio.click();begin()});c.addEventListener("pointerdown",e=>{if(!running||paused||!target)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;if(Math.hypot(x-target.x,y-target.y)<=target.r){GameAudio.hit();score++;scoreEl.textContent=score;spawn()}else GameAudio.miss()});draw(0)})();

(()=>{const c=$("#racing-canvas"),ctx=c.getContext("2d"),scoreEl=$("#racing-score"),highEl=$("#racing-high"),timeEl=$("#racing-time"),msg=$("#racing-message"),start=$("#racing-start"),restart=$("#racing-restart"),left=$("#race-left"),right=$("#race-right");let running=false,paused=false,playerX=180,score=0,time=30,traffic=[],last=0,timer,raf,spawnTimer,keys={};const laneX=l=>115+l*65;let high=Number(localStorage.getItem("henry_racing_high")||0);highEl.textContent=high;
function spawn(){traffic.push({x:laneX(Math.floor(Math.random()*3)),y:-75,w:40,h:68,s:205+Math.random()*110})}
function car(x,y,w,h,color,player=false){ctx.save();ctx.translate(x,y);ctx.shadowBlur=player?22:13;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,10);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=player?"#b9f7ff":"#1a1020";ctx.beginPath();ctx.roundRect(-w*.31,-h*.31,w*.62,h*.25,5);ctx.fill();ctx.beginPath();ctx.roundRect(-w*.31,h*.06,w*.62,h*.22,5);ctx.fill();ctx.fillStyle=player?"#07172b":"#ff6aab";ctx.fillRect(-w*.42,-h*.44,7,5);ctx.fillRect(w*.23,-h*.44,7,5);ctx.fillStyle="#070b15";ctx.fillRect(-w/2-3,-h*.28,5,17);ctx.fillRect(w/2-2,-h*.28,5,17);ctx.fillRect(-w/2-3,h*.12,5,17);ctx.fillRect(w/2-2,h*.12,5,17);ctx.restore()}
function road(){const g=ctx.createLinearGradient(0,0,0,c.height);g.addColorStop(0,"#0a1122");g.addColorStop(1,"#03050d");ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#101a31";ctx.beginPath();ctx.moveTo(78,0);ctx.lineTo(282,0);ctx.lineTo(322,c.height);ctx.lineTo(38,c.height);ctx.closePath();ctx.fill();ctx.strokeStyle="rgba(82,232,255,.3)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(78,0);ctx.lineTo(38,c.height);ctx.moveTo(282,0);ctx.lineTo(322,c.height);ctx.stroke();ctx.strokeStyle="rgba(255,255,255,.24)";ctx.lineWidth=3;ctx.setLineDash([25,24]);ctx.lineDashOffset=-(performance.now()/7%49);[145,215].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()});ctx.setLineDash([]);ctx.fillStyle="rgba(82,232,255,.07)";ctx.fillRect(78,0,204,30)}
function update(dt){if(keys.ArrowLeft||keys.a)playerX-=275*dt;if(keys.ArrowRight||keys.d)playerX+=275*dt;playerX=Math.max(64,Math.min(296,playerX));traffic.forEach(v=>v.y+=v.s*dt);traffic=traffic.filter(v=>v.y<590);for(const v of traffic)if(Math.abs(v.x-playerX)<34&&Math.abs(v.y-450)<52){end();return}}
function draw(){road();traffic.forEach(v=>car(v.x,v.y,v.w,v.h,"#ff4f9a"));car(playerX,450,46,80,"#52e8ff",true);if(running&&!paused){const now=performance.now(),dt=Math.min(.035,(now-last)/1000||0);last=now;update(dt);score++;const current=Math.floor(score/6);scoreEl.textContent=current;if(current>high){high=current;highEl.textContent=high;highEl.classList.add("race-high-beat");setTimeout(()=>highEl.classList.remove("race-high-beat"),550);localStorage.setItem("henry_racing_high",high)}raf=requestAnimationFrame(draw)}}
function end(){running=false;paused=false;clearInterval(timer);clearInterval(spawnTimer);GameAudio.stopEngine();cancelAnimationFrame(raf);GameAudio.crash();const final=Math.floor(score/6);msg.textContent=final>=high&&final>0?"NEW HIGH SCORE!":"RACE OVER • SCORE: "+final;msg.classList.remove("hidden");start.textContent="▶ PLAY AGAIN"}
function begin(){GameAudio.wake();paused=false;GameAudio.startEngine();GameAudio.count(3);setTimeout(()=>GameAudio.count(2),450);setTimeout(()=>GameAudio.count(1),900);setTimeout(()=>GameAudio.go(),1350);running=true;score=0;time=30;playerX=180;traffic=[];scoreEl.textContent=0;timeEl.textContent=30;msg.classList.add("hidden");start.textContent="Ⅱ PAUSE";clearInterval(timer);clearInterval(spawnTimer);timer=setInterval(()=>{time--;timeEl.textContent=time;if(time<=0)end()},1000);spawnTimer=setInterval(()=>{if(running)spawn()},650);last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(draw)}
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="ArrowLeft"||e.key==="ArrowRight")e.preventDefault()});addEventListener("keyup",e=>keys[e.key]=false);const hold=(btn,k)=>{const on=e=>{e.preventDefault();keys[k]=true;try{btn.setPointerCapture(e.pointerId)}catch(_){}},off=e=>{e.preventDefault();keys[k]=false};btn.addEventListener("pointerdown",on);btn.addEventListener("pointerup",off);btn.addEventListener("pointercancel",off);btn.addEventListener("lostpointercapture",off)};hold(left,"ArrowLeft");hold(right,"ArrowRight");start.addEventListener("click",()=>{GameAudio.click();if(!running){begin();return}paused=!paused;start.textContent=paused?"▶ RESUME":"Ⅱ PAUSE";if(paused)GameAudio.stopEngine();else{GameAudio.startEngine();last=performance.now();raf=requestAnimationFrame(draw)}});restart.addEventListener("click",()=>{GameAudio.click();begin()});draw()})();

(()=>{const board=$("#puzzle-board"),movesEl=$("#puzzle-moves"),timeEl=$("#puzzle-time"),start=$("#puzzle-new"),restart=$("#puzzle-restart");let tiles=[],moves=0,time=0,timer,paused=false;
function solved(){return tiles.every((v,i)=>v===(i===15?0:i+1))}
function shuffle(){tiles=[...Array(16)].map((_,i)=>i);let blank=15,prev=-1;for(let i=0;i<350;i++){const opts=[blank-1,blank+1,blank-4,blank+4].filter(n=>n>=0&&n<16&&!(blank%4===0&&n===blank-1)&&!(blank%4===3&&n===blank+1)&&n!==prev);const n=opts[Math.floor(Math.random()*opts.length)];[tiles[blank],tiles[n]]=[tiles[n],tiles[blank]];prev=blank;blank=n}render()}
function render(){board.innerHTML="";tiles.forEach((v,i)=>{const b=document.createElement("button");b.className="puzzle-tile"+(v===0?" empty":"");b.textContent=v||"";b.setAttribute("aria-label",v?"Tile "+v:"Empty space");b.addEventListener("click",()=>move(i));board.appendChild(b)})}
function move(i){const blank=tiles.indexOf(0),sameRow=Math.floor(i/4)===Math.floor(blank/4),near=[blank-1,blank+1,blank-4,blank+4].includes(i)&&((i===blank-1||i===blank+1)?sameRow:true);if(!near)return;[tiles[i],tiles[blank]]=[tiles[blank],tiles[i]];moves++;GameAudio.puzzle();movesEl.textContent=moves;render();if(solved()){clearInterval(timer);GameAudio.win();setTimeout(()=>alert("Solved in "+moves+" moves and "+time+" seconds!"),80)}}
function begin(){clearInterval(timer);paused=false;moves=0;time=0;movesEl.textContent=0;timeEl.textContent=0;start.textContent="Ⅱ PAUSE";shuffle();timer=setInterval(()=>{if(!paused){time++;timeEl.textContent=time}},1000)}
start.addEventListener("click",()=>{GameAudio.click();if(!tiles.length){begin();return}paused=!paused;start.textContent=paused?"▶ RESUME":"Ⅱ PAUSE"});restart.addEventListener("click",()=>{GameAudio.click();begin()});
})();
/* IMMERSIVE MODE */
(()=>{const dialog=$("#mode-dialog"),pc=$("#pc-mode"),mobile=$("#mobile-mode"),exit=$("#game-exit");
let activeMode=null;
const stopCurrentGame=()=>{const id=document.querySelector(".game-panel.active")?.id;
 const btn=id==="shooter-panel"?$("#shooter-start"):id==="racing-panel"?$("#racing-start"):id==="puzzle-panel"?$("#puzzle-new"):null;
 if(btn&&btn.textContent.includes("PAUSE"))btn.click();
};
const gameDialog=$("#game-select-dialog");
const selectGame=game=>{
 tabs.forEach(t=>t.classList.toggle("active",t.dataset.game===game));
 panels.forEach(p=>p.classList.toggle("active",p.id===game+"-panel"));
 gameDialog.hidden=true;
 const starter=game==="shooter"?$("#shooter-start"):game==="racing"?$("#racing-start"):$("#puzzle-new");
 if(starter)starter.click();
};
const enter=async mode=>{
 activeMode=mode;
 document.body.classList.remove("windowed-mode");
 document.body.classList.add("play-mode",mode==="mobile"?"mobile-mode":"pc-mode");
 dialog.hidden=true;
 gameDialog.hidden=false;
 try{
   if(document.documentElement.requestFullscreen){
     await document.documentElement.requestFullscreen({navigationUI:"hide"});
   }
 }catch(e){document.body.classList.add("windowed-mode")}
 if(mode==="pc"&&navigator.keyboard?.lock){
   try{await navigator.keyboard.lock(["ArrowLeft","ArrowRight","KeyA","KeyD","Space"])}catch(e){}
 }
};
const leave=async()=>{
 try{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen()}catch(e){}
 stopCurrentGame();
 document.body.classList.remove("play-mode","pc-mode","mobile-mode","windowed-mode");
 activeMode=null;
 gameDialog.hidden=true;
 dialog.hidden=true;
};
window.__projectHenryLeaveGame=leave;
pc?.addEventListener("click",()=>enter("pc"));
mobile?.addEventListener("click",()=>enter("mobile"));
$(".game-select-choice").forEach(btn=>btn.addEventListener("click",()=>selectGame(btn.dataset.gameSelect)));
exit?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();leave()});
document.addEventListener("fullscreenchange",()=>{
 if(!document.fullscreenElement&&document.body.classList.contains("play-mode"))document.body.classList.add("windowed-mode");
});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&document.body.classList.contains("play-mode")){
   e.preventDefault();
   leave();
 }
});
})();
/* FAIL-SAFE IMMERSIVE UI CONTROLS */
document.addEventListener("click",e=>{
 const gameBtn=e.target.closest?.(".game-select-choice");
 if(gameBtn){e.preventDefault();e.stopPropagation();const game=gameBtn.dataset.gameSelect;tabs.forEach(t=>t.classList.toggle("active",t.dataset.game===game));panels.forEach(p=>p.classList.toggle("active",p.id===game+"-panel"));gameDialog.hidden=true;const starter=game==="shooter"?$("#shooter-start"):game==="racing"?$("#racing-start"):$("#puzzle-new");if(starter)starter.click();return;}
 const exitBtn=e.target.closest?.("#game-exit");
 if(exitBtn&&document.body.classList.contains("play-mode")){e.preventDefault();e.stopPropagation();window.__projectHenryLeaveGame?.();}
},true);

/* MOBILE RACING TOUCH CONTROLS */
(()=>{const left=$("#race-left"),right=$("#race-right");if(!left||!right)return;
const bind=(el,key)=>{const down=e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);window.dispatchEvent(new KeyboardEvent("keydown",{key}));},up=e=>{e.preventDefault();window.dispatchEvent(new KeyboardEvent("keyup",{key}))};
el.addEventListener("pointerdown",down);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);el.addEventListener("lostpointercapture",up)};
bind(left,"ArrowLeft");bind(right,"ArrowRight");
})();

/* PUZZLE KEYBOARD */
(()=>{const board=$("#puzzle-board");if(!board)return;
document.addEventListener("keydown",e=>{if(!document.body.classList.contains("pc-mode"))return;
const active=$("#puzzle-panel")?.classList.contains("active");if(!active)return;
const tiles=[...board.querySelectorAll(".puzzle-tile")],blank=tiles.findIndex(x=>x.classList.contains("empty"));if(blank<0)return;
let target=-1;
if(e.key==="ArrowLeft"&&blank%4>0)target=blank-1;
if(e.key==="ArrowRight"&&blank%4<3)target=blank+1;
if(e.key==="ArrowUp"&&blank>=4)target=blank-4;
if(e.key==="ArrowDown"&&blank<12)target=blank+4;
if(target>=0){e.preventDefault();tiles[target].click()}
})})();
