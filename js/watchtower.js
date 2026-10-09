const WATCHTOWER_ENDPOINT="/watchtower-track";
const WATCHTOWER_KEY="watchtower_visitor_id";
const WATCHTOWER_ID=(()=>{try{let id=localStorage.getItem(WATCHTOWER_KEY);if(!id){id=crypto.randomUUID?crypto.randomUUID():"v-"+Math.random().toString(36).slice(2)+Date.now();localStorage.setItem(WATCHTOWER_KEY,id)}return id}catch{return"anonymous"}})();

function watchtowerDevice(){
 const ua=navigator.userAgent||"";
 const platform=navigator.userAgentData?.platform||navigator.platform||"Unknown";
 const mobile=/Mobi|Android|iPhone|iPod/i.test(ua);
 const tablet=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
 let browser="Unknown";
 if(/Edg\//i.test(ua))browser="Edge"; else if(/OPR\//i.test(ua))browser="Opera"; else if(/Chrome\//i.test(ua))browser="Chrome"; else if(/Firefox\//i.test(ua))browser="Firefox"; else if(/Safari\//i.test(ua)&&!/Chrome\//i.test(ua))browser="Safari";
 return {deviceType:tablet?"Tablet":mobile?"Mobile":"Desktop",browser,platform,screenWidth:screen.width,screenHeight:screen.height,viewportWidth:innerWidth,viewportHeight:innerHeight,touchPoints:navigator.maxTouchPoints||0};
}

let WATCHTOWER_BATTERY;
async function watchtowerBattery(){
 if(WATCHTOWER_BATTERY!==undefined)return WATCHTOWER_BATTERY;
 try{if(!navigator.getBattery){WATCHTOWER_BATTERY=null;return null}const b=await navigator.getBattery();WATCHTOWER_BATTERY={available:true,percentage:Math.round(b.level*100),charging:!!b.charging};return WATCHTOWER_BATTERY}catch{WATCHTOWER_BATTERY=null;return null}
}

window.watchtower=async(event,data={})=>{try{const battery=await watchtowerBattery();const payload=JSON.stringify({event,visitorId:WATCHTOWER_ID,path:location.pathname,page:document.title,data:{...watchtowerDevice(),battery,...data}});if(navigator.sendBeacon)navigator.sendBeacon(WATCHTOWER_ENDPOINT,new Blob([payload],{type:"application/json"}));else fetch(WATCHTOWER_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:payload,keepalive:true}).catch(()=>{});}catch{}};

window.watchtower("page_view");

// Send presence heartbeats while this tab is visible so WATCHTOWER can
// show current online sessions and the page they are viewing.
const WATCHTOWER_HEARTBEAT_MS = 30000;
let watchtowerHeartbeatTimer = null;
function watchtowerHeartbeat() {
  if (document.visibilityState === "visible") window.watchtower("heartbeat");
}
function watchtowerStartHeartbeat() {
  if (watchtowerHeartbeatTimer) clearInterval(watchtowerHeartbeatTimer);
  watchtowerHeartbeatTimer = setInterval(watchtowerHeartbeat, WATCHTOWER_HEARTBEAT_MS);
  watchtowerHeartbeat();
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") watchtowerStartHeartbeat();
});
window.addEventListener("pagehide", () => window.watchtower("page_exit"));
watchtowerStartHeartbeat();

