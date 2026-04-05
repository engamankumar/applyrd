import os
import json
from typing import List, Dict, Any
from vertexai.generative_models import GenerativeModel
import vertexai

from agents.config import get_vertex_model

class TrackerAgent:
    def __init__(self, project_id: str, location: str):
        vertexai.init(project=project_id, location=location)
        self.model = GenerativeModel(get_vertex_model()) # Dynamically locks to active working model

    async def classify_emails(self, emails: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        results = []
        for email in emails:
            prompt = f"""
            Classify this email from a potential employer into one of:
            - interview_invite
            - human_reply
            - rejection
            - auto_reply
            - other
            
            Email Subject: {email['subject']}
            Email Body: {email['body'][:1000]}
            
            Return JSON: {{"classification": "", "summary": "", "action_needed": bool}}
            """
            
            response = self.model.generate_content(prompt)
            try:
                data = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                email.update(data)
                results.append(email)
            except:
                email["classification"] = "other"
                results.append(email)
        
        return results

    def should_suggest_follow_up(self, classification: str, days_since_last: int) -> bool:
        if classification == "auto_reply" and days_since_last >= 7:
            return True
        return False
