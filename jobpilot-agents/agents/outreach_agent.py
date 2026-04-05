import os
import json
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

class OutreachAgent:
    def __init__(self, gemini_client=None, mock_mode=True):
        self.client = gemini_client
        self.mock_mode = mock_mode

    def _ai(self, prompt: str) -> str:
        if self.mock_mode or self.client is None:
            return "__MOCK__"
        try:
            resp = self.client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            return resp.text.strip()
        except:
            return "__MOCK__"

    async def find_linkedin_contacts(self, company_name: str, department: str = "Engineering") -> List[Dict]:
        """Finds potential recruiter or hiring manager contacts (simulated search)."""
        if self.mock_mode:
            return [
                {"name": "Sarah Miller", "title": f"Head of {department} at {company_name}", "linkedin": "https://linkedin.com/in/sarahm", "match_reason": "High probability hiring manager"},
                {"name": "David Chen", "title": f"Technical Recruiter at {company_name}", "linkedin": "https://linkedin.com/in/dchen", "match_reason": "Frequent poster about this role"}
            ]
        
        prompt = f"Find 2 realistic-sounding sample recruiter contacts for {company_name} in {department}. Return ONLY valid JSON array: [{{'name':'','title':'','linkedin':'','match_reason':''}}]"
        res = self._ai(prompt)
        try:
            return json.loads(res.replace("```json","").replace("```",""))
        except:
            return []

    async def find_triple_attack(self, company_name: str, job_title: str) -> Dict[str, Any]:
        """Implements the PRD Section 12 'Triple Attack' strategy."""
        role_type = "Engineering" if "Engineer" in job_title else "Product/Business"
        
        if self.mock_mode:
            return {
                "direct_apply_url": f"https://{company_name.lower().replace(' ', '')}.com/careers",
                "linkedin_easy_apply_url": f"https://www.linkedin.com/jobs/search/?keywords={job_title.replace(' ', '%20')}",
                "referral_contacts": [
                    {"name": "Alex Rivera", "title": f"Senior {role_type} Manager", "linkedin_url": "https://linkedin.com/in/alexr"}
                ]
            }

        prompt = f"""
        You are an Outreach Agent. For the role '{job_title}' at '{company_name}', 
        identify three tactical application channels (Triple Attack):
        
        1. Direct Apply: The likely application URL pattern.
        2. LinkedIn Referral: 2 realistic employee names/titles/URLs at this company in {role_type}.
        3. LinkedIn Easy Apply: A likely LinkedIn job posting URL.
        
        Return JSON ONLY:
        {{
          "direct_apply_url": "string",
          "linkedin_easy_apply_url": "string",
          "referral_contacts": [{{ "name": "string", "title": "string", "linkedin_url": "string" }}]
        }}
        """
        
        try:
            res = self._ai(prompt)
            data = json.loads(res.replace("```json","").replace("```","").strip())
            return data
        except:
            return {
                "direct_apply_url": f"https://{company_name.lower().replace(' ', '')}.com/careers",
                "linkedin_easy_apply_url": f"https://www.linkedin.com/jobs/search/?keywords={job_title.replace(' ', '%20')}",
                "referral_contacts": [
                    {"name": "Alex Rivera", "title": f"Senior {role_type} Manager", "linkedin_url": "https://linkedin.com/in/alexr"}
                ]
            }

    async def generate_cover_letter(self, company_name: str, job_title: str, resume_summary: str) -> str:
        """PRD Phase 4: Research-backed personalized cover letter."""
        if self.mock_mode:
            return f"Dear Hiring Manager at {company_name},\n\nI am writing to express my keen interest in the {job_title} position. My background aligns perfectly with your team's needs, and I am eager to contribute.\n\nSincerely,\n[Your Name]"

        prompt = f"""
        Write a 3-paragraph personalized cover letter for the {job_title} role at {company_name}.
        
        Candidate Context: {resume_summary[:1000]}
        
        Rules:
        1. NO generic templates.
        2. Reference {company_name}'s likely values or recent industry trends.
        3. Explain exactly why this candidate's specific background is a tactical fit.
        """
        return self._ai(prompt)

    async def generate_outreach_message(self, contact_name: str, candidate_summary: str, job_title: str) -> str:
        """Generates a personalized LinkedIn or email outreach message."""
        if self.mock_mode:
            return f"Hi {contact_name}, I noticed you're hiring for the {job_title} role. Given my background in React and Next.js, I'd love to connect and share how I can contribute to your team's success."
            
        prompt = f"Write a personalized LinkedIn DM to {contact_name} for the {job_title} position based on my resume: {candidate_summary}. Keep it under 300 characters."
        return self._ai(prompt)
