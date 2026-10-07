import json
import re
from datetime import datetime, timezone
from html import unescape
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

BASE = "https://cinejoy.pk"
URLS = [
    BASE + "/search",
    BASE + "/category/movie/trending",
    BASE + "/category/tv/trending",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=45) as response:
        return response.read().decode("utf-8", "ignore")


def clean(value):
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


def absolute_url(value):
    if not value:
        return ""
    return urljoin(BASE, unescape(value.strip()))


def add_item(items, href, title="", year="", score="", poster=""):
    href = absolute_url(href)
    if not href.startswith(BASE):
        return

    kind_match = re.search(r"/(movie|series)/", href, re.I)
    if not kind_match:
        return

    kind = kind_match.group(1).lower()
    title = clean(title)

    # CineJoy slugs normally end in -YEAR. Keep that as a fallback title/year
    # source when the listing page only exposes the URL.
    slug = href.rstrip("/").rsplit("/", 1)[-1]
    if not year:
        year_match = re.search(r"(19|20)\d{2}(?=/?$)", slug)
        if year_match:
            year = year_match.group(0)

    if not title:
        title_slug = re.sub(r"-(19|20)\d{2}$", "", slug)
        title = re.sub(r"[-_]+", " ", title_slug).strip()
        title = re.sub(r"\b\w", lambda m: m.group(0).upper(), title)

    if not title or len(title) > 160:
        return

    key = href.lower()
    item = items.get(key, {})
    items[key] = {
        "title": title or item.get("title", ""),
        "type": kind,
        "year": year or item.get("year", ""),
        "score": score or item.get("score", ""),
        "cinejoy": href,
        "poster": poster or item.get("poster", ""),
    }


def parse_listing(html, items):
    soup = BeautifulSoup(html, "html.parser")

    # First pass: normal anchors.
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        if not re.search(r"/(movie|series)/", href, re.I):
            continue

        text = clean(a.get_text(" ", strip=True))
        container = clean(a.parent.get_text(" ", strip=True) if a.parent else text)

        year_match = re.search(r"\b(19|20)\d{2}\b", container)
        score_match = re.search(r"(?<!\d)(10(?:\.0)?|[0-9](?:\.[0-9])?)(?!\d)", container)

        img = a.find("img")
        if not img and a.parent:
            img = a.parent.find("img")
        if not img and a.parent and a.parent.parent:
            img = a.parent.parent.find("img")

        poster = ""
        if img:
            poster = (
                img.get("src")
                or img.get("data-src")
                or img.get("data-lazy-src")
                or img.get("data-original")
                or ""
            )

        add_item(
            items,
            href,
            title=text,
            year=year_match.group(0) if year_match else "",
            score=score_match.group(1) if score_match else "",
            poster=absolute_url(poster),
        )

    # Second pass: some CineJoy pages are rendered with data/JSON that may
    # contain the detail URLs without exposing them as ordinary anchors.
    url_pattern = r"""(?:(?:https?:)?//cinejoy\\.pk)?/(?:movie|series)/[^"\\'\\\\s<>]+"""
    for match in re.findall(url_pattern, html, re.I):
        add_item(items, match.replace("\\/","/"))

    # Also catch escaped JSON URLs where slashes are written as \/.
    escaped_pattern = r"""(?:cinejoy\\.pk)?(\\/(?:movie|series)\\/[^"\\'\\\\s<>]+)"""
    for match in re.findall(escaped_pattern, html, re.I):
        add_item(items, match.replace("\\/","/"))


def enrich_detail(item):
    try:
        html = fetch(item["cinejoy"])
        soup = BeautifulSoup(html, "html.parser")

        # Prefer structured metadata because it is stable even when the page
        # is client-rendered.
        title = ""
        poster = ""

        for selector in [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
        ]:
            node = soup.select_one(selector)
            if node and node.get("content"):
                title = clean(node["content"])
                break

        for selector in [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
        ]:
            node = soup.select_one(selector)
            if node and node.get("content"):
                poster = absolute_url(node["content"])
                break

        text = clean(soup.get_text(" ", strip=True))
        if not item["year"]:
            year_match = re.search(r"\b(19|20)\d{2}\b", text)
            if year_match:
                item["year"] = year_match.group(0)

        if not item["score"]:
            score_match = re.search(r"★\s*(10(?:\.0)?|[0-9](?:\.[0-9])?)", text)
            if score_match:
                item["score"] = score_match.group(1)

        if title:
            title = re.sub(r"\s*\|\s*Cinejoy.*$", "", title, flags=re.I)
            title = re.sub(r"\s*\(\d{4}\).*$", "", title).strip()
            if title:
                item["title"] = title

        if poster:
            item["poster"] = poster

    except Exception as exc:
        print("detail enrichment failed:", item.get("cinejoy"), exc)

    return item


items = {}

for url in URLS:
    try:
        html = fetch(url)
        print("Fetched", url, "bytes:", len(html))
        parse_listing(html, items)
    except Exception as exc:
        print("fetch failed:", url, exc)

# If listing pages expose only a small number of URLs, enrich those records
# directly. This gives the Media Hub real CineJoy poster images instead of
# fabricated filename-based TMDB URLs.
for item in list(items.values()):
    enrich_detail(item)

if not items:
    raise SystemExit(
        "No CineJoy catalogue URLs were found. The site response may have "
        "changed or blocked automated requests."
    )

out = sorted(
    items.values(),
    key=lambda x: (x["type"], x["title"].lower(), x["year"]),
)

with open("data/cinejoy.json", "w", encoding="utf-8") as file:
    json.dump(
        {
            "source": BASE,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "items": out,
        },
        file,
        ensure_ascii=False,
        indent=2,
    )

print("Synced", len(out), "CineJoy titles")
