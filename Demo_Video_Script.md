# JobPilot - 2-Minute Demo Video Script

**[0:00 - 0:15] Introduction (Screen: Beautiful Dashboard Overview)**
"Hi, welcome to JobPilot. JobPilot completely automates the modern job search. Utilizing an entire suite of Google Gemini agents and the Model Context Protocol, we've built a platform that searches, tailors, and applies for you while you sleep."

**[0:15 - 0:40] Agentic Infrastructure (Screen: Visualizing the Agent Status array)**
"Behind this Next.js frontend is a cluster of Vertex AI models. When the system boots, our orchestration script queries Vertex AI to locate the fastest, quota-available model—like Gemini Flash Lite—ensuring zero downtime in our pipelines."

**[0:40 - 1:10] The ATS Tailoring (Screen: Job Detail Page / Tailor Resume Tab)**
"Here is where the magic happens. Our Job Search Agent discovers an exact match. But instead of just linking it to you, our Resume Agent cross-references the Job Description with your profile, and structurally rewrites your resume using Gemini, guaranteeing an incredible ATS match score right before your eyes."

**[1:10 - 1:40] MCP Action (Screen: Settings Page -> Displaying the Daily Sweep trigger / Fake Inbox)**
"But JobPilot doesn't stop at the UI. Using Google's Model Context Protocol (MCP), our Python APScheduler operates autonomously in the background. If you set your sweep time to 9 AM, it processes thousands of background logic steps and then calls our Gmail MCP Server to actively deliver a compiled, premium HTML digest of newly discovered, perfectly tailored roles straight into your actual email inbox."

**[1:40 - 2:00] Conclusion (Screen: Upgraded Roadmap & Gap Analysis View)**
"Beyond applying, our Skill Gap Agent actively graphs your career trajectory to recommend exactly what technologies you need to learn. JobPilot is the ultimate autonomous career orchestrator."
