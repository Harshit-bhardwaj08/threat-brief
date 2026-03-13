from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TechNode(BaseModel):
    name: str
    cpe: str

class UserCreate(BaseModel):
    username: str
    tech_stack: Optional[List[TechNode]] = []


class UserResponse(BaseModel):
    id: int
    username: str
    tech_stack: List[TechNode]

    class Config:
        from_attributes = True


class VulnerabilityResponse(BaseModel):
    id: int
    cve_id: str
    raw_description: str
    ai_summary: Optional[str] = None
    severity: Optional[str] = None
    published_date: Optional[str] = None
    epss_score: float = 0.0

    class Config:
        from_attributes = True


class TechMatch(BaseModel):
    name: str
    match_type: str

class ThreatResponse(BaseModel):
    cve_id: str
    severity: str
    ai_summary: str
    relevance_score: int
    matched_tech: List[TechMatch]
    published_date: str
    is_actively_exploited: bool = False
    is_patched: bool = False
    epss_score: float = 0.0

class NewsItem(BaseModel):
    title: str
    link: str
    description: Optional[str] = ""
    pub_date: Optional[str] = ""
    source: Optional[str] = ""
    matched_tech: List[str] = []

class DashboardResponse(BaseModel):
    threats: List[ThreatResponse]
    news: List[NewsItem]
    is_protected: bool = False

class SandboxRequest(BaseModel):
    tags: List[str]
