from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import httpx
import asyncio
from dotenv import load_dotenv
from typing import List, Dict, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta, timezone

from .models import ResumeParseRequest, JobSearchRequest, AgentResponse
from agents.coordinator import CoordinatorAgent
from agents.skill_gap_agent import SkillGapAgent, GoogleSkillsAgent
from agents.interview_agent import InterviewAgent, MockInterviewSession
from agents.job_search_agent import JobSearchAgent
from agents.resume_agent import ResumeAgent
from agents.inbox_agent import InboxAgent
from agents.mcp_client import call_gmail_mcp
import uuid
import httpx

# ── Configuration ──────────────────────────────────────────────────────────────
# Force load from .env file explicitly to avoid shell env issues
from dotenv import load_dotenv as _ld
_ld(os.path.join(os.path.dirname(__file__), ".env"))
_ld(os.path.join(os.getcwd(), ".env"))

def log(msg):
    with open("server.log", "a") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
        f.flush()
    print(msg, flush=True)

log("🚀 [Server Reload] Initializing...")
log("DEBUG: Root imports complete")

# ── Persistent Scheduler Initialization (Hybrid Mode) ──────────────────────────
log("DEBUG: Loading JobStores...")
try:
    from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
    from apscheduler.jobstores.memory import MemoryJobStore
    log("DEBUG: JobStores loaded.")
except Exception as e:
    log(f"❌ [DEBUG ERROR] Failed to load JobStores: {e}")

def build_db_jobstore():
    """Bulletproof SQLAlchemy Engine Creator for Cloud SQL Unix Sockets"""
    from sqlalchemy import create_engine
    raw = os.getenv("DATABASE_URL", "sqlite:///jobs.sqlite")
    
    if "host=/cloudsql/" in raw:
        import urllib.parse
        parsed = urllib.parse.urlparse(raw)
        params = urllib.parse.parse_qs(parsed.query)
        socket_path = params.get("host", [os.getenv("CLOUD_SQL_CONNECTION_NAME", "/cloudsql/applyrd-ai:europe-west1:jobpilot-db")])[0]
        
        # Format for SQLAlchemy with Unix Sockets
        # postgresql+psycopg2://user:password@/dbname?host=/path/to/socket
        # Use v2 table to bypass corrupted existing data!
        return SQLAlchemyJobStore(
            url=f"postgresql+psycopg2://{parsed.username}:{parsed.password}@/{parsed.path.lstrip('/')}?host={socket_path}",
            tablename='apscheduler_jobs_v2'
        )
    
    return SQLAlchemyJobStore(
        # Strip ?schema=... if present to avoid psycopg2.ProgrammingError
        url=raw.replace("postgresql://", "postgresql+psycopg2://").split("?")[0],
        tablename='apscheduler_jobs_v2'
    )

def init_scheduler():
    stores = {'default': MemoryJobStore()} # System tasks (sweeps)
    if os.getenv("DATABASE_URL"):
        try:
            stores['persistent'] = build_db_jobstore() # User tasks (emails)
            log("✅ [Scheduler] Persistent Hybrid Store configured.")
        except Exception as e:
            log(f"⚠️ [Scheduler] Persistent Store failed ({e}). Falling back to full memory.")
    
    return AsyncIOScheduler(jobstores=stores)

# GLOBAL PLACEHOLDER - ACTUAL INIT IN LIFESPAN
scheduler = None


PROJECT_ID = os.getenv("VERTEX_AI_PROJECT_ID", "your-project-id")
LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_ADK_API_KEY") or ""

# ── Gemini Client Initialization (Executed at import for reliability) ────────
gemini_client = None
MOCK_MODE = True
coordinator = None
skill_gap_agent = None
google_skills_agent = None
interview_agent = None
job_search_agent_instance = None

try:
    from google import genai as gai
    if GEMINI_API_KEY and GEMINI_API_KEY not in ("", "your-api-key"):
        gemini_client = gai.Client(api_key=GEMINI_API_KEY)
        # Skip probe, go optimistic if a key is present
        MOCK_MODE = False
        log("✅ [Startup] Gemini API Key found — Dynamic Live Mode enabled.")
    else:
        MOCK_MODE = True
        log("⚠️ [Startup] No API key found — MOCK MODE enabled.")
except Exception as e:
    MOCK_MODE = True
    log(f"❌ [Startup] Gemini core initialization error: {e}")

# Global Agent Instances (Initialized later to avoid import hangs)
coordinator = None
skill_gap_agent = None
google_skills_agent = None
interview_agent = None
job_search_agent_instance = None
resume_agent_instance = None
inbox_agent = None
interview_sessions = {}
inbox_sync_locks = {}
last_sweep_locks = {} # In-memory lock to prevent duplicate daily sweeps in the same minute
_GETTING_AGENTS = False

def get_agents():
    """Lazy initializer for agents to prevent top-level network blocks."""
    global coordinator, skill_gap_agent, google_skills_agent, interview_agent, job_search_agent_instance, resume_agent_instance, inbox_agent, _GETTING_AGENTS
    if coordinator or _GETTING_AGENTS: return
    
    _GETTING_AGENTS = True
    try:
        print("🧩 [Agents] Starting Lazy Initialization...", flush=True)
        coordinator = CoordinatorAgent(gemini_client, MOCK_MODE)
        print("🧩 [Agents] Coordinator ready.", flush=True)
        skill_gap_agent = SkillGapAgent(PROJECT_ID, LOCATION, client=gemini_client)
        print("🧩 [Agents] SkillGap ready.", flush=True)
        google_skills_agent = GoogleSkillsAgent(client=gemini_client)
        print("🧩 [Agents] GoogleSkills ready.", flush=True)
        interview_agent = InterviewAgent(PROJECT_ID, LOCATION, client=gemini_client)
        print("🧩 [Agents] Interview ready.", flush=True)
        job_search_agent_instance = JobSearchAgent(PROJECT_ID, LOCATION, client=gemini_client)
        print("🧩 [Agents] JobSearch ready.", flush=True)
        resume_agent_instance = ResumeAgent(PROJECT_ID, LOCATION, client=gemini_client)
        print("🧩 [Agents] Resume ready.", flush=True)
        inbox_agent = InboxAgent(client=gemini_client)
        print("🧩 [Agents] All instances initialized.", flush=True)
    finally:
        _GETTING_AGENTS = False

def ai(prompt: str) -> str:
    """Helper to call Gemini or return a placeholder in mock mode."""
    if gemini_client is None:
        return "__MOCK__"
    
    get_agents()
    
    from agents.config import get_active_model, CASCADE_MODELS
    active = get_active_model()
    models_to_try = [active] + [m for m in CASCADE_MODELS if m != active]
    
    last_err = None
    for m_id in models_to_try:
        try:
            resp = gemini_client.models.generate_content(model=m_id, contents=prompt)
            # If successful, remember this works
            os.environ["GEMINI_MODEL_ID"] = m_id
            return resp.text.strip()
        except Exception as e:
            last_err = e
            log(f"⚠️ ai() error with {m_id}: {str(e)[:100]}...")
            if "RESOURCE_EXHAUSTED" not in str(e).upper():
                # If it's not a quota error, it might be a prompt error, so don't try others if you want, 
                # but for safety, we'll try the next one anyway.
                pass
                
    log(f"❌ ai() exhausted all models. Last Error: {last_err}")
    # Return a structural mock JSON so the caller doesn't break
    return json.dumps({
        "skills": ["AI Quota Exhausted", "Falling back to Mock", "Check .env key"],
        "experience": [{"role": "System Admin", "company": "Quota Manager", "duration": "Lifetime"}],
        "education": [{"degree": "B.S. in Reliability", "institution": "Fallback University", "year": "2024"}]
    })

import psycopg2
from psycopg2.extras import RealDictCursor

