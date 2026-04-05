# 🚀 JobPilot — Agentic Career Orchestration

JobPilot is a next-generation, AI-driven career orchestration platform designed to fully automate the modern job search. Unlike traditional job boards, JobPilot utilizes an autonomous **Agentic Backend** paired with a beautiful **Next.js frontend** to actively discover jobs, tailor your resume to ATS parsers in real-time, generate highly targeted cover letters, and dispatch email alerts to your inbox using the Model Context Protocol (MCP).

---

## 🌟 Core Features

- **Dynamic Job Discovery**: Automatically scrapes and synthesizes jobs across platforms using RapidAPI and Gemini Fallback APIs.
- **Smart ATS Resume Tailoring**: Analyzes Job Descriptions (JDs) and structurally rewrites your resume using `Gemini 3.1 Flash Lite` to maximize ATS match scores.
- **Agentic Email Notifications**: An `APScheduler` cron orchestrator silently runs in the background, matching live job constraints to user preferences and dispatching daily HTML emails directly to your Gmail.
- **Intelligent Fallbacks**: From auto-fanning Google career searches when dead URLs are hit to hot-swapping AI models that deplete quota, JobPilot is deeply resilient.
- **Gap Analysis & Roadmaps**: Analyzes technical career trajectories, creating step-by-step upskilling roadmaps tailored exactly to missing industry skills.
- **Premium Dashboard**: A beautifully designed, glassmorphic UI built in Next.js, featuring micro-animations, Kanban pipeline tracking, and live agent status monitors.

---

## 🏗️ Architecture Setup

JobPilot operates on a **Monorepo Architecture** split into two primary orchestration layers.

### 1. The Frontend (`/jobpilot-web`)
Built on **Next.js (App Router)** and **Tailwind CSS**. It utilizes Prisma for database ORM and NextAuth for secure Google OAuth2 login flows.

### 2. The Backend (`/jobpilot-agents`)
Built on **FastAPI** and **Python 3**. This houses the autonomous `CoordinatorAgent` and specialized sub-agents (`ResumeAgent`, `JobSearchAgent`, etc.) powered by Google Vertex AI / GenAI SDKs.

---

## ⚙️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL Database (e.g., Supabase or local pg)

### Setting up the Database
1. Navigate into the web director: `cd jobpilot-web`
2. Run database push via Prisma: `npx prisma db push`

### Starting the Agentic Backend
1. Open a terminal and navigate to: `cd jobpilot-agents`
2. Create your virtual environment: `python3 -m venv venv`
3. Activate it:
   - Mac/Linux: `source venv/bin/activate`
   - Windows: `.\venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file in `jobpilot-agents` mirroring your keys:
   ```env
   # PostgreSQL URL (MUST use psycopg2 format, remove ?schema if present)
   DATABASE_URL="postgresql://user:pass@host:port/db_name"
   GEMINI_API_KEY="your_google_ai_studio_key"
   RAPIDAPI_KEY="your_rapidapi_jsearch_key"
   ```
6. Start the FastAPI orchestrator: 
   ```bash
   uvicorn api.main:app --reload
   ```
   *(Ensure you see 🚀 [Config] Successfully locked system model in the console)*

### Starting the Web UI
1. Open a separate terminal and navigate to: `cd jobpilot-web`
2. Install NodeJS packages: `npm install`
3. Create a `.env` file in `jobpilot-web`:
   ```env
   DATABASE_URL="postgresql://user:pass@host:port/db_name?schema=public"
   AUTH_SECRET="random_32_character_string"
   AUTH_GOOGLE_ID="google_oauth_client_id"
   AUTH_GOOGLE_SECRET="google_oauth_client_secret"
   NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:3000` to access the JobPilot Dashboard.

---

## 🤝 Contributing
Contributions are welcome. Please ensure that when expanding AI Agents in the Python server, you utilize the `config.py` dynamic modeling functions to maintain high-availability against quota limits.

## 📝 License
Proprietary / Under Beta Development.
