from sqlalchemy import Column, Integer, String, Float
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    # tech_stack is now a JSON-encoded list of objects: [{"name": "react", "cpe": "cpe:2.3:a:facebook:react:..."}, ...]
    tech_stack = Column(String, default="[]") 


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String, unique=True, index=True)
    raw_description = Column(String)
    ai_summary = Column(String)
    severity = Column(String)
    published_date = Column(String)
    is_actively_exploited = Column(Integer, default=0)  # SQLite-compatible boolean
    # CPE criteria strings from NVD, used for deterministic matching
    cpe_strings = Column(String, default="[]")          # JSON-encoded list[str]
    epss_score = Column(Float, default=0.0)


class ThreatSummary(Base):
    __tablename__ = "threat_summaries"

    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String, unique=True, index=True)
    ai_summary = Column(String)
    severity_rank = Column(Integer)
    affected_technologies = Column(String)  # JSON-encoded list
    is_patched = Column(Integer, default=0)  # 0=False, 1=True — AI-detected patch status

class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    link = Column(String, unique=True, index=True)
    description = Column(String)
    pub_date = Column(String)
    source = Column(String)
    # JSON-encoded list of tech names this article relates to
    matched_tech = Column(String, default="[]")
