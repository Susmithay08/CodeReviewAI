import httpx, re
from app.core.config import settings

def parse_github_pr_url(url):
    m = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", url)
    return (m.group(1), m.group(2), int(m.group(3))) if m else None

async def fetch_pr_diff(url):
    parsed = parse_github_pr_url(url)
    if not parsed:
        return {"diff":None,"title":None,"description":None,"language":"auto","error":"Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123"}
    owner, repo, pr_number = parsed
    headers = {"Accept":"application/vnd.github.v3+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    async with httpx.AsyncClient(timeout=20) as client:
        meta = await client.get(f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}", headers=headers)
        if meta.status_code == 404:
            return {"diff":None,"title":None,"description":None,"language":"auto","error":"PR not found. Make sure the repo is public."}
        if meta.status_code == 403:
            return {"diff":None,"title":None,"description":None,"language":"auto","error":"GitHub rate limit hit. Add GITHUB_TOKEN to .env"}
        if not meta.is_success:
            return {"diff":None,"title":None,"description":None,"language":"auto","error":f"GitHub API error: {meta.status_code}"}
        m = meta.json()
        title = m.get("title","")
        description = (m.get("body","") or "")[:500]
        diff_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
            headers={**headers,"Accept":"application/vnd.github.v3.diff"})
        if not diff_resp.is_success:
            return {"diff":None,"title":title,"description":description,"language":"auto","error":f"Could not fetch diff: {diff_resp.status_code}"}
        diff_text = diff_resp.text
        exts = re.findall(r"\+\+\+ b/(.+)", diff_text)
        ext_map = {".py":"Python",".js":"JavaScript",".ts":"TypeScript",".jsx":"JavaScript",".tsx":"TypeScript",".go":"Go",".rs":"Rust",".java":"Java",".rb":"Ruby",".php":"PHP",".cs":"C#",".cpp":"C++"}
        counts = {}
        for p in exts:
            for ext, lang in ext_map.items():
                if p.endswith(ext): counts[lang] = counts.get(lang,0)+1
        language = max(counts, key=counts.get) if counts else "auto"
        return {"diff":diff_text,"title":title,"description":description,"language":language,"error":None,"pr_number":pr_number,"repo":f"{owner}/{repo}"}
