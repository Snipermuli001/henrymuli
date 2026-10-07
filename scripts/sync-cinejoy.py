import json, re
from html import unescape
from urllib.request import Request, urlopen
from urllib.parse import urljoin

BASE = "https://cinejoy.pk"
URLS = [BASE + "/search", BASE + "/category/movie/trending", BASE + "/category/tv/trending"]

def fetch(url):
    req=Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; HenryMediaSync/1.0)"})
    with urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")

def clean(s):
    return re.sub(r"\\s+", " ", unescape(re.sub(r"<[^>]+>", " ", s))).strip()

items={}
for url in URLS:
    try:
        html=fetch(url)
    except Exception as e:
        print("fetch failed", url, e)
        continue

    # Capture links with nearby image/title markup. CineJoy's server-rendered pages expose
    # title links and poster images in the HTML. We store metadata only; no video/media files.
    for m in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.I|re.S):
        href=urljoin(BASE, unescape(m.group(1)))
        body=m.group(2)
        title=clean(body)
        if not title or len(title)>120 or not href.startswith(BASE):
            continue
        if not re.search(r'/(movie|series)/', href):
            continue
        img=re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', body, re.I)
        poster=urljoin(BASE, unescape(img.group(1))) if img else ""
        score=""
        sm=re.search(r'(?:★|rating|score)[^0-9]*([0-9]+(?:\\.[0-9]+)?)', body, re.I)
        if sm: score=sm.group(1)
        year=""
        ym=re.search(r'\\b(19|20)\\d{2}\\b', body)
        if ym: year=ym.group(0)
        kind="series" if "/series/" in href else "movie"
        key=href.lower()
        items[key]={"title":title,"type":kind,"year":year,"score":score,"cinejoy":href,"poster":poster}

# Keep a useful catalogue even if CineJoy changes one category page.
out=list(items.values())
out.sort(key=lambda x: (x["type"], x["title"].lower()))
if not out:
    raise SystemExit("No CineJoy catalogue items were parsed.")

with open("data/cinejoy.json","w",encoding="utf-8") as f:
    json.dump({"updatedAt":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),"items":out},f,ensure_ascii=False,indent=2)

print("Synced",len(out),"CineJoy titles")
