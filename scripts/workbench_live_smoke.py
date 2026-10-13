"""Public, read-only deployment smoke test: no API token and no private data."""
import os
import urllib.error
import urllib.request

BASE = os.environ.get("WORKBENCH_BASE_URL", "https://seo-opportunity-workbench.foxigaoqian-soocly.workers.dev").rstrip("/")

def open_public(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent":"seo-radar-smoke/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status,resp.read(100000).decode("utf-8","replace")
    except urllib.error.HTTPError as exc:
        return exc.code,exc.read(10000).decode("utf-8","replace")

def main():
    code,html=open_public("/")
    assert code == 200 and "Opportunity Radar" in html, ("home",code,html[:180])
    code,js=open_public("/app.js")
    assert code == 200 and "research" in js.lower(), ("js",code,js[:180])
    code,css=open_public("/style.css")
    assert code == 200 and ".drawer" in css, ("css",code,css[:180])
    code,health=open_public("/api/health")
    assert code == 200 and '"ready":true' in health, ("health",code,health)
    code,body=open_public("/api/items")
    assert code == 401 and "Unauthorized" in body, ("secure endpoint",code,body[:180])
    print("Live Worker smoke passed: UI, assets, D1/token bindings, anonymous API rejection.")

if __name__ == "__main__":
    main()
