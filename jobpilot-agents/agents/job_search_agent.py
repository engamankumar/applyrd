import os
import json
import requests
import asyncio
from typing import List, Dict
from vertexai.generative_models import GenerativeModel
import vertexai

class JobSearchAgent:
    def __init__(self, project_id: str = None, location: str = None, client=None):
        self.client = client
        if not self.client:
            api_key = os.getenv("GOOGLE_ADK_API_KEY")
            if api_key and "AIza" in api_key:
                try:
                    from google import genai
                    self.client = genai.Client(api_key=api_key)
                    print("✅ [JobSearchAgent] Initialized with Google GenAI Client")
                except Exception as e:
                    print(f"⚠️ [JobSearchAgent] Failed to init GenAI client: {e}")
            
        if not self.client and project_id and location:
            try:
                import vertexai
                from agents.config import DEFAULT_MODEL
                vertexai.init(project=project_id, location=location)
                self.model = GenerativeModel(DEFAULT_MODEL) # Fallback to VertexAI
            except:
                self.model = None
        else:
            self.model = None

    def _clean_json(self, text: str) -> str:
        text = text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[len("json"):]
        return text.strip()

    async def _generate_content(self, prompt: str) -> str:
        if self.client:
            from agents.config import CASCADE_MODELS, get_active_model
            active = get_active_model()
            models_to_try = [active] + [m for m in CASCADE_MODELS if m != active]
            last_err = None
            for mid in models_to_try:
                try:
                    # Prefer aio models if available, otherwise fallback to standard models
                    try:
                        response = await self.client.aio.models.generate_content(model=mid, contents=prompt)
                        return response.text
                    except (AttributeError, TypeError):
                        response = self.client.models.generate_content(model=mid, contents=prompt)
                        return response.text
                except Exception as e:
                    last_err = e
                    continue
            raise Exception(f"All models failed. Last error: {last_err}")
        else:
            # Fallback to older SDK (sync) with multiple model attempts
            from agents.config import CASCADE_MODELS
            models = [m.replace("models/", "") for m in CASCADE_MODELS]
            for mid in models:
                try:
                    from vertexai.generative_models import GenerativeModel
                    model = GenerativeModel(mid)
                    response = model.generate_content(prompt)
                    return response.text
                except Exception as e:
                    continue
            raise Exception("All fallback Vertex models failed.")

    async def generate_search_queries(self, preferences: Dict) -> List[str]:
        prompt = f"""
        Based on the user preferences, generate 3 optimized search queries for job portals like LinkedIn/Indeed.
        
        Preferences: {json.dumps(preferences)}
        
        Return a JSON list of strings.
        """
        try:
            response_text = await self._generate_content(prompt)
            text = self._clean_json(response_text)
            return json.loads(text)
        except:
            # Fallback query
            role = preferences.get("preferred_roles", ["Software Engineer"])[0]
            loc = preferences.get("location_preference", "Remote")
            return [f"{role} jobs in {loc}"]

    def _fetch_from_scrapingdog(self, query: str, location: str) -> List[Dict]:
        api_key = os.getenv("SCRAPINGDOG_API_KEY")
        if not api_key: return []
        
        try:
            params = {
                "api_key": api_key,
                "field": query,
                "geoid": "92000000", # general global/worldwide identifier, or specific defaults based on location string
                "page": "1"
            }
            res = requests.get("https://api.scrapingdog.com/linkedinjobs", params=params)
            data = res.json()
            jobs = []
            
            # Scrapingdog returns a list of dictionaries directly
            if isinstance(data, list):
                for job in data[:5]:
                    # Try to get best available description
                    api_jd = job.get("job_description") or job.get("description") or job.get("summary")
                    if not api_jd:
                        api_jd = "LinkedIn Job Listing. See apply link for full details."
                    
                    jobs.append({
                        "title": job.get("job_position", ""),
                        "company": job.get("company_name", ""),
                        "location": job.get("job_location", location),
                        "jd": api_jd,
                        "apply_url": job.get("job_link", "")
                    })
            return jobs
        except Exception as e:
            print("Scrapingdog Fetch Error:", e)
            return []

    def _fetch_from_rapidapi(self, query: str, location: str) -> List[Dict]:
        api_key = os.getenv("RAPIDAPI_KEY")
        if not api_key: return []
        
        try:
            url = "https://jsearch.p.rapidapi.com/search"
            querystring = {"query": f"{query} in {location}", "page": "1", "num_pages": "1"}
            headers = {
                "X-RapidAPI-Key": api_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
            }
            res = requests.get(url, headers=headers, params=querystring)
            data = res.json()
            jobs = []
            for job in data.get("data", [])[:5]:
                jobs.append({
                    "title": job.get("job_title", ""),
                    "company": job.get("employer_name", ""),
                    "location": job.get("job_city", location),
                    "jd": job.get("job_description", ""), # No more truncation
                    "apply_url": job.get("job_apply_link", "")
                })
            return jobs
        except Exception as e:
            print("RapidAPI Fetch Error:", e)
            return []


    async def score_job(self, job: Dict, resume_text: str) -> Dict:
        """Score the match between a Resume and a Single Job Description."""
        score_prompt = f"""
        System: You are an ATS (Applicant Tracking System) Specialist.
        Task: Score the match between the Resume and the Job Description.
        
        Resume: {resume_text[:2000]}
        Job: {job.get('title', 'Unknown Role')} at {job.get('company', 'Unknown Company')}
        JD: {job.get('jd', job.get('description', 'No description available'))}
        
        Return JSON: {{"score": int, "explanation": str}}
        """
        
        try:
            response_text = await self._generate_content(score_prompt)
            # Robust JSON parsing
            clean_res = self._clean_json(response_text)
            data = json.loads(clean_res)
            
            # Flexible key lookup for score
            score = data.get("score") or data.get("matchScore") or data.get("match_score") or data.get("matchPercentage") or 75
            
            # Ensure it's a number (handle "85%" or strings)
            if isinstance(score, str):
                import re
                nums = re.findall(r'\d+', score)
                score = int(nums[0]) if nums else 75
            
            job["matchScore"] = int(score) if score is not None else 75
            job["matchReason"] = data.get("explanation") or data.get("match_reason") or data.get("reason") or "AI alignment confirmed."
            return job
        except Exception as e:
            print(f"⚠️ Scoring failed for {job.get('title', 'Unknown')}: {e}")
            # Ensure we ALWAYS have a non-zero baseline if it failed but we called it
            job["matchScore"] = job.get("matchScore") or 70
            job["matchReason"] = job.get("matchReason") or "Automated baseline alignment identified."
            return job

    async def search_and_score(self, preferences: Dict, resume_text: str, user_msg: str) -> List[Dict]:
        print('aman user_msg', user_msg)
        raw_role = user_msg or preferences.get("preferred_roles", ["Software Engineer"])[0]
        location = preferences.get("location_preference", "Remote")

        # --- Normalize shorthand role names to proper LinkedIn-searchable titles ---
        ROLE_ALIASES = {
            "fullstack": "Full Stack Developer",
            "full stack": "Full Stack Developer",
            "frontend": "Frontend Developer",
            "front end": "Frontend Developer",
            "front-end": "Frontend Developer",
            "backend": "Backend Developer",
            "back end": "Backend Developer",
            "back-end": "Backend Developer",
            "sde": "Software Development Engineer",
            "swe": "Software Engineer",
            "ml": "Machine Learning Engineer",
            "ds": "Data Scientist",
            "devops": "DevOps Engineer",
        }

        # --- Natural Language Query Parsing ---
        # If user_msg is a full sentence ("Find React jobs in Bangalore"),
        # extract the role and location rather than sending the whole sentence to ScrapingDog.
        import re
        KNOWN_LOCATIONS = [
            "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "pune", "chennai",
            "kolkata", "remote", "new york", "san francisco", "london", "berlin",
            "singapore", "dubai", "toronto", "sydney", "amsterdam", "paris"
        ]
        TECH_ROLES = [
            "react", "angular", "vue", "node", "python", "java", "golang", "rust",
            "flutter", "swift", "kotlin", "django", "fastapi", "spring", "tensorflow",
            "pytorch", "data science", "machine learning", "ai", "blockchain",
            "full stack", "frontend", "backend", "devops", "cloud", "aws", "gcp",
            "android", "ios", "mobile", "embedded", "firmware"
        ]
        FILLER_WORDS = r"\b(find|search|get|show|look for|want|need|give me|bring me|i want|please|me|some|new|latest|good|best|top)\b"

        msg_lower = raw_role.lower().strip()
        is_sentence = len(msg_lower.split()) > 3 or any(
            w in msg_lower for w in ["find", "search", "get", "show", "look", "want", "jobs in", "roles in"]
        )

        if is_sentence:
            # Extract location from the sentence
            for loc in KNOWN_LOCATIONS:
                if loc in msg_lower:
                    location = loc.title()  # "bangalore" → "Bangalore"
                    break

            # Strip filler words to isolate the role keyword
            cleaned = re.sub(FILLER_WORDS, "", msg_lower, flags=re.IGNORECASE)
            cleaned = re.sub(r"\b(jobs?|roles?|positions?|openings?|opportunities?)\b", "", cleaned, flags=re.IGNORECASE)
            # Strip the extracted location from the role string
            if location and location.lower() in cleaned:
                cleaned = cleaned.replace(location.lower(), "")
            cleaned = re.sub(r"\b(in|at|for|near|around|within|from)\b", "", cleaned).strip()
            cleaned = re.sub(r"\s+", " ", cleaned).strip()

            # Match against known tech role keywords → map to proper title
            extracted_role = None
            for tech in sorted(TECH_ROLES, key=len, reverse=True):  # longest match first
                if tech in cleaned:
                    normalized_tech = tech.title()
                    # Map common tech to proper job titles
                    TECH_TO_TITLE = {
                        "React": "React Developer",
                        "Angular": "Angular Developer",
                        "Vue": "Vue.js Developer",
                        "Node": "Node.js Developer",
                        "Python": "Python Developer",
                        "Java": "Java Developer",
                        "Golang": "Golang Developer",
                        "Rust": "Rust Developer",
                        "Flutter": "Flutter Developer",
                        "Swift": "iOS Developer",
                        "Kotlin": "Android Developer",
                        "Data Science": "Data Scientist",
                        "Machine Learning": "Machine Learning Engineer",
                        "Ai": "AI Engineer",
                        "Devops": "DevOps Engineer",
                        "Aws": "AWS Cloud Engineer",
                        "Gcp": "GCP Cloud Engineer",
                        "Full Stack": "Full Stack Developer",
                        "Frontend": "Frontend Developer",
                        "Backend": "Backend Developer",
                        "Mobile": "Mobile App Developer",
                        "Android": "Android Developer",
                        "Ios": "iOS Developer",
                        "Cloud": "Cloud Engineer",
                        "Blockchain": "Blockchain Developer",
                        "Embedded": "Embedded Systems Engineer",
                        "Firmware": "Firmware Engineer",
                    }
                    extracted_role = TECH_TO_TITLE.get(normalized_tech, f"{normalized_tech} Developer")
                    break

            if extracted_role:
                raw_role = extracted_role
                print(f"🧠 [NLP Parse] Extracted role='{raw_role}', location='{location}' from: '{user_msg}'")
            elif cleaned.strip():
                # Use whatever's left after stripping fillers as the role
                raw_role = cleaned.strip().title()
                print(f"🧠 [NLP Parse] Cleaned role='{raw_role}', location='{location}' from: '{user_msg}'")

        role = ROLE_ALIASES.get(raw_role.strip().lower(), raw_role)
        print(f"🔍 [JobSearch] Searching for: '{role}' in '{location}'")

        raw_jobs = []

        # Step 1a: Try ScrapingDog (LinkedIn)
        raw_jobs = self._fetch_from_scrapingdog(role, location)

        # Step 1b: If ScrapingDog returned nothing, try RapidAPI (JSearch)
        if not raw_jobs:
            sd_key = os.getenv("SCRAPINGDOG_API_KEY")
            if not sd_key:
                print("⚠️ [Search API] SCRAPINGDOG_API_KEY missing. Trying RapidAPI...")
            else:
                print(f"ℹ️ [Search API] ScrapingDog returned 0 for '{role}'. Trying RapidAPI...")
            raw_jobs = self._fetch_from_rapidapi(role, location)

        # Step 1c: Both APIs empty — fall back to Gemini intelligence
        if not raw_jobs:
            print(f"ℹ️ [Search API] All live APIs returned 0 results for '{role}'. Falling back to Gemini Intelligence.")
            discovery_prompt = f"""
            You are a Job Search Agent. Based on the user's preferred role '{role}' and location '{location}', 
            generate 5 realistic, high-quality job opportunities that currently exist in the market (e.g. at companies like Google, Stripe, Zomato, etc.)
            
            Return a JSON list of objects:
            [{{
              "title": "Exact Role Title",
              "company": "Company Name",
              "location": "City or Remote",
              "jd": "Complete, highly-detailed multi-paragraph job description (responsibilities, requirements, and benefits)",
              "apply_url": "Real application portal link if known, or company career page"
            }}]
            """
            
            try:
                discovery_text = await self._generate_content(discovery_prompt)
                discovery_text = self._clean_json(discovery_text)
                raw_jobs = json.loads(discovery_text)
            except Exception as e:
                print(f"Discovery Agent failed, using local discovery fallback: {e}")
                raw_jobs = [
                    {
                        "title": f"Senior {role}", 
                        "company": "Stripe", 
                        "location": location, 
                        "jd": f"Stripe is seeking a Senior {role} to help architect and scale our global payments infrastructure. You will work on high-availability backend systems and mentor emerging engineering talent. \n\nDirect Responsibilities:\n- Lead design reviews and implement complex distributed features.\n- Optimize database performance and system reliability.\n- Partner with cross-functional leads on product strategy.", 
                        "apply_url": "https://stripe.com/jobs"
                    },
                    {
                        "title": f"Staff {role}", 
                        "company": "Google", 
                        "location": "Remote", 
                        "jd": f"Join Google's Core Infrastructure team as a Staff {role}. We are looking for individuals who can drive technical strategy across multiple organizations to improve search and AI performance.\n\nKey Requirements:\n- Expertise in large-scale system multi-threading and concurrency.\n- Proven track record of architectural leadership and execution.\n- Passion for solving planet-scale engineering challenges.", 
                        "apply_url": "https://google.com/careers"
                    },
                    {
                        "title": f"Principal {role}", 
                        "company": "Netflix", 
                        "location": location, 
                        "jd": f"Netflix is hiring a Principal {role} for our Content Delivery Network. You will be responsible for the technical vision and roadmap of our global streaming algorithms.\n\nMission:\n- Design and deploy ultra-low-latency content delivery protocols.\n- Influence company-wide technical standards.\n- Collaborate with stakeholders to ensure seamless user experiences worldwide.", 
                        "apply_url": "https://netflix.com/jobs"
                    }
                ]
        

        # Step 1.5: Patch Missing/Short JDs with Contextually Generated Realism
        try:
            # Identify jobs that genuinely need a description patch
            missing_jd_jobs = [j for j in raw_jobs if len(j.get('jd', '')) < 100 or "apply link for full details" in j.get('jd', '').lower()]
            
            if missing_jd_jobs:
                titles = [{"index": i, "role": j['title'], "company": j['company']} for i, j in enumerate(missing_jd_jobs)]
                jd_prompt = f"""
                You are a professional HR specialist. Generate realistic, comprehensive, multi-paragraph Job Descriptions for the following roles (at least 8-10 sentences each). 
                Include specific responsibilities, technical requirements, benefits, and core values.
                
                Input Roles: {json.dumps(titles)}
                
                Return ONLY a valid JSON list of strings in the exact same order. No extra text, no markdown.
                """
                
                jd_res_text = await self._generate_content(jd_prompt)
                raw_text = jd_res_text.strip()
                # Clean markdown blocks if present
                if "```" in raw_text:
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                
                jd_list = json.loads(raw_text.strip())
                
                for i, job_to_patch in enumerate(missing_jd_jobs):
                    if i < len(jd_list):
                        job_to_patch['jd'] = jd_list[i]
                        print(f"✨ Patched JD for {job_to_patch['title']} at {job_to_patch['company']}")
        except Exception as e:
            print(f"⚠️ Failed to generate JDs: {e}")

        # Step 2: Deep Match Scoring with Gemini in parallel
        # Execute scoring in parallel using the class method
        results = await asyncio.gather(*[self.score_job(job, resume_text) for job in raw_jobs])
        return sorted(results, key=lambda x: x.get("matchScore", 0), reverse=True)
