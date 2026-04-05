from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any

class UserPreferences(BaseModel):
    preferred_roles: List[str] = []
    preferred_companies: List[str] = []
    location_preference: Optional[str] = None
    work_type: List[str] = []
    salary_min: Optional[int] = None

class JobSearchRequest(BaseModel):
    user_id: Optional[str] = "demo"
    preferences: UserPreferences = UserPreferences()
    resume_text: Optional[str] = None

class ResumeParseRequest(BaseModel):
    pdf_url: Optional[str] = None
    user_id: Optional[str] = "demo"

class AgentResponse(BaseModel):
    status: str
    data: Dict[str, Any]
    error: Optional[str] = None
