import os
import asyncio
from google import genai
from dotenv import load_dotenv

# Load from current directory or root
load_dotenv(".env")
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_ADK_API_KEY")
client = genai.Client(api_key=api_key)

async def test_flagship_models():
    # TEST PRODUCTION IDs FROM DASHBOARD
    models_to_test = [
        "models/gemini-3.1-flash-lite",      # 4,000 QPM
        "models/gemini-2.5-flash-lite",      # 4,000 QPM
        "models/gemini-3.1-pro"              # 25 QPM
    ]
    
    print(f"🚀 [Production Pulse Test] Testing high-quota models with API Key: {api_key[:6]}...")
    
    for m_id in models_to_test:
        try:
            print(f"📡 Testing {m_id}...", end=" ", flush=True)
            response = await client.aio.models.generate_content(
                model=m_id, 
                contents="Say 'Production Active'."
            )
            print(f"✅ SUCCESS: {response.text.strip()}")
        except Exception as e:
            print(f"❌ FAILED: {str(e)[:150]}")

if __name__ == "__main__":
    asyncio.run(test_flagship_models())
