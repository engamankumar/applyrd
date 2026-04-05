# JobPilot Presentation Deck (Google Cloud Gen AI Academy)

## Slide 1: Title
**Headline:** JobPilot - Agentic Career Orchestration
**Subheadline:** Fully Automating the Job Search with Google Gemini & Model Context Protocol.
**Presenter:** [Your Name]

## Slide 2: The Problem
- **The Modern Job Search is Broken:** Candidates spend hours manually searching pages, rewriting resumes for ATS algorithms, and agonizing over cover letters.
- **Lost Opportunities:** Perfect-fit roles expire in days because candidates can't maintain a 24/7 monitoring loop.
- **The Missing Link:** Current platforms just *list* jobs. None of them *apply* intelligence directly to the user's specific career trajectory on autopilot.

## Slide 3: The Solution - JobPilot
- **Agentic Automation:** A suite of specialized AI Agents acting as a personalized 24/7 recruitment firm.
- **Intelligent Discovery:** Automatically scrapes new roles from the web matching exact constraints.
- **Zero-Touch Tailoring:** Google Gemini analyzes the job description and structurally rewrites the resume to guarantee a 90%+ ATS match before the user ever sees it.
- **Continuous Delivery:** Delivers a compiled HTML digest of top-scored roles straight to the candidate's inbox using Google's MCP.

## Slide 4: Google Cloud & Gemini Integration
- **Models Used:** Extensively utilizing `Gemini 3.1 Flash Lite` and `Gemini 1.5 Pro` via Google Vertex AI.
- **GenAI Resilience Flow:** Engineered a custom `config.py` cluster-ping system that queries the GCP stack at boot, dynamically selecting the fastest, unexhausted AI model to ensure 100% uptime regardless of API quota spikes.
- **Multi-Agent Orchestration:** Deployed specialized parallel agents (Job Search Agent, Resume Agent, Skill Gap Agent) that orchestrate extremely complex web scraping and scoring logic entirely on Gemini's processing capabilities.

## Slide 5: The Model Context Protocol (MCP)
- Integration of the **Gmail MCP Server**.
- Instead of using direct rigid APIs, the Python FastAPI orchestrator uses standard MCP IO to connect into a localized daemon.
- This allows the `APScheduler` cron executor to seamlessly hand compiled data to the MCP agent, preserving security boundaries while enabling real-world action (sending emails directly to the user on autopilot).

## Slide 6: The Architecture
- **Frontend Container:** Next.js (App Router), Tailwind CSS, NextAuth, Prisma.
- **Backend Container:** Python 3, FastAPI, Uvicorn, APScheduler.
- **Deployment:** Containerized into Docker and automatically managed via auto-scaling Google Cloud Run instances. 

## Slide 7: What's Next?
- **Inbox Recruiter Monitoring:** Expanding the MCP agent to actively read recruiter emails and generate draft replies.
- **Live Interview Simulation:** Implementing Gemini Voice for real-time prep environments. 

## Slide 8: Thank You
- **GitHub:** `github.com/engamankumar/applyrd`
- **GCP Deployed Link:** `[Link]`
