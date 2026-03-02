import httpx, json, re
from app.core.config import settings

LABEL_COLORS = {
    "bug":         {"bg":"#FF4D6D","text":"#fff"},
    "security":    {"bg":"#FF6B2B","text":"#fff"},
    "performance": {"bg":"#7C3AED","text":"#fff"},
    "style":       {"bg":"#0EA5E9","text":"#fff"},
    "good":        {"bg":"#22C55E","text":"#fff"},
    "suggestion":  {"bg":"#F59E0B","text":"#fff"},
}

SYSTEM_PROMPT = """You are an expert code reviewer. Analyze the provided code or diff and return a JSON review.
Return ONLY valid JSON, no markdown, no backticks.

JSON format:
{
  "summary": "2-3 sentence overall assessment",
  "score": <integer 0-100>,
  "comments": [
    {
      "line": <line number or null>,
      "label": <"bug"|"security"|"performance"|"style"|"good"|"suggestion">,
      "title": <short title max 8 words>,
      "body": <detailed explanation 1-3 sentences>,
      "severity": <"critical"|"major"|"minor"|"info">
    }
  ]
}

Rules:
- Be specific and actionable
- For diffs focus on changed lines (+ lines)
- Always include at least 1 "good" comment
- Cap at 15 comments total
- Score: 90-100 excellent, 70-89 good, 50-69 needs work, below 50 critical issues
- bug=logical error/crash, security=vulnerability/injection, performance=inefficiency/N+1, style=readability/naming, good=done well, suggestion=optional improvement"""

async def review_code(code, language="auto", context="", groq_api_key=None, is_diff=False):
    api_key = groq_api_key or settings.GROQ_API_KEY
    if not api_key:
        return {"summary":None,"score":0,"comments":[],"error":"No Groq API key. Add GROQ_API_KEY to .env or enter it in the app."}
    lang_hint = f"Language: {language}\n" if language != "auto" else ""
    diff_hint = "This is a git diff. Focus on added lines (starting with +).\n" if is_diff else ""
    ctx_hint = f"Context: {context}\n" if context else ""
    user_content = f"{lang_hint}{diff_hint}{ctx_hint}\nCode to review:\n\n{code[:12000]}"
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization":f"Bearer {api_key}","Content-Type":"application/json"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages":[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":user_content}],
                    "temperature":0.2,"max_tokens":3000,
                    "response_format":{"type":"json_object"},
                })
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            raw = re.sub(r"```json\s*","",raw); raw = re.sub(r"```\s*","",raw).strip()
            data = json.loads(raw)
            comments = data.get("comments",[])
            for c in comments:
                c["color"] = LABEL_COLORS.get(c.get("label","suggestion"), LABEL_COLORS["suggestion"])
            return {"summary":data.get("summary",""),"score":max(0,min(100,int(data.get("score",70)))),"comments":comments,"error":None}
    except httpx.HTTPStatusError as e:
        return {"summary":None,"score":0,"comments":[],"error":f"Groq API error {e.response.status_code}: {e.response.text[:200]}"}
    except json.JSONDecodeError as e:
        return {"summary":None,"score":0,"comments":[],"error":f"Could not parse AI response: {str(e)}"}
    except Exception as e:
        return {"summary":None,"score":0,"comments":[],"error":str(e)}
