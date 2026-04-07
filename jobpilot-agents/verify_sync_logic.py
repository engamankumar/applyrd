import asyncio
import os
import sys
import json
from unittest.mock import MagicMock, patch

# Ensure current directory is in path
sys.path.append(os.getcwd())

async def test_sync_logic():
    print("🧪 [Test] Verifying end-to-end Inbox Sync logic...")
    
    # Define a mock for the MCP response
    class MockMCPResponse:
        def __init__(self, content):
            self.content = [MagicMock(text=json.dumps(content))]

    # 1. Mock Data: Emails from companies we already 'applied' to, and a new one
    mock_emails = [
        {
            "id": "e1",
            "subject": "Interview Invite: Frontend Role at Google",
            "from": "recruiting@google.com",
            "snippet": "We saw your application and want to schedule an interview."
        },
        {
            "id": "e2",
            "subject": "Update regarding Meta",
            "from": "hr@meta.com",
            "snippet": "Thank you for your interest, but we are moving forward with other candidates."
        }
    ]
    
    # 2. Mock classification results (as if from InboxAgent/Gemini)
    mock_results = [
        {
            "id": "e1",
            "classification": "interview_invite",
            "company_name": "Google",
            "job_title": "Frontend Role",
            "confidence_score": 100
        },
        {
            "id": "e2", 
            "classification": "rejection",
            "company_name": "Meta",
            "job_title": "Software Engineer",
            "confidence_score": 100
        }
    ]

    # Pre-patch to avoid top-level agent initialization errors
    with patch("api.main.gemini_client", MagicMock()), \
         patch("api.main.get_agents", return_value=None), \
         patch("api.main.call_gmail_mcp", return_value=mock_emails), \
         patch("api.main.inbox_agent") as mock_agent, \
         patch("api.main.get_db_connection") as mock_get_db:
        
        mock_agent.classify_and_extract.return_value = mock_results
        
        # Setup Mock DB
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cur
        
        # Return dictionaries to simulate RealDictCursor
        mock_cur.fetchone.side_effect = [
            {"id": "job_google_1"}, # For job lookup (Google)
            None,                   # For job lookup (Meta)
            {"id": "resume_abc_123"} # For resume lookup
        ]
        
        from api.main import sync_gmail_inbox
        
        print("⚡ Executing sync_gmail_inbox...")
        await sync_gmail_inbox("user_123", "test@example.com", "token_123")
        
        print("\n✅ [Success] Sync execution completed without errors.")
        
        # Verify DB calls
        calls = [c[0][0] for c in mock_cur.execute.call_args_list]
        print("\n📝 DB Operations performed:")
        for c in calls:
            cmd = c.strip().split("\n")[0][:100]
            print(f"  - {cmd}...")

        # Find status updates
        updates = [c for c in calls if "UPDATE" in c]
        inserts = [c for c in calls if "INSERT" in c]
        
        print(f"\n📊 Summary: {len(updates)} status updates, {len(inserts)} new entries.")
        
        if len(updates) > 0 and len(inserts) > 0:
            print("\n🌟 End-to-end logic verified: Updated Apps and Shadows created!")

if __name__ == "__main__":
    asyncio.run(test_sync_logic())
