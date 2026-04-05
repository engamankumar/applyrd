import os
from dotenv import load_dotenv
load_dotenv()
try:
    from google import genai
    api_key = os.getenv("GOOGLE_ADK_API_KEY")
    client = genai.Client(api_key=api_key)
    print("Listing models for API key...")
    for model in client.models.list():
        print(f"- {model.name}")
except Exception as e:
    print(f"Error: {e}")
