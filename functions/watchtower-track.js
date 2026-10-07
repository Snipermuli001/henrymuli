const ALLOWED = new Set([
  "page_view","page_exit","cv_download","whatsapp_contact",
  "social_click","feature_open","workplace_click","support_card"
]);

const clean = (value, max = 160) =>
  typeof value === "string" ? value.slice(0, max).replace(/[<>]/g, "") : "";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.WATCHTOWER_DB;
  if (!db) return json({ error: "WATCHTOWER database is not configured." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad Request" }, 400);
  }

  const event = clean(body.event, 40);
  const visitorId = clean(body.visitorId, 80);
  if (!ALLOWED.has(event) || !visitorId) return json({ error: "Invalid event" }, 400);

  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ error: "Forbidden" }, 403);

  const data = body.data && typeof body.data === "object" ? body.data : {};
  const safeData = {};
  for (const [key, value] of Object.entries(data).slice(0, 8)) {
    const safeKey = clean(key, 40);
    if (safeKey === "battery" && value && typeof value === "object") {
      safeData.battery = {
        available: !!value.available,
        percentage: Number.isFinite(Number(value.percentage)) ? Math.max(0, Math.min(100, Number(value.percentage))) : null,
        charging: !!value.charging
      };
    } else if (typeof value === "number" || typeof value === "boolean") {
      safeData[safeKey] = value;
    } else {
      safeData[safeKey] = clean(value, 160);
    }
  }

  const cf = request.cf || {};
  const timestamp = new Date().toISOString();
  const path = clean(body.path, 200) || "/";
  const page = clean(body.page, 200);
  const country = clean(cf.country, 80);
  const city = clean(cf.city, 100);
  const region = clean(cf.region || cf.regionCode, 100);
  const timezone = clean(cf.timezone, 80);
  const userAgent = clean(request.headers.get("user-agent"), 300);
  const referrer = clean(request.headers.get("referer"), 500);

  await db.prepare(`
    INSERT INTO watchtower_events
      (event, visitor_id, path, page, timestamp, country, city, region, timezone, user_agent, referrer, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event, visitorId, path, page, timestamp, country, city, region,
    timezone, userAgent, referrer, JSON.stringify(safeData)
  ).run();

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" }
  });
}

export function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return onRequestPost(context);
}