# ── Master Database Connector ──────────────────────────────────────────────────
def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url: return None
    
    try:
        import urllib.parse
        # If Cloud SQL socket is provided as a query param, try it first
        if "host=/cloudsql/" in db_url:
            parsed = urllib.parse.urlparse(db_url)
            params = urllib.parse.parse_qs(parsed.query)
            socket_path = params.get("host", [None])[0]
            
            return psycopg2.connect(
                dbname=parsed.path.lstrip('/'),
                user=parsed.username,
                password=parsed.password,
                host=socket_path,
                cursor_factory=RealDictCursor,
                connect_timeout=3 # Fast fail for socket!
            )
        else:
            # Strip query params like ?schema=public which psycopg2 doesn't like
            clean_url = db_url.split("?")[0] if "?" in db_url else db_url
            return psycopg2.connect(clean_url, cursor_factory=RealDictCursor, connect_timeout=3)
    except Exception as e:
        log(f"❌ [DB Connection Error] {e}")
        return None

# ── Dynamic Agentic Scheduler ──────────────────────────────────────────────────
async def agentic_schedule_executor():
    """
    Every minute, check which users need a daily sweep and execute it.
    """
    get_agents()
    log_quiet = lambda msg: open("server.log", "a").write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    log_quiet(f"💓 [Agentic Heartbeat] Checking for schedules...")
    
    # ABSOLUTE TIME MATCH: Force IST for comparison since Cloud Run is UTC
    from datetime import timezone
    # IST is UTC + 5:30
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    now_hour = ist_now.strftime("%H:%M")
    
    try:
        conn = get_db_connection()
        if not conn: return
        cur = conn.cursor()
        
        # Select users who have reached their briefing time
        cur.execute("""
            SELECT id, email, preferred_roles, location_preference, reminder_time, refresh_token 
            FROM "User" 
            WHERE reminder_time = %s
        """, (now_hour,)) # note: we usually join on emails elsewhere so we'll leave this query for time matching specifically
        
        users_to_update = cur.fetchall()
        cur.close()
        conn.close()
        
        if not users_to_update:
            return

        print(f"💓 [Agentic Heartbeat] {now_hour} - Found {len(users_to_update)} users to sweep.")
        
        for user in users_to_update:
            # Prevent duplicate sweeps in the same minute if server is busy/restarts
            # PERSISTENT LOCK: Check DB instead of just memory
            lock_key = f"{user['id']}_{now_hour}"
            today_date = datetime.now().strftime("%Y-%m-%d")
            
            # Check Memory first for speed
            if last_sweep_locks.get(lock_key) == today_date:
                continue
                
            # Check DB for absolute persistence across restarts
            try:
                conn_check = get_db_connection()
                if conn_check:
                    cur_check = conn_check.cursor()
                    # Check if a sweep was already sent TODAY for this user
                    cur_check.execute('''
                        SELECT id FROM "Reminder" 
                        WHERE user_id = %s AND type = 'daily_sweep_digest' 
                        AND scheduled_at::date = CURRENT_DATE
                    ''', (user['id'],))
                    if cur_check.fetchone():
                        # Mark in memory to stop checking DB for this minute
                        last_sweep_locks[lock_key] = today_date
                        cur_check.close()
                        conn_check.close()
                        continue
                    cur_check.close()
                    conn_check.close()
            except: pass

            last_sweep_locks[lock_key] = today_date
            
            print(f"🔍 [Scheduler] Triggering for: {user['email']} (Token Presence: {'YES' if user.get('refresh_token') else 'NO'})")
            # 1. Revitalize the Access Token from Refresh Token if available
            live_token = None
            if user.get('refresh_token'):
                try:
                    import requests
                    token_url = "https://oauth2.googleapis.com/token"
                    payload = {
                        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                        "refresh_token": user['refresh_token'],
                        "grant_type": "refresh_token"
                    }
                    token_res = requests.post(token_url, data=payload).json()
                    live_token = token_res.get("access_token")
                    if live_token:
                        print(f"🔑 [Scheduler] Successfully refreshed Oauth2 token for {user['email']}")
                except Exception as ex:
                    print(f"⚠️ [Scheduler] Oauth2 Token Refresh failed for {user['email']}: {ex}")

            role = user['preferred_roles'][0] if user['preferred_roles'] else "Software Engineer"
            prefs = {
                "preferred_roles": [role],
                "location_preference": user['location_preference'] or "Remote"
            }
            # 2. Trigger the Sweep (This will send the digest if it's the scheduled time)
            try:
                # RECORD the sweep in DB BEFORE firing to avoid race conditions
                conn_lock = get_db_connection()
                if conn_lock:
                    cur_lock = conn_lock.cursor()
                    cur_lock.execute('''
                        INSERT INTO "Reminder" (id, user_id, type, scheduled_at, created_at)
                        VALUES (%s, %s, 'daily_sweep_digest', NOW(), NOW())
                    ''', (str(uuid.uuid4()), user['id']))
                    conn_lock.commit()
                    cur_lock.close()
                    conn_lock.close()

                await daily_sweep({
                    "user_email": user['email'],
                    "user_id": user['id'],
                    "preferences": prefs,
                    "access_token": live_token # Passing REAL token for background send!
                }, silent=True) # NEVER SEND EMAILS FROM BACKGROUND HEARTBEAT
            except Exception as sweeperr:
                log(f"❌ [Scheduler Error] {user['email']}: {sweeperr}")
            
            # TRIGGER INBOX SYNC: Check for responses every heartbeat for active users!
            if live_token:
                await sync_gmail_inbox(user['id'], user['email'], live_token, silent=True)
            
    except Exception as e:
        print(f"❌ [Scheduler Error] {e}")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [Lifespan] Starting...", flush=True)
    db_url = os.getenv("DATABASE_URL")
    
    # 2. Lazy Initialization: Create the scheduler
    global scheduler
    try:
        scheduler = init_scheduler()
        scheduler.start()
        print("🚀 [Lifespan] Scheduler Online", flush=True)
    except Exception as e:
        print(f"❌ [Lifespan Error] Scheduler failed: {e}", flush=True)
    
    # NEW: Smart Per-User Scheduling!
    conn = get_db_connection()
    if conn:
        cur = conn.cursor()
        cur.execute('SELECT id, email, reminder_time FROM "User" WHERE reminder_time IS NOT NULL')
        users = cur.fetchall()
        for user in users:
            try:
                # Format: "HH:MM" -> hour=H, minute=M
                h, m = map(int, user['reminder_time'].split(':'))
                # Create a persistent CRON job for this exact user!
                scheduler.add_job(
                    daily_sweep, 
                    'cron', 
                    hour=h, 
                    minute=m, 
                    id=f"briefing_{user['id']}",
                    args=[{"user_id": user['id'], "user_email": user['email']}],
                    replace_existing=True,
                    misfire_grace_time=3600 # Catch up if server was down!
                )
                log(f"⏰ [Scheduler] Registered briefing for {user['email']} at {user['reminder_time']} IST.")
            except Exception as e:
                log(f"⚠️ [Scheduler] Could not register briefing for {user['email']}: {e}")
        cur.close()
        conn.close()
    
    # Keep Global Sync but set to a longer interval since we have per-user cron now
    scheduler.add_job(
        global_inbox_sync_executor,
        'interval',
        hours=6,
        id='global_inbox_sync',
        replace_existing=True,
        next_run_time=datetime.now() + timedelta(hours=6)
    )
    log("🕒 [Agentic Startup] Smart Scheduling Online (Per-User Cron & Global Sync active).")
    
    yield
    try:
        scheduler.shutdown()
    except:
        pass

# ACTUAL APP OBJECT (Lifespan attached)
app = FastAPI(title="JobPilot Agent Service", version="1.0.0", lifespan=lifespan)