/* Project Henry optional app capabilities: permissions are user-triggered. */
(function(){
if(window.__phCapabilities)return;window.__phCapabilities=true;
if("serviceWorker"in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}),{once:true});
const css=document.createElement("style");css.textContent="#ph-cap-btn{position:fixed;z-index:9998;left:12px;bottom:12px;border:1px solid #52e8ff88;border-radius:22px;padding:10px 13px;background:#071126f2;color:#fff;font:600 12px system-ui;box-shadow:0 4px 22px #0008;cursor:pointer}#ph-cap-panel{position:fixed;z-index:9999;left:12px;bottom:58px;width:min(340px,calc(100vw - 24px));max-height:75vh;overflow:auto;padding:16px;border:1px solid #52e8ff66;border-radius:16px;background:#071126f7;color:#fff;font:13px/1.45 system-ui;box-shadow:0 12px 44px #000b}#ph-cap-panel[hidden]{display:none}#ph-cap-panel h2{font-size:16px;margin:0 0 6px}#ph-cap-panel p,#ph-cap-panel small{color:#b5c4de}#ph-cap-panel .ph-row{padding:10px 0;border-top:1px solid #ffffff20}#ph-cap-panel button{border:1px solid #52e8ff66;border-radius:8px;padding:7px 10px;background:#52e8ff12;color:#fff;font:600 12px system-ui;cursor:pointer}#ph-cap-panel small{display:block;margin:4px 0 8px}#ph-cap-panel .ph-status{margin-left:7px;color:#8ce9bd;font-size:11px}";document.head.appendChild(css);
const launch=document.createElement("button");launch.id="ph-cap-btn";launch.type="button";launch.textContent="⚙ App settings";
launch.style.touchAction="none";launch.style.userSelect="none";launch.style.webkitUserSelect="none";
const phStatusTrigger=document.getElementById("statusTrigger");
function phPlaceSettingsBesideStatus(){
 if(!phStatusTrigger||launch.dataset.userMoved==="1")return;
 const r=phStatusTrigger.getBoundingClientRect(),w=launch.offsetWidth||130,h=launch.offsetHeight||38;
 let left=r.right+8,top=r.top;
 if(left+w>innerWidth-6)left=Math.max(6,innerWidth-w-6);
 if(top+h>innerHeight-6)top=Math.max(6,innerHeight-h-6);
 launch.style.left=Math.max(6,left)+"px";launch.style.top=Math.max(6,top)+"px";launch.style.right="auto";launch.style.bottom="auto";
}
if(phStatusTrigger){phPlaceSettingsBesideStatus();addEventListener("resize",phPlaceSettingsBesideStatus)}
else{try{const saved=JSON.parse(localStorage.getItem("ph-cap-position")||"null");if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){launch.style.left=Math.max(0,Math.min(innerWidth-80,saved.x))+"px";launch.style.top=Math.max(0,Math.min(innerHeight-48,saved.y))+"px";launch.style.right="auto";launch.style.bottom="auto"}}catch{}}
let phDrag=null;
launch.addEventListener("pointerdown",e=>{if(e.button!==0&&e.pointerType!=="touch")return;phDrag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:launch.getBoundingClientRect().left,top:launch.getBoundingClientRect().top,moved:false};launch.setPointerCapture?.(e.pointerId)});
launch.addEventListener("pointermove",e=>{if(!phDrag||phDrag.id!==e.pointerId)return;const dx=e.clientX-phDrag.startX,dy=e.clientY-phDrag.startY;if(!phDrag.moved&&Math.hypot(dx,dy)<6)return;phDrag.moved=true;launch.style.left=Math.max(0,Math.min(innerWidth-launch.offsetWidth,phDrag.left+dx))+"px";launch.style.top=Math.max(0,Math.min(innerHeight-launch.offsetHeight,phDrag.top+dy))+"px";launch.style.right="auto";launch.style.bottom="auto"});
launch.addEventListener("pointerup",e=>{if(!phDrag||phDrag.id!==e.pointerId)return;const moved=phDrag.moved;if(moved){launch.dataset.userMoved="1";try{const r=launch.getBoundingClientRect();localStorage.setItem("ph-cap-position",JSON.stringify({x:r.left,y:r.top}))}catch{};launch.dataset.dragged="1";setTimeout(()=>delete launch.dataset.dragged,250)}phDrag=null});
launch.addEventListener("pointercancel",()=>{phDrag=null});

