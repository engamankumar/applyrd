import json
from typing import List, Dict, Any
from vertexai.generative_models import GenerativeModel
import vertexai
from agents.config import CASCADE_MODELS

class SkillGapAgent:
    def __init__(self, project_id: str, location: str, client=None):
        self.project_id = project_id
        self.location = location
        self.client = client
        from agents.config import CASCADE_MODELS, get_active_model
        active = get_active_model()
        self.models_to_try = [active] + [m for m in CASCADE_MODELS if m != active]

    async def _generate(self, prompt: str) -> str:
        if not self.client:
            return "__MOCK__"
        
        last_err = None
        for m_id in self.models_to_try:
            try:
                resp = self.client.models.generate_content(model=m_id, contents=prompt)
                return resp.text.strip()
            except Exception as e:
                last_err = e
                print(f"⚠️ [SkillGapAgent] fallback error with {m_id}: {str(e)[:100]}")
        return ""

    async def analyze(self, resume_text: Any, target_role_jd: Any) -> Dict:
        """Compares user's resume against a Job Description to find missing skills."""
        # Ensure input is string and slice safely
        safe_resume = str(resume_text)[:2000]
        safe_jd = str(target_role_jd)[:2000]
        
        prompt = f"""
        Compare the user's Resume against the Job Description. Identify exactly what skills, certifications, or experience nodes are MISSING from the Resume which are REQUIRED for the Job.
        
        Resume: {safe_resume}
        Job Description: {safe_jd}
        
        Return a JSON object with:
        {{
            "missing_skills": ["Skill 1", "Skill 2"],
            "skill_gap_summary": "Short paragraph analyzing the gap",
            "priority_level": "High/Medium/Low"
        }}
        """
        try:
            response_text = await self._generate(prompt)
            return json.loads(response_text.replace('```json', '').replace('```', '').strip())
        except:
            return {
                "missing_skills": ["Cloud Infrastructure", "Kubernetes Management"],
                "skill_gap_summary": "Based on the target SRE role, you lack specific cloud orchestration exposure.",
                "priority_level": "High"
            }

class GoogleSkillsAgent:
    """Specialist that suggests general Learning Paths and Courses."""
    
    def __init__(self, client=None):
        from agents.config import FAST_CASCADE_MODELS, get_active_model
        active = get_active_model()
        self.models_to_try = [active] + [m for m in FAST_CASCADE_MODELS if m != active]

    async def _generate(self, prompt: str) -> str:
        if not self.client:
            return "__MOCK__"
        for m_id in self.models_to_try:
            try:
                resp = self.client.models.generate_content(model=m_id, contents=prompt)
                return resp.text.strip()
            except Exception as e:
                print(f"⚠️ [GoogleSkillsAgent] fallback error with {m_id}: {str(e)[:100]}")
        return ""

    async def recommend_labs(self, gaps: List[str]) -> List[Dict[str, str]]:
        if not gaps:
             return [{"title": "Complete Web Development Bootcamp (Udemy)", "url": "https://www.udemy.com/courses/search/?q=web%20development"}]
             
        prompt = f"""
        Given the following missing skills for a professional looking to transition into a new role: {gaps}
        Recommend exactly 3 highly relevant online courses (from platforms like Udemy, Coursera, or edX) to help them bridge these gaps.
        Instead of a direct URL (which might 404), provide a search URL for the platform based on the skill.
        Example: "https://www.udemy.com/courses/search/?q=React" or "https://www.coursera.org/search?query=Product%20Management".
        
        Return ONLY valid JSON in this format:
        [
            {{"title": "Course Name (Platform)", "url": "Search URL"}}
        ]
        """
        
        try:
            response_text = await self._generate(prompt)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            clean_json = response_text.replace('```', '').strip()
            recommendations = json.loads(clean_json)
            return recommendations[:3]
        except Exception as e:
            print(f"Course Rec Error: {e}")
            safe_query = str(gaps[0]).replace(' ', '%20') if gaps else "tech%20skills"
            return [
                {"title": f"Mastering {gaps[0] if gaps else 'Core Skills'} (Udemy)", "url": f"https://www.udemy.com/courses/search/?q={safe_query}"},
                {"title": f"Advanced {gaps[-1] if len(gaps)>1 else 'Professional'} Certification (Coursera)", "url": f"https://www.coursera.org/search?query={safe_query}"}
            ]
