from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db, Review
from app.services.ai import review_code
from app.services.github import fetch_pr_diff

router = APIRouter()


class PasteReviewRequest(BaseModel):
    code: str
    filename: Optional[str] = None
    language: Optional[str] = None
    groq_api_key: Optional[str] = None
    save: bool = False
    title: Optional[str] = None


class PRReviewRequest(BaseModel):
    pr_url: str
    groq_api_key: Optional[str] = None
    save: bool = False


class SaveReviewRequest(BaseModel):
    title: str
    source_type: str
    source_url: Optional[str] = None
    language: Optional[str] = None
    code_snippet: Optional[str] = None
    comments: list
    summary: Optional[str] = None
    stats: Optional[dict] = None
    model_used: Optional[str] = None


def _review_dict(r: Review) -> dict:
    return {
        "id": r.id, "title": r.title, "source_type": r.source_type,
        "source_url": r.source_url, "language": r.language,
        "comments": r.comments, "summary": r.summary,
        "stats": r.stats, "model_used": r.model_used,
        "created_at": r.created_at,
        "code_snippet": r.code_snippet,
    }


@router.post("/paste")
async def review_paste(req: PasteReviewRequest, db: AsyncSession = Depends(get_db)):
    if not req.code.strip():
        raise HTTPException(400, "Code cannot be empty")
    if len(req.code) > 50000:
        raise HTTPException(400, "Code too long. Max 50,000 characters.")

    result = await review_code(
        code=req.code,
        language=req.language,
        is_diff=False,
        groq_api_key=req.groq_api_key,
    )

    if result.get("error"):
        raise HTTPException(422, result["error"])

    review_data = {
        "source_type": "paste",
        "source_url": None,
        "language": result.get("language") or req.language or "Unknown",
        "code_snippet": req.code[:10000],
        "comments": result.get("comments", []),
        "summary": result.get("summary", ""),
        "stats": result.get("stats", {}),
        "model_used": "groq/llama-3.3-70b",
    }

    if req.save:
        title = req.title or req.filename or "Pasted Code"
        r = Review(title=title, **review_data)
        db.add(r)
        await db.commit()
        await db.refresh(r)
        return _review_dict(r)

    return {"id": None, "title": req.title or req.filename or "Pasted Code", **review_data}


@router.post("/pr")
async def review_pr(req: PRReviewRequest, db: AsyncSession = Depends(get_db)):
    pr_data = await fetch_pr_diff(req.pr_url)
    if pr_data.get("error"):
        raise HTTPException(422, pr_data["error"])

    diff = pr_data["diff"]
    title = f"{pr_data['repo']} PR #{pr_data['pr_number']}: {pr_data['title']}"

    result = await review_code(
        code=diff,
        is_diff=True,
        groq_api_key=req.groq_api_key,
    )

    if result.get("error"):
        raise HTTPException(422, result["error"])

    review_data = {
        "source_type": "github_pr",
        "source_url": req.pr_url,
        "language": result.get("language", "Unknown"),
        "code_snippet": diff[:10000],
        "comments": result.get("comments", []),
        "summary": result.get("summary", ""),
        "stats": result.get("stats", {}),
        "model_used": "groq/llama-3.3-70b",
    }

    pr_meta = {
        "title": pr_data["title"],
        "repo": pr_data["repo"],
        "pr_number": pr_data["pr_number"],
        "files": pr_data.get("files", []),
    }

    if req.save:
        r = Review(title=title, **review_data)
        db.add(r)
        await db.commit()
        await db.refresh(r)
        return {**_review_dict(r), "pr_meta": pr_meta}

    return {"id": None, "title": title, **review_data, "pr_meta": pr_meta}


@router.post("/save")
async def save_review(req: SaveReviewRequest, db: AsyncSession = Depends(get_db)):
    r = Review(**req.model_dump())
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _review_dict(r)


@router.get("/history")
async def get_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review).order_by(desc(Review.created_at)).limit(limit)
    )
    return [_review_dict(r) for r in result.scalars().all()]


@router.get("/{review_id}")
async def get_review(review_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.get(Review, review_id)
    if not r:
        raise HTTPException(404, "Review not found")
    return _review_dict(r)


@router.delete("/{review_id}")
async def delete_review(review_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.get(Review, review_id)
    if not r:
        raise HTTPException(404)
    await db.delete(r)
    await db.commit()
    return {"deleted": True}