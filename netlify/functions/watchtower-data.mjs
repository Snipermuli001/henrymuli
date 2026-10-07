import { getStore } from "@netlify/blobs";

function authorized(request) {
  const expected = process.env.WATCHTOWER_PASSWORD;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === "Bearer " + expected;
}

export default async (request) => {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const store = getStore("watchtower-events");
  const { blobs } = await store.list();
  const recent = blobs.slice(-5000);

  const records = [];
  for (const item of recent) {
    const data = await store.get(item.key, { type: "json" });
    if (data) records.push(data);
  }

  const visitors = new Set(records.map(r => r.visitorId).filter(Boolean));
  const pageViews = records.filter(r => r.event === "page_view").length;

  const countBy = (items, keyFn) => {
    const out = {};
    for (const item of items) {
      const key = keyFn(item) || "Unknown";
      out[key] = (out[key] || 0) + 1;
    }
    return Object.entries(out).sort((a,b) => b[1] - a[1]).slice(0, 20);
  };

  const day = new Date();
  day.setHours(0,0,0,0);
  const today = records.filter(r => new Date(r.timestamp) >= day);

  return Response.json({
    generatedAt: new Date().toISOString(),
    totals: {
      events: records.length,
      pageViews,
      uniqueVisitors: visitors.size,
      todayVisitors: new Set(today.map(r => r.visitorId)).size,
      todayPageViews: today.filter(r => r.event === "page_view").length
    },
    countries: countBy(records, r => r.country),
    cities: countBy(records, r => r.city),
    pages: countBy(records.filter(r => r.event === "page_view"), r => r.path),
    referrers: countBy(records, r => r.referrer),
    events: countBy(records, r => r.event),
    recent: records.slice(-100).reverse()
  }, { headers: { "Cache-Control": "no-store" } });
};