@app.get("/agent/diagnostic")
async def diagnostic():
    """
    Diagnostic endpoint to check scheduler health and DB synchronization.
    """
    report = {
        "status": "healthy",
        "time_utc": datetime.now().strftime("%H:%M:%S"),
        "timezone_offset": "+05:30",
        "ist_time": (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).strftime("%H:%M:%S"),
        "scheduler_running": scheduler.running if scheduler else False,
        "jobs": []
    }
    
    if scheduler:
        for job in scheduler.get_jobs():
            report["jobs"].append({
                "id": job.id,
                "next_run": str(job.next_run_time),
                "trigger": str(job.trigger)
            })
            
    # Check DB schedules
    try:
        from psycopg2.extras import RealDictCursor
        conn = get_db_connection()
        if conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT email, reminder_time FROM \"User\" WHERE reminder_time IS NOT NULL LIMIT 10")
            rows = cur.fetchall()
            report["db_schedules"] = [
                {"email": r["email"], "reminder_time": str(r["reminder_time"])} 
                for r in rows
            ]
            cur.close()
            conn.close()
    except Exception as e:
        report["db_error"] = str(e)
    return report

log("🚀🚀🚀 [REVISION 30] JOBPILOT AGENT ENGINE IS LIVE AND AWAKE! 🚀🚀🚀")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.get("/agent/heartbeat")
async def heartbeat():
    """Manual trigger to wake up the scheduler and process missed alerts!"""
    log("💓 [Manual Heartbeat] Waking up the agent engine...")
    await agentic_schedule_executor()
    return {"status": "success", "message": "Heartbeat triggered. Checking for notifications now!"}

