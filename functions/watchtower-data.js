function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "Cache-Control": "no-store" }
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const expected = env.WATCHTOWER_PASSWORD;
  const db = env.WATCHTOWER_DB;
  const auth = request.headers.get("authorization") || "";

  if (!expected || auth !== `Bearer ${expected}`) return unauthorized();
  if (!db) return new Response("WATCHTOWER database is not configured.", { status: 503 });

  const [
    totals,
    pages,
    countries,
    events,
    referrers,
    recent,
    todayVisitors,
    todayViews,
    activeEvents,
    todayDevices
  ] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS events, COUNT(DISTINCT visitor_id) AS uniqueVisitors, SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) AS pageViews FROM watchtower_events`).first(),
    db.prepare(`SELECT path AS name, COUNT(*) AS count FROM watchtower_events WHERE event='page_view' GROUP BY path ORDER BY count DESC LIMIT 20`).all(),
    db.prepare(`SELECT COALESCE(NULLIF(country,''),'Unknown') AS name, COUNT(*) AS count FROM watchtower_events GROUP BY country ORDER BY count DESC LIMIT 20`).all(),
    db.prepare(`SELECT event AS name, COUNT(*) AS count FROM watchtower_events GROUP BY event ORDER BY count DESC LIMIT 20`).all(),
    db.prepare(`SELECT COALESCE(NULLIF(referrer,''),'Direct') AS name, COUNT(*) AS count FROM watchtower_events GROUP BY referrer ORDER BY count DESC LIMIT 20`).all(),
    db.prepare(`SELECT event, visitor_id AS visitorId, path, timestamp, city, country, referrer, data_json FROM watchtower_events ORDER BY id DESC LIMIT 100`).all(),
    db.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM watchtower_events WHERE timestamp >= datetime('now','start of day')`).first(),
    db.prepare(`SELECT COUNT(*) AS count FROM watchtower_events WHERE event='page_view' AND timestamp >= datetime('now','start of day')`).first(),
    db.prepare(`SELECT event, visitor_id AS visitorId, path, page, timestamp, city, country, referrer, data_json FROM watchtower_events WHERE datetime(timestamp) >= datetime('now','-2 minutes') AND event IN ('page_view','heartbeat','page_exit') ORDER BY datetime(timestamp) DESC, id DESC`).all(),
    db.prepare(`SELECT data_json FROM watchtower_events WHERE timestamp >= datetime('now','start of day') ORDER BY id DESC LIMIT 5000`).all()
  ]);

  const pair = rows => (rows?.results || []).map(x => [x.name, Number(x.count || 0)]);
  const latestPresence = new Map();
  for (const row of (activeEvents?.results || [])) {
    if (!latestPresence.has(row.visitorId)) latestPresence.set(row.visitorId, row);
  }
  const activeSessions = [...latestPresence.values()]
    .filter(x => x.event !== "page_exit")
    .map(x => {
      let device = {};
      try { device = x.data_json ? JSON.parse(x.data_json) : {}; } catch {}
      return {
        visitorId: x.visitorId,
        path: x.path || "/",
        page: x.page || x.path || "Unknown page",
        timestamp: x.timestamp,
        city: x.city || "",
        country: x.country || "",
        deviceType: device.deviceType || "Unknown",
        browser: device.browser || "Unknown",
        platform: device.platform || "Unknown"
      };
    })
    .sort((a,b) => b.timestamp.localeCompare(a.timestamp));

  return json({
    generatedAt: new Date().toISOString(),
    totals: {
      events: Number(totals?.events || 0),
      pageViews: Number(totals?.pageViews || 0),
      uniqueVisitors: Number(totals?.uniqueVisitors || 0),
      todayVisitors: Number(todayVisitors?.count || 0),
      todayPageViews: Number(todayViews?.count || 0),
      activeNow: activeSessions.length
    },
    pages: pair(pages),
    countries: pair(countries),
    events: pair(events),
    referrers: pair(referrers),
    todayDevices: (() => {
      const m = new Map();
      for (const row of (todayDevices?.results || [])) {
        try { const d = JSON.parse(row.data_json || "{}"); const v = d.deviceType || "Unknown"; m.set(v,(m.get(v)||0)+1); } catch {}
      }
      const total = [...m.values()].reduce((a,b)=>a+b,0) || 1;
      return [...m.entries()].map(([name,count])=>[name,Math.round(count*100/total)]).sort((a,b)=>b[1]-a[1]);
    })(),
    activeSessions,
    recent: (recent?.results || []).map(x => ({
      event: x.event,
      visitorId: x.visitorId,
      path: x.path,
      page: x.page,
      timestamp: x.timestamp,
      city: x.city,
      country: x.country,
      referrer: x.referrer,
      data: (() => { try { return x.data_json ? JSON.parse(x.data_json) : {}; } catch { return {}; } })()
    }))
  });
}

export function onRequest(context) {
  if (context.request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return onRequestGet(context);
}
