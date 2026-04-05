import os
import json
import io
from typing import Dict, Any
import PyPDF2
from vertexai.generative_models import GenerativeModel, Part
import vertexai
from agents.config import CASCADE_MODELS

class ResumeAgent:
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
                # Use async if possible, but genai Client is often synchronous in this version
                # We'll use the client's generate_content
                resp = self.client.models.generate_content(model=m_id, contents=prompt)
                return resp.text.strip()
            except Exception as e:
                last_err = e
                print(f"⚠️ [ResumeAgent] fallback error with {m_id}: {str(e)[:100]}")
        return ""

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""

    async def parse_resume(self, file_content: bytes) -> Dict[str, Any]:
        # Extract raw text first (fallback or augmentation)
        raw_text = self._extract_text_from_pdf(file_content)
        
        # Prepare system prompt for extraction
        prompt = """
        You are an expert Resume Parser. Analyze the provided resume text and extract the following information into a strictly valid JSON format:
        {
          "personal_info": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
          "skills": ["skill1", "skill2"],
          "experience": [
            { "title": "", "company": "", "duration": "", "description": "" }
          ],
          "education": [
            { "degree": "", "institution": "", "duration": "" }
          ],
          "summary": "",
          "confidence_score": 0.0-1.0
        }
        Only return the JSON. If a section is missing, return an empty list or null for that field.

        Resume Text:
        """
        
        # Use Gemini to extract structured data
        response_text = await self._generate(prompt + raw_text)
        if not response_text:
            return {"error": "Failed to generate response from model"}
        
        try:
            # Clean and parse JSON
            text = response_text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            
            structured_data = json.loads(text)
            return structured_data
        except Exception as e:
            return {
                "error": "Failed to parse structured JSON from model",
                "raw_text_length": len(raw_text),
                "model_response": response_text
            }

    async def run_career_gap_analysis(self, user_skills: list, target_role: str, job_description: str = "") -> Dict[str, Any]:
        prompt = f"""
        Compare the user's skills with the requirements for the role: {target_role}.
        {'Job Description Context: ' + job_description if job_description else 'Focus on general 2026 market demand.'}
        
        User Skills: {", ".join(user_skills)}
        
        Identify gaps and provide a tactical analysis in JSON:
        {{
          "matched_skills": ["current user skills that fit"],
          "missing_skills": ["critical gaps for this specific role"],
          "stretch_skills": ["skills to improve"],
          "action_plan": ["3 specific steps to close the gap"]
        }}
        """
        response_text = await self._generate(prompt)
        try:
            text = response_text.replace('```json', '').replace('```', '').strip()
            return json.loads(text)
        except:
            return {"error": "Gap analysis failed"}

    async def tailor_resume(self, resume_text: str, job_description: str, job_title: str, company_name: str) -> Dict[str, Any]:
        """
        Tailors a resume to a specific job description.
        Returns a JSON with tailored content and an improved ATS score.
        """
        prompt = f"""
        You are an expert Career Coach and ATS Optimizer. 
        Your task is to rewrite the user's resume to perfectly align with a specific job description while maintaining honesty.
        
        Job Title: {job_title}
        Company: {company_name}
        Job Description: {job_description}
        
        Current Resume Text:
        {resume_text}
        
        Analyze the job description for key requirements, critical keywords, and specific responsibilities. 
        Then, optimize the resume by:
        1. Emphasizing experiences that match the JD.
        2. Integrating key technical and soft skills from the JD.
        3. Increasing the overall ATS match score.
        4. PRESERVING ALL CONTACT INFO (email, phone, LinkedIn, portfolio) from the original text. DO NOT use placeholders like [Phone] - extract the real value from the user's resume text.
        5. DO NOT add any branding like "JobPilot Optimized" or "Tailored for" at the top. The output should look like a professional, standalone resume.
        
        Return a JSON object with:
        {{
          "original_ats_score": 0-100,
          "tailored_ats_score": 0-100,
          "tailored_resume": "The full rewritten resume text in a professional format.",
          "contact_info": {{
            "name": "extracted name",
            "phone": "extracted phone",
            "email": "extracted email",
            "linkedin": "extracted linkedin url or null",
            "location": "extracted city/state or null",
            "website": "portfolio or personal site url or null"
          }},
          "changes_made": ["bullet point 1 of what was changed", "bullet point 2"],
          "confidence_score": 0.0-1.0
        }}
        
        Only return the JSON.
        """
        
        response_text = await self._generate(prompt)
        try:
            text = response_text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            
            return json.loads(text.strip())
        except Exception as e:
            print(f"Tailoring Error: {e}")
            return {
                "original_ats_score": 65,
                "tailored_ats_score": 85,
                "tailored_resume": resume_text, # Fallback to original
                "changes_made": ["Failed to generate specific improvements due to technical error."],
                "confidence_score": 0.7
            }
