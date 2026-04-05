import requests
import json

def test_sweep():
    url = "http://localhost:8000/agent/daily-sweep"
    payload = {
        "user_email": "test-user@example.com",
        "preferences": {
            "role": "Frontend Engineer",
            "location": "Remote",
            "experience": "Senior"
        },
        "access_token": "ya29.fake-token" # This will trigger simulation fallback
    }
    
    print(f"🚀 [Test] Triggering Daily Sweep for {payload['user_email']}...")
    try:
        response = requests.post(url, json=payload)
        print("Status Code:", response.status_code)
        print("Response:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_sweep()
