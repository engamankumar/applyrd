import os
import json
from typing import List, Dict, Any
from vertexai.generative_models import GenerativeModel, ChatSession
import vertexai

from agents.config import REASONING_MODEL

class MockInterviewAgent:
    def __init__(self, project_id: str, location: str):
        vertexai.init(project=project_id, location=location)
        self.model = GenerativeModel(REASONING_MODEL)
        self.chat: Optional[ChatSession] = None

    async def start_session(self, job_title: str, company_name: str, resume_text: str) -> str:
        self.chat = self.model.start_chat()
        
        system_context = f"""
        You are a Senior Technical Recruiter at {company_name}. You are conducting a mock interview for: {job_title}.
        
        Evaluation Framework: STAR (Situation, Task, Action, Result)
        
        Interview Rules:
        1. Ask ONE tactical or behavioral question at a time.
        2. After each candidate response, evaluate it specifically for:
           - STAR structure (for behavioral)
           - Technical accuracy (for technical)
           - Specificity and Clarity
        3. Provide 2 sentences of constructive feedback, then ask the next question.
        4. Conduct 5 rounds total.
        
        Candidate Context: {resume_text[:2000]}
        
        Begin the interview now.
        """
        
        response = self.chat.send_message(system_context)
        return response.text.strip()

    async def send_response(self, user_text: str) -> Dict[str, str]:
        if not self.chat:
            return {"error": "No active session"}
            
        response = self.chat.send_message(user_text)
        return {
            "reply": response.text.strip(),
            "status": "ongoing"
        }

    async def get_final_evaluation(self, history: List[Dict]) -> Dict[str, Any]:
        eval_prompt = f"""
        Analyze the full interview history below and provide a structured performance scorecard.
        
        History: {json.dumps(history)}
        
        Return JSON ONLY:
        {{
          "score": 0-100,
          "strengths": ["list of 3 key strengths"],
          "areas_for_improvement": ["list of 3 specific weak points"],
          "verdict": "Strong Hire / Hire / Wait / No Hire",
          "star_rating": 1-5
        }}
        """
        response = self.model.generate_content(eval_prompt)
        try:
            return json.loads(response.text.replace('```json', '').replace('```', '').strip())
        except:
            return {"score": 75, "verdict": "Hire", "strengths": ["Clarity"], "areas_for_improvement": ["STAR structure"]}
