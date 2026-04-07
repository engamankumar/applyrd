import json
import asyncio
from typing import List, Dict, Any
from agents.config import CASCADE_MODELS, get_active_model

class InboxAgent:
    def __init__(self, client=None):
        self.client = client
        active = get_active_model()
        self.models_to_try = [active] + [m for m in CASCADE_MODELS if m != active]

    async def _generate(self, prompt: str) -> str:
        if not self.client:
            return "__MOCK__"
        
        last_err = None
        for m_id in self.models_to_try:
            try:
                print(f"🚀 [InboxAgent] Trying {m_id}...", flush=True)
                # Enforce a 120s timeout so we don't hang during high-volume analysis
                try:
                    response = await asyncio.wait_for(
                        self.client.aio.models.generate_content(model=m_id, contents=prompt),
                        timeout=120.0
                    )
                    txt = response.text.strip()
                    if txt:
                        print(f"✅ [InboxAgent] Success with {m_id}")
                        return txt
                except asyncio.TimeoutError:
                    print(f"⌛ [InboxAgent] {m_id} timed out after 120s. Trying next...")
                    continue
            except Exception as e:
                last_err = e
                print(f"⚠️ [InboxAgent] {m_id} error: {str(e)[:100]}", flush=True)
        return ""

    async def classify_and_extract(self, emails: List[Dict]) -> List[Dict]:
        """
        Takes a list of email metadata and snippets, classifies them, 
        and extracts job-related information.
        """
        if not emails:
            return []

        # Standardize email input for prompt
        email_data = []
        for e in emails:
            # Ensure we're dealing with a dict to avoid 'str has no attribute get'
            if not isinstance(e, dict):
                continue
                
            email_data.append({
                "id": e.get("id", "unknown"),
                "subject": e.get("subject", "No Subject"),
                "from": e.get("from", "Unknown Sender"),
                "snippet": e.get("snippet", e.get("body", ""))[:200],
                "body": e.get("body", "")
            })

        prompt = f"""
        You are an expert HR assistant. Analyze the following list of recent emails and identify which ones are related to a job application process.
        
        Each email object has a 'snippet' and a 'body' (the full text). Use the 'body' for detailed extraction of requirements and links.
        
        Emails:
        {json.dumps(email_data)}
        
        For each email, classify it as:
        1. 'application_confirmation': A confirmation that an application was received.
        2. 'interview_invite': A request for an interview or a meeting.
        3. 'rejection': A notification that the application was not successful.
        4. 'status_update': Any other update regarding the application status.
        5. 'invitation_to_apply': A recruiter or platform reaching out asking you to apply.
        6. 'irrelevant': Not related to a specific job application.
        
        For relevant emails, extract as much detail as possible:
        - company_name: Name of the company.
        - job_title: Title of the position.
        - apply_link: THE PRIMARY APPLICATION URL found in the body. Look for URLs next to words like 'Apply', 'View Job', 'Register', 'Job Details', or any call-to-action button links.
        - location: Mentioned work location or 'Remote'.
        - salary_range: Mentioned compensation (if present).
        - experience_level: e.g., '3-7 years', 'Senior', etc.
        - description: THE FULL JOB DESCRIPTION in Markdown format. Use bold headers for sections (e.g., **Requirements**), clear bullet points for skills, and proper double-newlines between sections for perfect readability. DO NOT over-summarize.
        - confidence_score: 0-100.
        
        Return a JSON list of objects in this format:
        [
            {{
                "id": "email_id",
                "classification": "classification_type",
                "company_name": "Company",
                "job_title": "Role",
                "apply_link": "https://...",
                "location": "...",
                "salary_range": "...",
                "experience_level": "...",
                "description": "...",
                "confidence_score": 95
            }},
            ...
        ]
        
        Return ONLY valid JSON.
        """
        
        try:
            response_text = await self._generate(prompt)
            clean_json = response_text.replace('```json', '').replace('```', '').strip()
            results = json.loads(clean_json)
            # Return everything so the caller can log categories for transparency
            return results
        except Exception as e:
            print(f"Inbox Classification Error: {e}")
            return []