const panel=document.createElement("section");panel.id="ph-cap-panel";panel.hidden=true;panel.innerHTML='<h2>Make Project Henry yours <button id="ph-cap-close" style="float:right">×</button></h2><p>Optional features. You can use the app without enabling them.</p><div class="ph-row"><b>📍 Location</b><small>With your permission, your city and country are shared with WATCHTOWER. GPS coordinates are sent to OpenStreetMap only to resolve the place name; they are not sent to WATCHTOWER.</small><button id="ph-cap-location">Enable location</button><span class="ph-status" id="ph-cap-loc-status"></span></div><div class="ph-row"><b>🔔 Notifications</b><small>Allow browser notifications on supported devices. Permission alone does not enable remote push alerts.</small><button id="ph-cap-notify">Enable notifications</button><span class="ph-status" id="ph-cap-not-status"></span></div><div class="ph-row"><b>📦 Offline & storage</b><small>Project Henry can cache core files for faster loading and limited offline access. No broad storage permission is needed.</small><button id="ph-cap-offline">Check offline support</button><span class="ph-status" id="ph-cap-off-status"></span></div><div class="ph-row"><b>↗ Share & downloads</b><small>Use your device share sheet when supported; file access is requested only when you choose a file.</small><button id="ph-cap-share">Test share support</button><span class="ph-status" id="ph-cap-share-status"></span></div><small>You can change permissions in your browser or device settings at any time.</small>';
document.body.append(launch,panel);
let phCloseTimer=null;
const open=()=>{if(phCloseTimer)clearTimeout(phCloseTimer);panel.hidden=false;launch.setAttribute("aria-expanded","true")};
const close=()=>{if(phCloseTimer)clearTimeout(phCloseTimer);panel.hidden=true;launch.setAttribute("aria-expanded","false");try{localStorage.setItem("ph-cap-dismissed","1")}catch{}};
const closeSoon=(ms=2600)=>{if(phCloseTimer)clearTimeout(phCloseTimer);phCloseTimer=setTimeout(()=>{if(!panel.hidden)close()},ms)};
launch.onclick=()=>{if(launch.dataset.dragged==="1")return;panel.hidden?open():close()};panel.querySelector("#ph-cap-close").onclick=close;
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden)close()});
document.addEventListener("pointerdown",e=>{if(!panel.hidden&&!panel.contains(e.target)&&e.target!==launch)close()});
const status=(id,msg)=>document.getElementById(id).textContent=msg;
document.getElementById("ph-cap-location").onclick=async()=>{
if(!navigator.geolocation){status("ph-cap-loc-status","Location is not supported here.");closeSoon(4200);return}
try{
 if(navigator.permissions&&navigator.permissions.query){
  const permission=await navigator.permissions.query({name:"geolocation"});
  if(permission.state==="denied"){
   status("ph-cap-loc-status","Blocked by device/browser. Allow Location in this app/site's permissions, then retry.");
   closeSoon(6500);return;
  }
 }
}catch{}
status("ph-cap-loc-status","Waiting for your permission…");
navigator.geolocation.getCurrentPosition(async p=>{
try{
const u="https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat="+encodeURIComponent(p.coords.latitude)+"&lon="+encodeURIComponent(p.coords.longitude);
const r=await fetch(u,{headers:{Accept:"application/json"}});if(!r.ok)throw Error();
const a=(await r.json()).address||{};const city=String(a.city||a.town||a.village||a.municipality||a.county||a.state||"").slice(0,100);const country=String(a.country||"").slice(0,80);
if(!city&&!country)throw Error();
if(typeof window.watchtower==="function")window.watchtower("feature_open",{feature:"location_permission",locationCity:city||"Unknown",locationCountry:country||"Unknown",locationSource:"device_permission"});
status("ph-cap-loc-status",[city,country].filter(Boolean).join(", ")+" shared");closeSoon(1800);
}catch{status("ph-cap-loc-status","Location allowed, but place lookup failed. Try again.");closeSoon(4200)}
},e=>{
status("ph-cap-loc-status",e.code===1?"Permission denied. Allow Location in app/site settings, then retry.":"Location unavailable. Check device location and retry.");
closeSoon(e.code===1?6500:4200)
},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
};
document.getElementById("ph-cap-notify").onclick=async()=>{
if(!("Notification"in window)){status("ph-cap-not-status","Not supported here");return}
try{const p=await Notification.requestPermission();status("ph-cap-not-status",p==="granted"?"Permission enabled":p==="denied"?"Blocked in browser settings":"Not enabled");if(p==="granted")closeSoon(1800);else closeSoon(4200)}catch{status("ph-cap-not-status","Unavailable")}
};
document.getElementById("ph-cap-offline").onclick=async()=>{
if(!("serviceWorker"in navigator)){status("ph-cap-off-status","Not supported");return}
try{await navigator.serviceWorker.register("/sw.js");await navigator.serviceWorker.ready;status("ph-cap-off-status","Offline cache ready");closeSoon(1800)}catch{status("ph-cap-off-status","Could not start cache")}
};
document.getElementById("ph-cap-share").onclick=async()=>{
if(navigator.share){try{await navigator.share({title:document.title,text:"Check out Project Henry",url:location.href});status("ph-cap-share-status","Share sheet opened");closeSoon(1800)}catch(e){status("ph-cap-share-status",e.name==="AbortError"?"Share cancelled":"Unavailable")}}
else{try{await navigator.clipboard.writeText(location.href);status("ph-cap-share-status","Link copied");closeSoon(1800)}catch{status("ph-cap-share-status","Use browser Share menu")}}
};
try{if(!localStorage.getItem("ph-cap-dismissed"))setTimeout(()=>{if(!document.hidden)open()},2200)}catch{}
})();
