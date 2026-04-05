import os
import base64
from typing import List, Dict
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

class GmailTool:
    def __init__(self, access_token: str):
        self.creds = Credentials(token=access_token)
        self.service = build('gmail', 'v1', credentials=self.creds)

    async def list_messages(self, query: str = "label:INBOX", max_results: int = 20) -> List[Dict]:
        try:
            results = self.service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            detailed_messages = []
            for msg in messages:
                txt = self.service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
                
                # Basic metadata extraction
                payload = txt.get('payload', {})
                headers = payload.get('headers', [])
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "No Subject")
                snippet = txt.get('snippet', "")
                
                detailed_messages.append({
                    "id": msg['id'],
                    "subject": subject,
                    "snippet": snippet,
                    "body": self._get_body(payload)
                })
                
            return detailed_messages
        except Exception as e:
            print(f"Gmail API Error: {e}")
            return []

    def _get_body(self, payload: Dict) -> str:
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', "")
                    return base64.urlsafe_b64decode(data).decode('utf-8')
        elif 'body' in payload:
            data = payload['body'].get('data', "")
            return base64.urlsafe_b64decode(data).decode('utf-8')
        return ""
