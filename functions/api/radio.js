export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "Kenya").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 60), 1), 80);

  try {
    const searchUrl = `https://radio.garden/api/search?q=${encodeURIComponent(q)}`;
    const upstream = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Project-Henry-Radio-Hub/1.0"
      }
    });

    if (!upstream.ok) {
      return Response.json({ error: "Radio Garden search unavailable" }, { status: 502 });
    }

    const data = await upstream.json();
    const hits = data?.hits?.hits || [];
    const channels = hits
      .map(x => x?._source)
      .filter(x => x?.type === "channel" && x?.url)
      .slice(0, limit);

    const stations = await Promise.all(channels.map(async (x) => {
      const parts = x.url.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      let detail = {};
      try {
        const r = await fetch(`https://radio.garden/api/ara/content/channel/${encodeURIComponent(id)}`, {
          headers: { "Accept": "application/json", "User-Agent": "Project-Henry-Radio-Hub/1.0" }
        });
        if (r.ok) detail = (await r.json())?.data || {};
      } catch {}

      const place = detail.place || {};
      const country = detail.country || {};
      const homepage = detail.website || "";
      return {
        name: detail.title || x.title,
        tags: "Radio Garden · Live station",
        country: country.title || x.subtitle || "",
        countrycode: country.code || x.code || "",
        homepage,
        favicon: "",
        codec: "LIVE",
        stream: `https://radio.garden/api/ara/content/listen/${encodeURIComponent(id)}/channel.mp3`,
        radioGardenUrl: `https://radio.garden${detail.url || x.url}`,
        place: place.title || ""
      };
    }));

    const clean = stations.filter(s => s.name && s.stream);
    return Response.json(clean, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900"
      }
    });
  } catch {
    return Response.json({ error: "Radio Garden network unavailable" }, { status: 502 });
  }
}