@app.delete("/agent/reset-jobs")
async def reset_jobs(email: str = Query(...)):
    """
    Clears all jobs and applications for a specific user to allow a fresh start.
    """
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database connection failed."}
        
        cur = conn.cursor()
        # Find user
        cur.execute('SELECT id FROM "User" WHERE email = %s', (email,))
        user = cur.fetchone()
        if not user:
            cur.close()
            conn.close()
            return {"status": "error", "message": "User not found."}
        
        user_id = user['id']
        
        # Delete related Applications first (ForeignKey constraint)
        cur.execute('DELETE FROM "Application" WHERE user_id = %s', (user_id,))
        
        # Delete Jobs
        cur.execute('DELETE FROM "Job" WHERE user_id = %s', (user_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        log(f"🧹 [Reset] Cleared all data for {email}")
        return {"status": "success", "message": f"Successfully cleared all jobs for {email}. Your pipeline is empty and ready for a fresh start!"}
            
    except Exception as e:
        log(f"❌ [Reset Error] {e}")
        return {"status": "error", "message": str(e)}

@app.get("/agent/force-sweep")
async def force_sweep(background_tasks: BackgroundTasks, email: str = "mamankumar333@gmail.com", token: Optional[str] = None):
    """Trigger the COMPLETE AI engine: Inbox Sync + Job Search!"""
    log(f"🚀 [Force Sweep] Triggering immediate engine for {email}...")
    
    try:
        conn = get_db_connection()
        if not conn: 
            return {"status": "error", "message": "Database unreachable."}
            
        cur = conn.cursor()
        query = "SELECT * FROM \"User\" WHERE LOWER(email) = LOWER(%s)"
        cur.execute(query, (email,))
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return {"status": "error", "message": f"User {email} not found."}
            
        # Use provided token or fall back to DB stored refresh_token
        r_token = token or user.get('refresh_token') or user.get('access_token')
        
        if not r_token:
            cur.close()
            conn.close()
            return {"status": "error", "message": "No OAuth token found or provided. Please log in first."}

        # 1. Trigger Inbox Sync (AWAITED so manual sweep shows data immediately)
        # SILENT MODE: No emails will be sent during this manual user trigger!
        await sync_gmail_inbox(user['id'], user['email'], r_token, silent=True)
        
        cur.close()
        conn.close()
        
        log(f"✅ [Force Sweep] Inbox Sync initiated for {email} (SILENT)")
        return {
            "status": "success", 
            "message": f"🚀 Inbox Sync Activated for {email}! Scanning your Gmail for new applications and updates..."
        }
            
    except Exception as e:
        log(f"❌ [Force Sweep Error] {e}")
        return {"status": "error", "message": str(e)}

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "mode": "mock" if MOCK_MODE else "live", 
        "model": os.environ.get("GEMINI_MODEL_ID", "none"),
        "key_present": bool(GEMINI_API_KEY),
        "key_prefix": GEMINI_API_KEY[:6] + "..." if GEMINI_API_KEY else "none"
    }

@app.post("/agent/orchestrate")
async def orchestrate(request: Dict):
    user_msg = request.get("message", "")
    context = request.get("context", {})
    user_email = request.get("user_email") or context.get("email")
    log(f"🧠 [Orchestrate] Request from {user_email} for: {user_msg}")
    
    plan_data = await coordinator.get_plan(user_msg, context)
    steps = plan_data.get("plan", [])
    results = []
    
    # Pre-fetch resume if we have an email
    resume_text = ""
    if user_email:
        db_url_raw = os.getenv("DATABASE_URL", "")
        db_url = db_url_raw.split("?")[0] if "?" in db_url_raw else db_url_raw
        if db_url:
            try:
                conn = get_db_connection()
                if not conn: return
                cur = conn.cursor()
                cur.execute('SELECT id FROM "User" WHERE email = %s', (user_email,))
                u_row = cur.fetchone()
                if u_row:
                    log(f"🔍 [Orchestrate] Found user {u_row['id']}. Fetching active resume...")
                    cur.execute(
                        'SELECT parsed_skills, parsed_experience FROM "Resume" WHERE user_id = %s AND is_active = TRUE LIMIT 1',
                        (u_row['id'],)
                    )
                    row = cur.fetchone()
                    if row:
                        parts = []
                        if row.get('parsed_skills'): parts.append(f"Skills: {', '.join(row['parsed_skills'])}")
                        if row.get('parsed_experience'): parts.append(f"Experience: {json.dumps(row['parsed_experience'])}")
                        resume_text = "\n\n".join(parts)
                        log(f"✅ [Orchestrate] Resume loaded ({len(resume_text)} chars)")
                    else:
                        log(f"⚠️ [Orchestrate] No active resume found for user {u_row['id']}")
                else:
                    log(f"⚠️ [Orchestrate] User not found for email {user_email}")
                cur.close()
                conn.close()
            except Exception as e:
                log(f"❌ [Orchestrate] DB Error: {e}")

    for step in steps:
        agent = step.get("agent")
        if agent == "job_search_agent":
            prefs = context.get("preferences", {})
            job_data = await search_jobs(JobSearchRequest(preferences=prefs), resume_text=resume_text)
            results.append({"agent": agent, "data": job_data.get("jobs")})
        elif agent == "resume_agent":
            tailored = await tailor_resume({
                "job_title": context.get("preferences", {}).get("role", "Software Engineer"),
                "company_name": "Target Co",
                "resume_text": resume_text
            })
            results.append({"agent": agent, "data": tailored.get("data")})
        elif agent == "skill_gap_agent":
            target_role = context.get("preferences", {}).get("role", "Senior Engineer")
            gaps = await gap_analysis({
                "resume_text": resume_text, 
                "target_role": target_role
            })
            results.append({"agent": agent, "data": gaps.get("data")})
        elif agent == "google_skills_agent":
            prev_gaps = []
            for r in results:
                if r["agent"] == "skill_gap_agent" and r.get("data"):
                    data = r.get("data", {})
                    raw_gaps = data.get("missing_skills", []) or data.get("weak_areas", [])
                    # Extract names if they are dicts
                    for g in raw_gaps:
                        if isinstance(g, dict):
                            prev_gaps.append(g.get("name", ""))
                        else:
                            prev_gaps.append(str(g))
            labs = await google_skills_agent.recommend_labs(prev_gaps or ["Full Stack Development"])
            results.append({"agent": agent, "data": {"recommended_labs": labs}})
        elif agent == "outreach_agent":
            outreach = await generate_cover_letter({
                "job_title": context.get("preferences", {}).get("role", "Software Engineer"),
                "company_name": "Target Co",
                "resume_text": resume_text
            })
            results.append({"agent": agent, "data": outreach})
        elif agent == "interview_agent" or agent == "mock_interview_agent":
            prep = await interview_prep({
                "company_name": "Target Corp", 
                "job_title": context.get("preferences", {}).get("role", "Engineer")
            })
            results.append({"agent": agent, "data": prep.get("data")})
            
    return {
        "status": "success",
        "plan": steps,
        "results": results,
        "final_message": plan_data.get("user_message", "I've processed your request.")
    }

@app.post("/agent/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    
    # Try to extract text — support .txt and basic .pdf text extraction
    resume_text = ""
    filename = (file.filename or "").lower()
    
    try:
        if filename.endswith(".pdf"):
            try:
                import io
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                resume_text = "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception as pdf_err:
                print(f"⚠️ pypdf failed ({pdf_err}), falling back to raw decode")
                resume_text = content.decode("utf-8", errors="ignore")
        else:
            resume_text = content.decode("utf-8", errors="ignore")
    except Exception as e:
        resume_text = content.decode("utf-8", errors="ignore")
    
    resume_text = resume_text.strip()[:6000]  # Limit to Gemini context
    
    if not resume_text:
        return {"status": "error", "message": "Could not extract text from file"}

    if MOCK_MODE or not gemini_client:
        # Return plausible mock data in dev but make it slightly dynamic so it doesn't look static
        return {
            "status": "success",
            "data": {
                "skills": ["Manual Upload", "AI Parsing Disabled", "Check .env API Key"],
                "experience": [{"role": "Reviewing Resume", "company": "MOCK_MODE is Active", "years": "Latest"}],
                "education": [{"degree": "B.Tech Computer Science", "institution": "Sample University", "year": "2021"}],
                "raw_text": resume_text[:500]
            }
        }
    
    prompt = f"""You are a professional resume parser. Extract the following information from this resume text and return ONLY valid JSON with no markdown.

    Return JSON in exactly this format:
    {{
      "personal_info": {{
        "name": "Full Name",
        "email": "Email Address",
        "phone": "Phone Number",
        "location": "City, State",
        "linkedin": "LinkedIn URL",
        "website": "Portfolio/Website URL"
      }},
      "skills": ["skill1", "skill2", ...],
      "experience": [
        {{"role": "Job Title", "company": "Company Name", "duration": "Start-End or Years"}}
      ],
      "education": [
        {{"degree": "Degree Name", "institution": "University Name", "year": "Graduation Year"}}
      ]
    }}

    Resume Text:
    {resume_text}"""

    try:
        res = ai(prompt)
        log(f"🧠 [Gemini] Received response of length {len(res or '')}")
        clean = res.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        parsed["raw_text"] = resume_text[:1000]
        return {"status": "success", "data": parsed}
    except Exception as e:
        log(f"⚠️ Resume parse JSON error: {e}, raw: {res[:200]}")
        return {"status": "error", "message": f"Gemini returned unparseable response: {str(e)}"}

@app.post("/agent/search-jobs")
async def search_jobs(request: JobSearchRequest, resume_text: str = "Sample Resume"):
    prefs_dict = request.preferences.dict() if request.preferences else {}
    if not prefs_dict.get("preferred_roles"): prefs_dict["preferred_roles"] = ["Software Engineer"]
    try:
        jobs = await job_search_agent_instance.search_and_score(prefs_dict, resume_text)
        if jobs: return {"status": "success", "jobs": jobs}
    except Exception as e: print("JobSearchAgent Error:", e)
    return {"status": "error", "message": "Search engine offline"}

@app.post("/agent/generate-cover-letter")
async def generate_cover_letter(request: Dict):
    user_id = request.get("user_id")
    company = request.get("company_name", "the company")
    role = request.get("job_title", "the position")
    jd = request.get("job_description", "")
    resume_text = request.get("resume_text", "")
    email = request.get("email")

    if MOCK_MODE: return {"status": "success", "cover_letter": f"Dear Hiring Manager at {company},\n\nI am excited to apply for the {role} position. Based on my background in software engineering, I am confident I would be a great fit."}

    # Fetch resume if missing
    if not resume_text or "Dynamic Resume Node" in resume_text:
        db_url_raw = os.getenv("DATABASE_URL", "")
        db_url = db_url_raw.split("?")[0] if "?" in db_url_raw else db_url_raw
        if db_url and (user_id or email):
            try:
                conn = get_db_connection()
                if not conn: return
                cur = conn.cursor()
                
                # Fetch user_id first if only email is provided
                if not user_id and email:
                    cur.execute('SELECT id FROM "User" WHERE email = %s', (email,))
                    u_row = cur.fetchone()
                    if u_row: user_id = u_row['id']

                if user_id:
                    cur.execute("""
                        SELECT r.parsed_skills, r.parsed_experience, r.parsed_education
                        FROM "Resume" r
                        WHERE r.user_id = %s AND r.is_active = true
                        ORDER BY r.created_at DESC
                        LIMIT 1
                    """, (user_id,))
                    row = cur.fetchone()
                    if row:
                        parts = []
                        if row.get('parsed_skills'): parts.append(f"Skills: {', '.join(row['parsed_skills'])}")
                        if row.get('parsed_experience'): parts.append(f"Experience: {json.dumps(row['parsed_experience'])}")
                        resume_text = "\n\n".join(parts)
                cur.close()
                conn.close()
            except Exception as e:
                print(f"Cover Letter Resume DB Fetch Error: {e}")

    prompt = f"""
    Write a professional and compelling cover letter for the following job:
    Job: {role} at {company}
    JD Overview: {jd[:1000]}
    
    Using the User's Resume context:
    {resume_text[:2000]}
    
    Focus on matching my technical skills and achievements to the job requirements. Keep it professional and under 400 words.
    """
    
    res = ai(prompt)
    return {"status": "success", "cover_letter": res}

@app.post("/agent/tailor-resume")
async def tailor_resume(request: Dict):
    if MOCK_MODE: return {"status": "success", "ats_score": 92, "tailored_resume": "Simplified mock resume text for beta.", "changes_made": ["Optimized summary.", "Added keywords."]}
    
    user_id = request.get("user_id")
    email = request.get("email")
    job_title = request.get("job_title", "Developer")
    company_name = request.get("company_name", "Tech Corp")
    job_description = request.get("job_description", "")
    resume_text = request.get("resume_text", "")

    log(f"🛠️ [Tailor] Starting request for {email or user_id}")
    
    # If resume_text is placeholder or empty, fetch from DB
    if not resume_text or "Dynamic Resume Node" in resume_text:
        db_url_raw = os.getenv("DATABASE_URL", "")
        db_url = db_url_raw.split("?")[0] if "?" in db_url_raw else db_url_raw
        if db_url and (user_id or email):
            log("📡 [Tailor] Connecting to DB to fetch resume...")
            try:
                conn = get_db_connection()
                if not conn: return
                cur = conn.cursor()
                
                # Fetch user_id first if only email is provided
                if not user_id and email:
                    log(f"🔍 [Tailor] Fetching user_id for {email}")
                    cur.execute('SELECT id FROM "User" WHERE email = %s', (email,))
                    u_row = cur.fetchone()
                    if u_row: user_id = u_row['id']

                if user_id:
                    log(f"🔍 [Tailor] Fetching active resume for {user_id}")
                    cur.execute(
                        'SELECT parsed_skills, parsed_experience, parsed_education, parsed_personal_info FROM "Resume" WHERE user_id = %s AND is_active = TRUE LIMIT 1',
                        (user_id,))
                    row = cur.fetchone()
                    
                    if row:
                        parts = []
                        if row.get('parsed_personal_info'): parts.append(f"Contact Info: {json.dumps(row['parsed_personal_info'])}")
                        if row.get('parsed_skills'): parts.append(f"Skills: {', '.join(row['parsed_skills'])}")
                        if row.get('parsed_experience'): parts.append(f"Experience: {json.dumps(row['parsed_experience'])}")
                        if row.get('parsed_education'): parts.append(f"Education: {json.dumps(row['parsed_education'])}")
                        resume_text = "\n\n".join(parts)
                        log("✅ [Tailor] Resume content loaded from DB.")
                    else:
                        log("⚠️ [Tailor] No active resume found in DB.")
                cur.close()
                conn.close()
            except Exception as e:
                log(f"❌ [Tailor] DB Fetch Error: {e}")

    if not resume_text:
        return {"status": "error", "message": "No resume found to tailor."}

    data = await resume_agent_instance.tailor_resume(resume_text, job_description, job_title, company_name)
    return {"status": "success", "data": data}

@app.post("/agent/interview-prep")
async def interview_prep(request: Dict):
    company_name = request.get("company_name", "Stripe")
    job_title = request.get("job_title", "Senior Frontend Engineer")
    
    if MOCK_MODE:
        return {
            "status": "success", 
            "data": {
                "company_news": ["Expanding into specialized AI payments."],
                "probable_questions": [{"q": "How do you handle async state?", "type": "Technical", "reason": "Common for this role."}],
                "win_strategy": "Focus on reliability and UX."
            }
        }
    
    data = await interview_agent.generate_prep_guide(company_name, job_title)
    return {"status": "success", "data": data}

@app.post("/agent/mock-interview")
async def mock_interview(request: Dict):
    # Use email or a unique ID from request if available, otherwise fallback
    # Since frontend doesn't send user_id yet, we use a simple 'default' or derive from company+role
    user_key = request.get("user_id") or "guest"
    total_questions = int(request.get("total_questions", 5))
    company_name = request.get("company_name", "Stripe")
    job_title = request.get("job_title", "Senior Frontend Engineer")
    job_description = request.get("job_description", "")
    turn = int(request.get("turn", 0))
    user_answer = request.get("user_answer", "")

    if user_key not in interview_sessions or turn == 0:
        interview_sessions[user_key] = MockInterviewSession(interview_agent, total_questions=total_questions)
    
    session = interview_sessions[user_key]
    
    if turn >= session.total_questions:
        # Final Evaluation
        eval_data = await session.evaluate_session(session.history, job_title, company_name)
        
        # Persist to Database if metadata is present
        db_url_raw = os.getenv("DATABASE_URL", "")
        db_url = db_url_raw.split("?")[0] if "?" in db_url_raw else db_url_raw
        user_email = request.get("user_email")
        
        if db_url and user_email:
            try:
                import psycopg2
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                
                # 1. Get User ID
                cur.execute('SELECT id FROM "User" WHERE email = %s', (user_email,))
                u_res = cur.fetchone()
                if u_res:
                    u_id = u_res[0]
                    # 2. Try to find a matching application
                    cur.execute("""
                        SELECT a.id FROM "Application" a
                        JOIN "Job" j ON a.job_id = j.id
                        WHERE a.user_id = %s AND LOWER(j.company) LIKE %s
                        LIMIT 1
                    """, (u_id, f"%{company_name.lower()}%"))
                    a_res = cur.fetchone()
                    
                    if a_res:
                        a_id = a_res[0]
                        # 3. Create MockInterviewSession record
                        cur.execute("""
                            INSERT INTO "MockInterviewSession" 
                            (id, application_id, user_id, questions_asked, answers_evaluated, overall_score, strengths, improvements, completed_at, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        """, (
                            str(uuid.uuid4()), a_id, u_id, 
                            json.dumps([h for h in session.history if h['role'] == 'ai']),
                            json.dumps([h for h in session.history if h['role'] == 'user']),
                            int(eval_data.get('overall_score', 80)),
                            eval_data.get('strengths', []),
                            eval_data.get('improvements', [])
                        ))
                        conn.commit()
                        log(f"✅ [Interview] Session persisted for {user_email}")
                cur.close()
                conn.close()
            except Exception as db_err:
                log(f"⚠️ [Interview] DB Persistence Failure: {db_err}")

        return {"status": "success", "data": {"done": True, "evaluation": eval_data}}
    
    # Get Next Question
    q_data = await session.get_next_question(turn, user_answer, job_title, company_name, job_description)
    
    # Store in history
    if user_answer:
        session.history.append({"role": "user", "content": user_answer})
    session.history.append({"role": "ai", "content": q_data['question']})
    
    return {
        "status": "success", 
        "data": {
            "done": False, 
            "question": q_data['question'],
            "feedback_on_previous": q_data.get('feedback', ""),
            "question_number": q_data['question_number'],
            "total_questions": q_data['total_questions']
        }
    }

@app.post("/agent/gap-analysis")
async def gap_analysis(request: Dict):
    resume = request.get("resume_text", "")
    target = request.get("target_role", "Senior Engineer")
    
    # 1. Determine Prompt
    if not resume or "Placeholder" in resume:
        prompt = f"""
        Identify 5-6 critical technical and soft skill gaps for someone transitioning into a {target} role from a general background.
        For each skill, provide a name and a 1-sentence description of why it is essential.
        Estimate a Market Readiness score (0-100) for a general candidate.
        Return ONLY valid JSON:
        {{
            "missing_skills": [
                {{"name": "Skill Name", "description": "Why it matters..."}},
                ...
            ],
            "skill_gap_summary": "1-sentence summary of the overall gap.",
            "readiness_score": 45
        }}
        """
    else:
        prompt = f"""
        Analyze the following resume against the target role: {target}.
        Identify 5-6 specific technical and leadership skill gaps.
        For each gap, provide a name and a 1-sentence description explaining the deficiency relative to the role.
        Calculate a Market Readiness score (0-100) based on the match.
        Resume Info: {resume[:2000]}
        Return ONLY valid JSON:
        {{
            "missing_skills": [
                {{"name": "Skill Name", "description": "Description of gap..."}},
                ...
            ],
            "skill_gap_summary": "1-sentence summary of the challenge.",
            "readiness_score": 72
        }}
        """
    
    # 2. Call AI
    try:
        res = ai(prompt)
        if "```json" in res:
            res = res.split("```json")[1].split("```")[0].strip()
        data = json.loads(res)
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Gap Analysis Error: {e}")
        # Intelligent, role-sensitive fallback during AI Quota Exhaustion
        t = target.lower()
        if "develop" in t or "engineer" in t or "full stack" in t or "software" in t:
            fallback_skills = [
                {"name": f"Advanced {target} Architecture", "description": "Designing scalable, fault-tolerant systems and robust application foundations."},
                {"name": "CI/CD & DevOps Practices", "description": "Implementing automated testing, continuous integration, and seamless deployment pipelines."},
                {"name": "API Design & Integration", "description": "Building and consuming resilient RESTful and GraphQL APIs."},
                {"name": "Advanced State Management", "description": "Handling complex application state and data flow effectively."},
                {"name": "Database Optimization", "description": "Structuring and indexing data stores for high-performance and scale."}
            ]
        elif "data" in t or "scient" in t or "analy" in t:
            fallback_skills = [
                {"name": "Advanced Statistical Modeling", "description": "Applying complex algorithms to derive actionable insights from raw data."},
                {"name": "Data Pipeline Engineering", "description": "Building robust ETL pipelines and managing massive data warehouses."},
                {"name": "Predictive ML Frameworks", "description": "Deploying predictive models using modern machine learning libraries."},
                {"name": "Data Visualization & BI", "description": "Translating complex datasets into clear, business-driven dashboards."},
                {"name": "Advanced SQL Optimization", "description": "Executing highly efficient queries across multi-petabyte datasets."}
            ]
        elif "design" in t or "ux" in t or "ui" in t:
            fallback_skills = [
                {"name": "Interactive Prototyping", "description": "Creating high-fidelity, interactive prototypes for comprehensive user testing."},
                {"name": "Scalable Design Systems", "description": "Building and maintaining reusable, scalable UI component libraries."},
                {"name": "User Journey Mapping", "description": "Analyzing and charting the holistic end-to-end customer experience."},
                {"name": "Accessibility (a11y)", "description": "Ensuring digital interfaces are inclusive and meet global compliance guidelines."},
                {"name": "A/B Testing & Analytics", "description": "Validating design decisions quantitatively using live user metrics."}
            ]
        else:
            fallback_skills = [
                {"name": f"Core {target} Strategy", "description": "Mastering the fundamental strategic pillars required for this organizational position."},
                {"name": "Data-Driven Decision Making", "description": "Using metrics, KPIs, and analytics to guide project outcomes and ROI."},
                {"name": "Stakeholder Management", "description": "Effectively navigating cross-functional team dynamics and executive expectations."},
                {"name": "Technical Architecture", "description": "Understanding the high-level system design relevant to modern digital products."},
                {"name": "Agile Methodology", "description": "Proficiency in modern delivery frameworks, sprints, and continuous improvement."}
            ]

        return {"status": "success", "data": {
            "missing_skills": fallback_skills,
            "skill_gap_summary": f"Your current profile lacks some of the specialized technical and strategic markers frequently found in top {target} candidates.",
            "readiness_score": 55
        }}

@app.post("/agent/schedule-notification")
async def schedule_notification(request: Dict):
    user_email = request.get("user_email", "user@example.com")
    company = request.get("company", "Vercel")
    job_title = request.get("job_title", "Developer")
    access_token = request.get("access_token")
    print(f"🔑 [DEBUG] Backend received access_token length: {len(access_token) if access_token else 0}")
    delay = int(request.get("delay_seconds", 5))

    run_time = datetime.now() + timedelta(seconds=delay)
    # USE THE PERSISTENT STORE for scheduled emails so they are never lost!
    job_store = 'persistent' if 'persistent' in scheduler._jobstores else 'default'
    scheduler.add_job(
        scheduled_email_job, 
        'date', 
        run_date=run_time, 
        args=[user_email, company, job_title, access_token],
        jobstore=job_store
    )
    return {"status": "success", "message": f"Scheduled for {run_time}."}

async def scheduled_email_job(user_email: str, company: str, job_title: str, access_token: Optional[str] = None):
    print(f"⏰ [Notification] Triggering notification for {job_title} at {company} to {user_email}")
    # Include a deep link to the job in the platform
    dashboard_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    body = f"""
    Hello,
    
    Our Agentic Tracker has a new update regarding your application for {job_title} at {company}.
    
    You can view the full details and next steps in your JobPilot dashboard here: 
    {dashboard_url}/dashboard
    
    Best,
    JobPilot Agentic Automation
    """
    
    # ABSOLUTE POST OFFICE PASS: Use refresh_token as the key to unlock the inbox!
    gmail_result = await call_gmail_mcp("send_gmail", {
        "recipient": user_email, 
        "subject": f"🎯 Update: {job_title} at {company}", 
        "body": body,
        "access_token": access_token
    })
    print(f"📬 [MCP Result] {gmail_result}")




@app.post("/agent/monitor-gmail")
async def monitor_gmail(request: Dict, x_google_token: Optional[str] = Header(None)):
    company_domain = request.get("company_domain", "vercel.com")
    try:
        mcp_response = await call_gmail_mcp("check_inbox_for_replies", {"company_domain": company_domain})
        if mcp_response and not getattr(mcp_response, "isError", False):
            content = getattr(mcp_response, "content", [])
            if content:
                text = content[0].text
                try: 
                    data = json.loads(text)
                    return {"status": "success", "data": data}
                except:
                    return {"status": "success", "data": {"raw": text}}
        return {"status": "success", "data": {"status": "No Replies Yet", "action_required": "No"}}
    except Exception as e:
        print("MCP Tracking Error:", e)
        return {"status": "error", "message": str(e)}

async def daily_sweep(request: any, silent: bool = False):
    """
    Triggers a daily agentic sweep: finds new jobs, stores them in DB, and sends a summary digest if silent is False.
    """
    # ABSOLUTE LOGICAL BRIDGE: Handle both raw string input and dictionary input!
    if isinstance(request, str):
        user_email = request
        user_id = None
        preferences = {}
        access_token = None
    else:
        user_email = request.get("user_email")
        user_id = request.get("user_id")
        preferences = request.get("preferences", {})
        access_token = request.get("access_token")
    
    print(f"🧹 [Daily Sweep] Initiating for {user_email} (UserID: {user_id})")
    
    # NEW: Sync the inbox BEFORE searching for new jobs to avoid duplicates!
    if access_token and user_id:
        try:
            await sync_gmail_inbox(user_id, user_email, access_token)
        except Exception as sync_err:
            print(f"⚠️ [Sweep] Inbox pre-sync failed: {sync_err}")

    # 0. ABSOLUTE IDENTITY FULFILLMENT: Look up ID if missing!
    db_url_raw = os.getenv("DATABASE_URL", "")
    db_url = db_url_raw.split("?")[0] if "?" in db_url_raw else db_url_raw
    
    if db_url and not user_id and user_email:
        print(f"🔍 [Sweep] UserID missing, performing identity lookup for {user_email}...")
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("SELECT id, preferred_roles, location_preference, refresh_token FROM \"User\" WHERE LOWER(email) = LOWER(%s)", (user_email,))
                u_row = cur.fetchone()
                if u_row:
                    user_id = u_row['id']
                    if not access_token: access_token = u_row.get('refresh_token') # Provision if missed
                    if not preferences:
                        role = u_row['preferred_roles'][0] if u_row['preferred_roles'] else "Software Engineer"
                        preferences = {"preferred_roles": [role], "location_preference": u_row['location_preference'] or "Remote"}
                    print(f"✅ [Sweep] Identity restored! ID: {user_id}")
                cur.close()
                conn.close()
        except Exception as e:
            print(f"⚠️ [Sweep] Identity lookup failed: {e}")

    # 1. Fetch user's actual resume from DB for accurate scoring
    resume_text = "Sample Resume"  # fallback
    if db_url and user_id:
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("""
                    SELECT r.parsed_skills, r.parsed_experience, r.parsed_education
                    FROM \"Resume\" r
                    WHERE r.user_id = %s AND r.is_active = true
                    ORDER BY r.created_at DESC
                    LIMIT 1
                """, (user_id,))
                resume_row = cur.fetchone()
                cur.close()
                conn.close()
            if resume_row:
                # Build a rich resume string from all available structured data
                parts = []
                skills = resume_row.get('parsed_skills') or []
                experience = resume_row.get('parsed_experience') or []
                education = resume_row.get('parsed_education') or []

                if skills:
                    parts.append(f"Technical Skills: {', '.join(skills)}")
                if experience:
                    exp_text = json.dumps(experience) if isinstance(experience, (list, dict)) else str(experience)
                    parts.append(f"Experience: {exp_text}")
                if education:
                    edu_text = json.dumps(education) if isinstance(education, (list, dict)) else str(education)
                    parts.append(f"Education: {edu_text}")

                if parts:
                    resume_text = "\n".join(parts)
                    print(f"📄 [Sweep] Using real resume for {user_email} — {len(resume_text)} chars, skills: {skills}")
                else:
                    print(f"⚠️ [Sweep] Resume exists but has no parsed data for {user_email}")
            else:
                print(f"⚠️ [Sweep] No active resume found for {user_email}, using placeholder")
        except Exception as e:
            print(f"⚠️ [Sweep] Resume fetch failed: {e}")

    # 1. Discover New Jobs using REAL resume
    search_req = JobSearchRequest(preferences=preferences)
    search_res = await search_jobs(search_req, resume_text=resume_text)
    
    if search_res.get("status") != "success":
        return search_res

    found_jobs = search_res.get("jobs", [])
    
    if not found_jobs:
        return {"status": "success", "message": "No new jobs found matching preferences today."}
    
    # 2. Store in Database (Directly via psycopg2 to ensure background persistence)
    db_url = os.getenv("DATABASE_URL")
    if db_url and "?" in db_url:
        db_url = db_url.split("?")[0]
        
    saved_count = 0
    if db_url and user_id:
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                for job in found_jobs:
                    # Check for duplicates first
                    cur.execute('SELECT id FROM "Job" WHERE user_id = %s AND title = %s AND company = %s', (user_id, job['title'], job['company']))
                    if cur.fetchone(): continue
                    
                    import uuid
                    job_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO "Job" (id, user_id, title, company, location, description, apply_url, match_score, match_reason, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'found')
                    """, (job_id, user_id, job['title'], job['company'], job.get('location', 'Remote'), job.get('jd', ''), job.get('apply_url', ''), job.get('matchScore', 0), job.get('matchReason', '')))
                    saved_count += 1
                conn.commit()
                cur.close()
                conn.close()
                print(f"💾 [DB Cache] Successfully persisted {saved_count} new roles for user {user_id}")
        except Exception as e:
            print(f"⚠️ [DB Error] Failed to persist jobs: {e}")

    # 3. Extract Top 3 High-Fidelity Matches for Email
    top_matches = sorted(found_jobs, key=lambda x: x.get('matchScore', 0), reverse=True)[:3]
    
    # 4. Build Premium HTML Email
    dashboard_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def score_color(score):
        if score >= 70: return "#22c55e"   # green
        if score >= 40: return "#f59e0b"   # amber
        return "#ef4444"                    # red

    job_cards_html = ""
    for j in top_matches:
        score = j.get('matchScore', 0)
        color = score_color(score)
        job_cards_html += f"""
        <div style="background:#1e293b;border-radius:12px;padding:20px 24px;margin-bottom:16px;border-left:4px solid {color};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#f1f5f9;">{j['title']}</p>
              <p style="margin:0;font-size:13px;color:#94a3b8;">🏢 {j['company']} &nbsp;|&nbsp; 📍 {j.get('location','Remote')}</p>
            </div>
            <div style="background:{color}22;border:1px solid {color};border-radius:20px;padding:4px 14px;white-space:nowrap;">
              <span style="font-size:14px;font-weight:800;color:{color};">{score}% match</span>
            </div>
          </div>
          <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">{j.get('matchReason','')[:180]}...</p>
        </div>"""

    body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        
        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:28px;">🚀</p>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">JobPilot Daily Digest</h1>
          <p style="margin:0;font-size:14px;color:#e0e7ff;opacity:0.9;">Your agentic sweep is complete · {datetime.now().strftime('%B %d, %Y')}</p>
        </td></tr>
        
        <!-- STATS BAR -->
        <tr><td style="background:#1e293b;padding:20px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="border-right:1px solid #334155;padding-right:20px;">
                <p style="margin:0;font-size:32px;font-weight:800;color:#818cf8;">{len(found_jobs)}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Roles Found</p>
              </td>
              <td align="center" style="padding-left:20px;">
                <p style="margin:0;font-size:32px;font-weight:800;color:#22c55e;">3</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Top Matches</p>
              </td>
            </tr>
          </table>
        </td></tr>
        
        <!-- JOB CARDS -->
        <tr><td style="background:#0f172a;padding:24px 40px 8px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;">📌 Top Matches For You</p>
          {job_cards_html}
        </td></tr>
        
        <!-- CTA -->
        <tr><td style="background:#0f172a;padding:8px 40px 32px;text-align:center;">
          <a href="{dashboard_url}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:100px;letter-spacing:0.3px;">
            View All {len(found_jobs)} Roles in Dashboard →
          </a>
        </td></tr>
        
        <!-- FOOTER -->
        <tr><td style="background:#1e293b;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#475569;">Sent by <strong style="color:#818cf8;">JobPilot Agents</strong> · Your autonomous career concierge</p>
        </td></tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    # 5. Dispatch via Gmail MCP (SKIP IF SILENT)
    if silent:
        log(f"🤫 [Daily Sweep] {user_email}: Skipping email dispatch (Silent Mode).")
        return {"status": "success", "summary": f"Found {len(found_jobs)} jobs. Dashboard updated (Silent Mode)."}

    res = await call_gmail_mcp("send_gmail", {
        "recipient": user_email,
        "subject": f"🔥 JobPilot: {len(found_jobs)} New Roles Found Today — Top Match Inside",
        "body": body,
        "access_token": access_token
    })
    
    return {"status": "success", "summary": f"Found {len(found_jobs)} jobs. Email dispatched.", "mcp_result": res}


async def global_inbox_sync_executor():
    """
    Periodic job that syncs inboxes for all users with a registered refresh_token.
    This runs globally for all users every 6 hours.
    """
    log("🔄 [Global Sync] Initiating periodic inbox check for all users...")
    
    try:
        # 1. Get all users with refresh tokens
        conn = get_db_connection()
        if not conn: return
        cur = conn.cursor()
        cur.execute('SELECT id, email, refresh_token FROM "User" WHERE refresh_token IS NOT NULL')
        users_to_sync = cur.fetchall()
        cur.close()
        conn.close()
        
        if not users_to_sync:
            log("ℹ️ [Global Sync] No users found with valid tokens.")
            return

        log(f"🔄 [Global Sync] Processing {len(users_to_sync)} authenticated users...")

        async with httpx.AsyncClient() as client:
            for user in users_to_sync:
                # 2. Refresh Token
                live_token = None
                try:
                    token_url = "https://oauth2.googleapis.com/token"
                    payload = {
                        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                        "refresh_token": user['refresh_token'],
                        "grant_type": "refresh_token"
                    }
                    token_res = (await client.post(token_url, data=payload)).json()
                    live_token = token_res.get("access_token")
                    if live_token:
                        log(f"🔑 [Global Sync] Refreshed token for {user['email']}")
                except Exception as ex:
                    log(f"⚠️ [Global Sync] Token refresh failed for {user['email']}: {ex}")
                    continue

                if live_token:
                    # 3. Synchronize Inbox (SILENT: No emails during background scans!)
                    await sync_gmail_inbox(user['id'], user['email'], live_token, silent=True)
                
    except Exception as e:
        log(f"❌ [Global Sync Error] {e}")

async def sync_gmail_inbox(user_id: str, user_email: str, access_token: str, silent: bool = True):
    """
    Connects to the inbox, finds job-related emails, and updates the dashboard.
    If silent is True, no notification email is sent.
    """
    get_agents() # Ensure singleton agents are ready!
    
    # Prevent multiple overlapping syncs for the same user
    if user_id not in inbox_sync_locks:
        inbox_sync_locks[user_id] = asyncio.Lock()
    
    async with inbox_sync_locks[user_id]:
        log(f"🔄 [Inbox Sync] Synchronizing inbox for {user_email}...")
        
        try:
            # 1. Fetch recent emails (last 6 hours as requested)
            mcp_res = await call_gmail_mcp("sync_recent_emails", {"access_token": access_token, "hours": 6, "max_results": 100})
            
            log(f"DEBUG: mcp_res received. type={type(mcp_res)}")
            
            raw_emails = []
            # Robust extraction from MCP CallToolResult
            if mcp_res and hasattr(mcp_res, "content") and len(mcp_res.content) > 0:
                try:
                    content_text = mcp_res.content[0].text
                    log(f"DEBUG: content_text excerpt: {content_text[:100]}...")
                    if content_text.strip().lower() == "no mail":
                        log(f"ℹ️ [Inbox Sync] No emails found in the last 6 hours for {user_email}.")
                        return
                    raw_emails = json.loads(content_text)
                except Exception as parse_err:
                    log(f"⚠️ [Inbox Sync] Failed to parse MCP content: {parse_err}")
                    return
            log(f"DEBUG: raw_emails type: {type(raw_emails)}, count: {len(raw_emails)}")
            
            # Robust mapping: Ensure raw_emails is ALWAYS a list of dictionaries
            if isinstance(raw_emails, dict):
                # If we accidentally got one email instead of a list, wrap it!
                raw_emails = [raw_emails]
            elif not isinstance(raw_emails, list):
                raw_emails = []

            # Ensure we have a list of dictionary objects (emails)
            filtered_emails = [e for e in raw_emails if isinstance(e, dict)]
            log(f"DEBUG: filtered_emails count: {len(filtered_emails)}")

            if not filtered_emails:
                log(f"ℹ️ [Inbox Sync] No new emails found in the last 6 hours for {user_email}.")
                return

            # LOG TITLES FOR DEBUGGING
            titles = [e.get('subject', 'No Subject') for e in filtered_emails[:5]]
            log(f"📥 [Inbox Sync] Found {len(filtered_emails)} total emails. First few: {', '.join(titles)}")
            log(f"📥 [Inbox Sync] Analyzing {len(filtered_emails)} found emails for {user_email}...")
            
            # 2. Classify and Extract
            results = await inbox_agent.classify_and_extract(filtered_emails)
            
            if not results:
                log(f"ℹ️ [Inbox Sync] No relevant updates found for {user_email}.")
                return

            # 3. Update Database
            conn = get_db_connection()
            if not conn: return
            cur = conn.cursor()
            
            updated_count = 0
            new_count = 0
            
            for res in results:
                if not isinstance(res, dict): continue
                cls = res.get('classification', 'irrelevant')
                if cls == 'irrelevant': continue
                
                company = res.get('company_name')
                role = res.get('job_title')
                if not company or not role: continue
                
                # Find if job exists
                cur.execute('SELECT id, status FROM "Job" WHERE user_id = %s AND (LOWER(company) LIKE %s AND LOWER(title) LIKE %s)', (user_id, f"%{company.lower()}%", f"%{role.lower()}%"))
                job_row = cur.fetchone()
                
                if not job_row:
                    job_id = str(uuid.uuid4())
                    init_status = 'found' 
                    if cls == 'application_confirmation': init_status = 'applied'
                    elif cls == 'interview_invite': init_status = 'interview_scheduled'
                    elif cls == 'status_update': init_status = 'responded'
                    elif cls == 'rejection': init_status = 'rejected'
                    elif cls == 'invitation_to_apply': init_status = 'inbox_lead' 
                    
                    db_safe_app_status = init_status
                    if init_status == 'inbox_lead': db_safe_app_status = 'found'
                    
                    al = res.get('apply_link', '')
                    loc = res.get('location', 'Remote')
                    sal = res.get('salary_range', '')
                    desc = res.get('description', '')
                    
                    # AI Scoring
                    cur.execute('SELECT id, parsed_skills FROM "Resume" WHERE user_id = %s AND is_active = TRUE LIMIT 1', (user_id,))
                    res_row = cur.fetchone()
                    
                    match_score = 0
                    match_reason = f"Extracted from Gmail Inbox of {user_email}. Category: {cls}"
                    if res_row and coordinator:
                        try:
                            score_res = await coordinator.score_job({"title": role, "company": company, "description": desc}, res_row.get('parsed_skills', []))
                            match_score = score_res.get('score', 0)
                            match_reason = score_res.get('reason', match_reason)
                        except: pass
                    
                    # Save Job
                    cur.execute("""
                        INSERT INTO "Job" 
                        (id, user_id, title, company, status, found_at, apply_url, location, salary_range, description, match_score, match_reason, source_platform) 
                        VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, 'gmail')
                    """, (job_id, user_id, role, company, init_status, al, loc, sal, desc, match_score, match_reason))
                    
                    # Save Application
                    if res_row:
                        app_id = str(uuid.uuid4())
                        cur.execute("""
                            INSERT INTO "Application" (id, user_id, job_id, resume_id, status, applied_at, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), NOW())
                        """, (app_id, user_id, job_id, res_row['id'], db_safe_app_status))
                        new_count += 1
                
                else: # Existing job - update status
                    job_id = job_row['id']
                    current_status = job_row.get('status', 'found')
                    new_status = None
                    if cls == 'interview_invite': new_status = 'interview_scheduled'
                    elif cls == 'rejection': new_status = 'rejected'
                    elif cls == 'status_update': new_status = 'responded'
                    elif cls == 'application_confirmation': new_status = 'applied'
                    elif cls == 'invitation_to_apply' and current_status == 'found': new_status = 'inbox_lead'
                    
                    if new_status and new_status != current_status:
                        # 2. Update the Application record
                        cur.execute('UPDATE "Application" SET status = %s, updated_at = NOW() WHERE user_id = %s AND job_id = %s', (new_status, user_id, job_id))
                        updated_count += 1
                    
            conn.commit()
            cur.close()
            conn.close()
            log(f"✅ [Inbox Sync] {user_email}: Created {new_count} new entries, updated {updated_count} status.")
        except Exception as e:
            log(f"❌ [Inbox Sync Error] {user_email}: {e}")


@app.post("/agent/recalculate-scores")
async def recalculate_scores(request: Dict):
    user_id = request.get("user_id")
    if not user_id:
        return {"status": "error", "message": "user_id required"}
        
    db_url_raw = os.getenv("DATABASE_URL", "")
    db_url = db_url_raw.split("?")[0] if "?" in db_url_raw else db_url_raw
    if not db_url:
        return {"status": "error", "message": "Database not configured"}
        
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Get active resume
        cur.execute("""
            SELECT r.parsed_skills, r.parsed_experience, r.parsed_education
            FROM "Resume" r
            WHERE r.user_id = %s AND r.is_active = true
            ORDER BY r.created_at DESC
            LIMIT 1
        """, (user_id,))
        resume_row = cur.fetchone()
        
        if not resume_row:
            cur.close()
            conn.close()
            return {"status": "error", "message": "No active resume found"}
            
        resume_parts = []
        if resume_row['parsed_skills']: resume_parts.append(f"Skills: {', '.join(resume_row['parsed_skills'])}")
        if resume_row['parsed_experience']: resume_parts.append(f"Experience: {json.dumps(resume_row['parsed_experience'])}")
        resume_text = "\n".join(resume_parts)
        
        # 2. Get all jobs
        cur.execute('SELECT id, title, company, description FROM "Job" WHERE user_id = %s', (user_id,))
        jobs = cur.fetchall()
        
        if not jobs:
            cur.close()
            conn.close()
            return {"status": "success", "message": "No jobs to re-score"}
            
        # 3. Re-score in parallel
        print(f"🔄 [Recalculate] Re-scoring {len(jobs)} jobs for user {user_id}")
        
        async def update_job_score(job):
            scored = await job_search_agent_instance.score_job({
                "title": job['title'],
                "company": job['company'],
                "jd": job['description']
            }, resume_text)
            
            return {
                "id": job['id'],
                "score": scored.get("matchScore", 0),
                "reason": scored.get("matchReason", "")
            }
            
        results = await asyncio.gather(*[update_job_score(j) for j in jobs])
        
        # 4. Batch update DB
        for res in results:
            cur.execute("""
                UPDATE "Job" 
                SET match_score = %s, match_reason = %s 
                WHERE id = %s
            """, (res['score'], res['reason'], res['id']))
            
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "updated_count": len(results)}
        
    except Exception as e:
        print(f"❌ [Recalculate Error] {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
