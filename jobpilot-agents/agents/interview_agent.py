import json
from typing import List, Dict, Optional
from vertexai.generative_models import GenerativeModel
import vertexai

class InterviewAgent:
    def __init__(self, project_id: str, location: str, client=None):
        self.project_id = project_id
        self.location = location
        self.client = client
        self.models_to_try = [
            "models/gemini-3.1-flash-lite-preview",
            "models/gemini-3-flash-preview",
            "models/gemini-2.5-flash-lite",
            "models/gemini-2.0-flash-lite-001",
            "models/gemini-2.0-flash",
            "models/gemini-1.5-flash",
            "models/gemini-pro-latest"
        ]

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
                print(f"⚠️ [InterviewAgent] fallback error with {m_id}: {str(e)[:100]}")
        return ""

    async def generate_prep_guide(self, company: str, job_title: str) -> Dict:
        """Collects company info and generates a specific prep guide."""
        prompt = f"""
        Act as an Executive Recruiter. Generate a 2-step preparation guide for a {job_title} role at {company}.
        
        Return JSON:
        {{
            "company_news": ["Recent headline 1", "Market trend 2"],
            "probable_questions": [
                {{"q": "Question 1", "type": "Behavioral", "reason": "Reason for asking"}},
                {{"q": "Question 2", "type": "Technical", "reason": "Reason for asking"}}
            ],
            "win_strategy": "One paragraph strategy for the job."
        }}
        """
        try:
            response_text = await self._generate(prompt)
            return json.loads(response_text.replace('```json', "").replace('```', '').strip())
        except:
            return {
                "company_news": ["Significant expansion into AI infrastructure.", "New leadership in backend excellence."],
                "probable_questions": [
                    {"q": "Tell me about your experience scaling distributed systems.", "type": "Technical", "reason": "Crucial for this seniority."},
                    {"q": "How do you handle cross-team conflict during tight deadlines?", "type": "Behavioral", "reason": "Tests team alignment."}
                ]
            }

class MockInterviewSession:
    """Handles logic for a multi-turn conversation simulation."""
    def __init__(self, agent: InterviewAgent, total_questions: int = 5):
        self.agent = agent
        self.history = []
        self.total_questions = total_questions

    async def get_next_question(self, turn: int, user_input: Optional[str] = None, job_title: str = "Engineer", company_name: str = "Stripe", job_description: str = "") -> Dict:
        """Generates the next interview question based on history and provides feedback on previous response."""
        
        prompt = f"""
        Role: Senior Recruiter at {company_name}
        Interviewing for: {job_title}
        Job Description Context: {job_description if job_description else "N/A"}
        Session History: {json.dumps(self.history)}
        User's Last Answer (to analyze): {user_input if user_input else "N/A"}
        
        Rules:
        1. If user_input is present, provide 1-2 sentences of specific feedback/coaching on that answer.
        2. Ask EXACTLY ONE situational, technical or behavioral question for the {job_title} role, heavily informed by the Job Description if provided.
        3. Make the question challenging and role-specific.
        
        Return JSON ONLY:
        {{
            "feedback": "Short feedback on previous answer (empty if turn 0)",
            "question": "The next interview question",
            "question_number": {turn + 1},
            "total_questions": 5
        }}
        """
        response_text = await self.agent._generate(prompt)
        try:
            cleaned = response_text.replace('```json', "").replace('```', '').strip()
            return json.loads(cleaned)
        except:
            return {
                "feedback": "Good start. Let's dig deeper." if turn > 0 else "",
                "question": "Tell me about a complex technical challenge you solved recently." if turn == 0 else "How do you handle conflict in a team?",
                "question_number": turn + 1,
                "total_questions": 5
            }

    async def evaluate_session(self, history: List[Dict], job_title: str = "Engineer", company_name: str = "Stripe") -> Dict:
        """At end of interview (e.g. 5 turns), provide full score and feedback."""
        prompt = f"""
        Analyze the full interview transcript for a {job_title} role at {company_name}.
        History: {json.dumps(history)}
        
        Provide a professional evaluation.
        
        Return JSON ONLY:
        {{
            "overall_score": 0-100,
            "strengths": ["list of 3 strengths"],
            "improvements": ["list of 3 areas to improve"],
            "summary": "One paragraph executive summary of the performance."
        }}
        """
        response_text = await self.agent._generate(prompt)
        try:
            cleaned = response_text.replace('```json', "").replace('```', '').strip()
            return json.loads(cleaned)
        except:
            return {
                "overall_score": 75,
                "strengths": ["Strong communication", "Technical depth"],
                "improvements": ["STAR structure", "Action-oriented results"],
                "summary": "A solid performance overall with clear evidence of technical skill, though behavioral answers could be more structured."
            }
