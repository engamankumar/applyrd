import asyncio
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test():
    python_path = os.path.join(os.getcwd(), "venv", "bin", "python3")
    server_params = StdioServerParameters(
        command=python_path,
        args=["agents/mcp_gmail_server.py"],
        env=None
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("--- Calling check_inbox_for_replies ---")
            result = await session.call_tool("check_inbox_for_replies", {"company_domain": "vercel.com"})
            print(f"Result: {result}")
            
            print("\n--- Calling send_gmail ---")
            mail_result = await session.call_tool("send_gmail", {
                "recipient": "test@example.com",
                "subject": "Greetings",
                "body": "Hello from MCP!"
            })
            print(f"Mail Result: {mail_result}")

if __name__ == "__main__":
    asyncio.run(test())
