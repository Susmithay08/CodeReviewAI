from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, DateTime, Text, Integer, JSON
from datetime import datetime, timezone
import uuid
from app.core.config import settings

class Base(DeclarativeBase):
    pass

class Review(Base):
    __tablename__ = "reviews"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=True)
    language = Column(String, default="auto")
    input_type = Column(String, default="paste")   # paste | github
    source_url = Column(String, nullable=True)
    original_code = Column(Text, nullable=True)
    diff_text = Column(Text, nullable=True)
    comments = Column(JSON, default=list)           # list of comment objects
    summary = Column(Text, nullable=True)
    total_issues = Column(Integer, default=0)
    score = Column(Integer, default=0)              # 0-100
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
