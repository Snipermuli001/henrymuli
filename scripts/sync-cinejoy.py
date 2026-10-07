import json, re
from datetime import datetime, timezone
from html import unescape
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from bs4 import BeautifulSoup

BASE = "https://cinejoy.pk"
URLS = [BASE + "/search", BASE + "/category/movie/trending", BASE + "/category/tv/trending"]

def fetch(url):
    req = Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; HenryMediaSync/1.0)"})
    with urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")

def clean(text):
    return re.sub(r"\\s+", " ", unescape(text or "")).strip()

items = {}

for url in URLS:
    try:
        soup = BeautifulSoup(fetch(url), "html.parser")
    except Exception as e:
        print("fetch failed:", url, e)
        continue

    for a in soup.find_all("a", href=True):
        href = urljoin(BASE, unescape(a.get("href", "")))
        if not href.startswith(BASE) or not re.search(r"/(movie|series)/", href):
            continue

        title = clean(a.get_text(" ", strip=True))
        if not title or len(title) > 120:
            continue

        # Poster can be on the link itself or in a nearby card/container.
        img = a.find("img")
        if not img:
            parent = a.parent
            if parent:
                img = parent.find("img")
        if not img and a.parent and a.parent.parent:
            img = a.parent.parent.find("img")

        poster = ""
        if img:
            poster = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
            poster = urljoin(BASE, unescape(poster))

        container_text = clean(a.parent.get_text(" ", strip=True) if a.parent else a.get_text(" ", strip=True))
        year_match = re.search(r"\\b(19|20)\\d{2}\\b", container_text)
        score_match = re.search(r"\\b([0-9](?:\\.[0-9])?)\\b", container_text)

        year = year_match.group(0) if year_match else ""
        score = score_match.group(1) if score_match else ""
        kind = "series" if "/series/" in href else "movie"

        items[href.lower()] = {
            "title": title,
            "type": kind,
            "year": year,
            "score": score,
            "cinejoy": href,
            "poster": poster
        }

if not items:
    raise SystemExit("No CineJoy catalogue items were parsed.")

out = sorted(items.values(), key=lambda x: (x["type"], x["title"].lower()))

with open("data/cinejoy.json", "w", encoding="utf-8") as f:
    json.dump({
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "items": out
    }, f, ensure_ascii=False, indent=2)

print("Synced", len(out), "CineJoy titles")
