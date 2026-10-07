const ALLOWED_HOSTS = new Set([
  "atunwadigital.streamguys1.com",
  "radiojambo-atunwadigital.streamguys1.com",
  "radiocitizen-atunwadigital.streamguys1.com",
  "homeboyzradio-atunwadigital.streamguys1.com",
  "mayianfm-atunwadigital.streamguys1.com",
  "streaming.shoutcast.com",
  "streamingv2.shoutcast.com",
  "pegasus.nucast.co.uk"
]);

export async function onRequest(context) {
  const raw = new URL(context.request.url).searchParams.get("url");
  if (!raw) return new Response("Missing stream URL", {status:400});
  let target;
  try { target = new URL(raw); } catch { return new Response("Invalid stream URL", {status:400}); }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("Stream host not allowed", {status:403});
  }

  const upstream = await fetch(target.toString(), {
    headers: { "User-Agent": "Project-Henry-Radio/1.0", "Accept": "audio/*,*/*;q=0.8" }
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Upstream stream unavailable", {status:502});
  }

  const headers = new Headers(upstream.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.delete("content-length");
  return new Response(upstream.body, {status:upstream.status, headers});
}
