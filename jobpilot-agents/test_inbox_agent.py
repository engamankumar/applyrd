import asyncio
import os
import json
from agents.inbox_agent import InboxAgent
from google import genai as gai
from dotenv import load_dotenv

load_dotenv()

async def test_agent():
    print("🚀 Testing InboxAgent with dummy emails...")
    
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("❌ No API key found.")
        return
        
    client = gai.Client(api_key=key)
    agent = InboxAgent(client=client)
    
    # Mock some emails
    emails = [
        {
            "id": "msg1",
            "subject": "Application Received: Senior Frontend Engineer at Vercel",
            "from": "recruiting@vercel.com",
            "snippet": "Thanks for your application for the Senior Frontend Engineer role..."
        },
        {
            "id": "msg2",
            "subject": "Interview with Google",
            "from": "hr@google.com",
            "snippet": "We'd like to invite you for an interview regarding your application..."
        },
        {
            "id": "msg3",
            "subject": "Update on your application",
            "from": "no-reply@meta.com",
            "snippet": "Unfortunately, we've decided not to move forward with your application..."
        }
    ]
    
    results = await agent.classify_and_extract(emails)
    
    print("\n📬 Classification Results:")
    for r in results:
        print(f"[{r['classification'].upper()}] - {r['company_name']} ({r['job_title']}) - Conf: {r['confidence_score']}%")

if __name__ == "__main__":
    asyncio.run(test_agent())
