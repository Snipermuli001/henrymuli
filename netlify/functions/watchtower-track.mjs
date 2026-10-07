import { getStore } from "@netlify/blobs";

const ALLOWED = new Set([
  "page_view","page_exit","cv_download","whatsapp_contact",
  "social_click","feature_open","workplace_click","support_card"
]);

const clean = (value, max = 160) =>
  typeof value === "string" ? value.slice(0, max).replace(/[<>]/g, "") : "";

export default async (request, context) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const event = clean(body.event, 40);
  const visitorId = clean(body.visitorId, 80);
  if (!ALLOWED.has(event) || !visitorId) return new Response("Invalid event", { status: 400 });

  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return new Response("Forbidden", { status: 403 });

  const data = body.data && typeof body.data === "object" ? body.data : {};
  const safeData = {};
  for (const [key, value] of Object.entries(data).slice(0, 8)) {
    safeData[clean(key, 40)] = clean(value, 160);
  }

  const geo = context.geo || {};
  const record = {
    event,
    visitorId,
    path: clean(body.path, 200) || "/",
    page: clean(body.page, 200),
    timestamp: new Date().toISOString(),
    country: clean(geo.country?.name || geo.country?.code, 80),
    city: clean(geo.city, 100),
    region: clean(geo.subdivision?.name || geo.subdivision?.code, 100),
    timezone: clean(geo.timezone, 80),
    data: safeData,
    userAgent: clean(request.headers.get("user-agent"), 300),
    referrer: clean(request.headers.get("referer"), 500)
  };

  const store = getStore("watchtower-events");
  const key = new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomUUID();
  await store.setJSON(key, record);

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};

export const config = { rateLimit: { action: "rate_limit", aggregateBy: "ip", windowSize: 60, windowLimit: 30 } };
