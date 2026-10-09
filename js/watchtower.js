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