import asyncio
import os
from agents.mcp_client import call_gmail_mcp

async def test_check_inbox():
    print("🔍 [Verification] Checking inbox via MCP for 'google.com' replies...")
    res = await call_gmail_mcp("check_inbox_for_replies", {"company_domain": "google.com"})
    print("MCP Result:", res)

if __name__ == "__main__":
    asyncio.run(test_check_inbox())
