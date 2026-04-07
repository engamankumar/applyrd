import os
import json
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class CoordinatorAgent:
    def __init__(self, gemini_client=None, mock_mode=True):
        self.client = gemini_client
        self.mock_mode = mock_mode
        
        # Load system prompt
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "coordinator_prompt.txt")
        try:
            with open(prompt_path, "r") as f:
                self.system_prompt = f.read()
        except FileNotFoundError:
            self.system_prompt = "You are JobPilot Coordinator. Delegate tasks to specialist agents."
        
        from agents.config import CASCADE_MODELS
        self.models_to_try = CASCADE_MODELS

    def _ai(self, prompt: str) -> str:
        """Internal helper for Gemini calls."""
        if self.mock_mode or self.client is None:
            return "__MOCK__"
        last_err = None
        for m_id in self.models_to_try:
            try:
                resp = self.client.models.generate_content(model=m_id, contents=prompt)
                return resp.text.strip()
            except Exception as e:
                last_err = e
                print(f"Coordinator AI Error with {m_id}: {e}")
        return "__MOCK__"

    async def get_plan(self, user_request: str, user_context: Dict) -> Dict:
        """Determines which agents to invoke based on user request."""
        if self.mock_mode:
            req = user_request.lower()
            
            if "roadmap" in req or "career" in req or "skill" in req:
                return {
                    "plan": [
                        {"agent": "skill_gap_agent", "action": "analyze", "reason": "Identify gaps between profile and target role."},
                        {"agent": "google_skills_agent", "action": "recommend", "reason": "Suggest Google Cloud labs to close those gaps."},
                        {"agent": "job_search_agent", "action": "find_targets", "reason": "Find companies that value these specific Google skills."}
                    ],
                    "user_message": "Analyzing your career trajectory! I've mapped out a roadmap using Google Cloud Skills Boost to get you ready for your next big role."
                }
            
            if "mock" in req or "interview" in req:
                return {
                    "plan": [
                        {"agent": "prep_agent", "action": "research", "reason": "Collect recent company info and interview patterns."},
                        {"agent": "mock_interview_agent", "action": "start", "reason": "Initiate multi-turn technical and behavioral simulation."}
                    ],
                    "user_message": "Preparing your personalized interview simulator! I'm researching company-specific questions now."
                }

            if "resume" in req or "tailor" in req:
                return {
                    "plan": [
                        {"agent": "resume_agent", "action": "parse", "reason": "Extract skills and experience structure."},
                        {"agent": "resume_agent", "action": "tailor", "reason": "Rewrite bullet points for higher ATS match score."}
                    ],
                    "user_message": "Optimizing your resume! I'll tailor each bullet point to match target job requirements."
                }

            # Default
            return {
                "plan": [
                    {"agent": "job_search_agent", "action": "search", "reason": "Standard discovery based on current profile."}
                ],
                "user_message": "I'm looking for the perfect job openings for you right now."
            }

        full_prompt = f"{self.system_prompt}\n\nContext: {json.dumps(user_context)}\n\nUser Request: {user_request}"
        result_text = self._ai(full_prompt)
        
        try:
            if result_text == "__MOCK__":
                 raise ValueError("Mock response triggered")
            # Clean possible markdown
            clean_json = result_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
        except Exception:
            # Smart fallback based on request keywords if AI fails
            req = user_request.lower()
            if "roadmap" in req or "career" in req or "skill" in req:
                return {
                    "plan": [
                        {"agent": "skill_gap_agent", "action": "analyze", "reason": "Identify gaps (fallback mode)."},
                        {"agent": "google_skills_agent", "action": "recommend", "reason": "Suggest labs (fallback mode)."}
                    ],
                    "user_message": "Analyzing your career path. I've found some key areas to focus on."
                }
            return {
                "plan": [{"agent": "job_search_agent", "action": "search", "reason": "Fallback to base search."}],
                "user_message": "I'll start by looking for some relevant jobs for you."
            }
