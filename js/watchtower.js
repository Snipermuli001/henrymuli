const WATCHTOWER_ENDPOINT="/watchtower-track";
const WATCHTOWER_KEY="watchtower_visitor_id";
const WATCHTOWER_ID=(()=>{try{let id=localStorage.getItem(WATCHTOWER_KEY);if(!id){id=crypto.randomUUID?crypto.randomUUID():"v-"+Math.random().toString(36).slice(2)+Date.now();localStorage.setItem(WATCHTOWER_KEY,id)}return id}catch{return"anonymous"}})();

window.watchtower=(event,data={})=>{try{
  const payload=JSON.stringify({event,visitorId:WATCHTOWER_ID,path:location.pathname,page:document.title,data});
  if(navigator.sendBeacon) navigator.sendBeacon(WATCHTOWER_ENDPOINT,new Blob([payload],{type:"application/json"}));
  else fetch(WATCHTOWER_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:payload,keepalive:true}).catch(()=>{});
}catch{}};

window.watchtower("page_view");
