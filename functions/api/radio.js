export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const countrycode = (url.searchParams.get("countrycode") || "").toUpperCase();
  const limit = Math.min(Number(url.searchParams.get("limit") || 250), 500);
  const query = new URLSearchParams({
    limit: String(limit),
    hidebroken: "true",
    order: "clickcount",
    reverse: "true"
  });
  const endpoint = countrycode
    ? `https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${encodeURIComponent(countrycode)}?${query}`
    : `https://de1.api.radio-browser.info/json/stations?${query}`;
  try {
    const upstream = await fetch(endpoint, {
      headers: { "User-Agent": "Project-Henry-Radio-Hub/1.0", "Accept": "application/json" }
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=900"
      }
    });
  } catch {
    return Response.json({ error: "Radio directory unavailable" }, { status: 502 });
  }
}
