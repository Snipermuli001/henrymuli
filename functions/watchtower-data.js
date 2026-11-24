function unauthorized() {
  return new Response("Unauthorized", {status:401,headers:{"Cache-Control":"no-store"}});
}
function json(data) {
  return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
export async function onRequestGet(context) {
  const {request,env}=context;
  const expected=env.WATCHTOWER_PASSWORD,db=env.WATCHTOWER_DB;
  const auth=request.headers.get("authorization")||"";
  if(!expected||auth!==`Bearer ${expected}`)return unauthorized();
  if(!db)return new Response("WATCHTOWER database is not configured.",{status:503});

  const todayStart="datetime('now','+3 hours','start of day','-3 hours')";
  const [
    totals,pages,countries,cities,referrers,recent,activeEvents,todayDevices,consentedLocations
  ]=await Promise.all([
    db.prepare(`SELECT COUNT(DISTINCT CASE WHEN event='page_view' THEN visitor_id END) AS uniqueVisitors, SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) AS pageViews FROM watchtower_events`).first(),
    db.prepare(`SELECT path AS name,COUNT(*) AS count FROM watchtower_events WHERE event='page_view' GROUP BY path ORDER BY count DESC LIMIT 20`).all(),
    db.prepare(`WITH ranked AS (
      SELECT visitor_id,COALESCE(NULLIF(json_extract(data_json,'$.locationCountry'),''),NULLIF(country,'')) AS location,
      ROW_NUMBER() OVER(PARTITION BY visitor_id ORDER BY CASE WHEN json_extract(data_json,'$.locationSource')='device_permission' THEN 0 ELSE 1 END,timestamp DESC,id DESC) AS rn
      FROM watchtower_events
      WHERE visitor_id!='anonymous' AND ((country IS NOT NULL AND country!='') OR (json_valid(data_json) AND json_extract(data_json,'$.locationCountry') IS NOT NULL AND json_extract(data_json,'$.locationCountry')!=''))
    ) SELECT COALESCE(NULLIF(location,''),'Unknown') AS name,COUNT(*) AS count FROM ranked WHERE rn=1 GROUP BY location ORDER BY count DESC LIMIT 30`).all(),
    db.prepare(`WITH ranked AS (
      SELECT visitor_id,COALESCE(NULLIF(json_extract(data_json,'$.locationCity'),''),NULLIF(city,'')) AS location,
      ROW_NUMBER() OVER(PARTITION BY visitor_id ORDER BY timestamp DESC,id DESC) AS rn
      FROM watchtower_events
      WHERE visitor_id!='anonymous' AND ((city IS NOT NULL AND city!='') OR (json_valid(data_json) AND json_extract(data_json,'$.locationCity') IS NOT NULL AND json_extract(data_json,'$.locationCity')!=''))
    ) SELECT COALESCE(NULLIF(location,''),'Unknown') AS name,COUNT(*) AS count FROM ranked WHERE rn=1 GROUP BY location ORDER BY count DESC LIMIT 40`).all(),
    db.prepare(`WITH first_visit AS (
      SELECT visitor_id,referrer,ROW_NUMBER() OVER(PARTITION BY visitor_id ORDER BY timestamp ASC,id ASC) AS rn
      FROM watchtower_events WHERE event='page_view' AND visitor_id!='anonymous'
    ) SELECT COALESCE(NULLIF(referrer,''),'Direct') AS name,COUNT(*) AS count FROM first_visit WHERE rn=1 GROUP BY name ORDER BY count DESC LIMIT 20`).all(),
    db.prepare(`SELECT event,visitor_id AS visitorId,path,page,timestamp,city,country,referrer,data_json FROM watchtower_events ORDER BY id DESC LIMIT 100`).all(),
    db.prepare(`SELECT event,visitor_id AS visitorId,path,page,timestamp,city,country,data_json FROM watchtower_events WHERE datetime(timestamp)>=datetime('now','-2 minutes') AND visitor_id!='anonymous' AND event IN ('page_view','heartbeat','page_exit') ORDER BY datetime(timestamp) DESC,id DESC`).all(),
    db.prepare(`WITH today AS (
      SELECT visitor_id,data_json,ROW_NUMBER() OVER(PARTITION BY visitor_id ORDER BY timestamp DESC,id DESC) AS rn
      FROM watchtower_events WHERE timestamp>=${todayStart} AND visitor_id!='anonymous' AND event IN ('page_view','heartbeat')
    ) SELECT COALESCE(NULLIF(json_extract(data_json,'$.deviceType'),''),'Unknown') AS name,COUNT(*) AS count
      FROM today WHERE rn=1 GROUP BY name ORDER BY count DESC`).all(),
    db.prepare(`SELECT visitor_id AS visitorId,data_json FROM watchtower_events
      WHERE event='feature_open' AND datetime(timestamp)>=datetime('now','-365 days')
      AND json_valid(data_json) AND json_extract(data_json,'$.locationSource')='device_permission'
      ORDER BY datetime(timestamp) DESC,id DESC`).all()
  ]);

  const pair=rows=>(rows?.results||[]).map(x=>[x.name,Number(x.count||0)]);
  const latestPresence=new Map();
  for(const row of activeEvents?.results||[])if(!latestPresence.has(row.visitorId))latestPresence.set(row.visitorId,row);
  const consented=new Map();
  for(const row of consentedLocations?.results||[]){
    if(consented.has(row.visitorId))continue;
    try{const d=JSON.parse(row.data_json||"{}");if(d.locationCity||d.locationCountry)consented.set(row.visitorId,{city:d.locationCity||"",country:d.locationCountry||""})}catch{}
  }
  const activeSessions=[...latestPresence.values()].filter(x=>x.event!=="page_exit").map(x=>{
    let d={};try{d=JSON.parse(x.data_json||"{}")}catch{}
    const loc=consented.get(x.visitorId);
    return {visitorId:x.visitorId,path:x.path||"/",page:x.page||x.path||"Unknown page",timestamp:x.timestamp,
      city:loc?.city||x.city||"",country:loc?.country||x.country||"",
      deviceType:d.deviceType||"Unknown",browser:d.browser||"Unknown",platform:d.platform||"Unknown"};
  }).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));

  const todayVisitors=await db.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM watchtower_events WHERE event='page_view' AND visitor_id!='anonymous' AND timestamp>=${todayStart}`).first();
  const todayViews=await db.prepare(`SELECT COUNT(*) AS count FROM watchtower_events WHERE event='page_view' AND timestamp>=${todayStart}`).first();
  const countryDisplay=new Intl.DisplayNames(['en'],{type:'region'});\n  const mergePairs=rows=>{const m=new Map();for(const [name,count] of pair(rows)){let label=name;if(/^[A-Z]{2}$/.test(name)){try{label=countryDisplay.of(name)||name}catch{}}m.set(label,(m.get(label)||0)+count)}return [...m.entries()].sort((a,b)=>b[1]-a[1]);};\n  const visitorReferrers=pair(referrers).map(([name,count])=>{
    let label=name;
    if(name!=="Direct"){try{label=new URL(name).hostname.replace(/^www\./,"")}catch{label=String(name).slice(0,100)}}
    return [label,count];
  });
  const deviceRows=pair(todayDevices);
  const deviceTotal=deviceRows.reduce((sum,row)=>sum+row[1],0)||1;
  return json({
    generatedAt:new Date().toISOString(),timeZone:"Africa/Nairobi",
    totals:{uniqueVisitors:Number(totals?.uniqueVisitors||0),pageViews:Number(totals?.pageViews||0),
      todayVisitors:Number(todayVisitors?.count||0),todayPageViews:Number(todayViews?.count||0),activeNow:activeSessions.length},
    pages:pair(pages),countries:mergePairs(countries),cities:pair(cities),referrers:visitorReferrers,
    todayDevices:deviceRows.map(([name,count])=>[name,Math.round(count*100/deviceTotal)]),
    activeSessions,
    recent:(recent?.results||[]).map(x=>({event:x.event,visitorId:x.visitorId,path:x.path,page:x.page,timestamp:x.timestamp,
      city:x.city,country:x.country,referrer:x.referrer,
      data:(()=>{try{return x.data_json?JSON.parse(x.data_json):{}}catch{return {}}})()}))
  });
}
export function onRequest(context){if(context.request.method!=="GET")return new Response("Method Not Allowed",{status:405});return onRequestGet(context)}
