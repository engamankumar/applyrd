from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import asyncio
from typing import Dict, List
from ..agents.job_search_agent import JobSearchAgent
from ..agents.resume_agent import ResumeAgent
from ..agents.outreach_agent import OutreachAgent

class ReminderJob:
    def __init__(self, project_id: str, location: str):
        self.scheduler = AsyncIOScheduler()
        self.job_search = JobSearchAgent(project_id, location)
        self.resume_agent = ResumeAgent(project_id, location)
        self.outreach_agent = OutreachAgent(project_id, location)

    async def run_daily_briefing(self, user_preferences: Dict, resume_text: str):
        print(f"[{datetime.now()}] Starting Daily Briefing for user.")
        
        # 1. Search & Score
        jobs = await self.job_search.search_and_score(user_preferences, resume_text)
        top_matches = jobs[:3] # Focus on top 3
        
        # 2. Package Generator (Triple Attack)
        packages = []
        for job in top_matches:
            # - Tailor Resume logic (Call agent)
            # - Generate Cover Letter
            cl = await self.outreach_agent.generate_cover_letter(resume_text, job['jd'], job['company'])
            # - Find Contacts
            contacts = await self.outreach_agent.find_linkedin_contacts(job['company'], "Engineering")
            
            packages.append({
                "job": job,
                "cover_letter": cl,
                "contacts": contacts,
                "referral_msg": self.outreach_agent.get_referral_message_template(contacts[0]['name'] if contacts else "Recruiter", job['company'], job['title'])
            })
            
        # 3. Email sending logic (would involve Gmail wrapper or SendGrid)
        print(f"Briefing complete. Found {len(packages)} application packages.")
        return packages

    def schedule_daily(self, hour: int, minute: int, user_prefs: Dict, resume_text: str):
        self.scheduler.add_job(
            self.run_daily_briefing,
            'cron',
            hour=hour,
            minute=minute,
            args=[user_prefs, resume_text]
        )
        self.scheduler.start()
        print(f"Daily Briefing scheduled for {hour}:{minute}.")
