import asyncio
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def call_gmail_mcp(tool_name: str, arguments: dict):
    """
    Connects to the local Gmail MCP Server via standard IO and calls a specific tool.
    This demonstrates real Model Context Protocol usage.
    """
    # Use system python on Cloud Run
    python_path = "python3"
    server_params = StdioServerParameters(
        command=python_path,
        args=["agents/mcp_gmail_server.py"],
        env=None
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                # Execute the MCP Tool
                print(f"🛠️ [MCP Client] Calling tool '{tool_name}' with args keys: {list(arguments.keys())}")
                result = await session.call_tool(tool_name, arguments)

                return result

    except Exception as e:
        print(f"MCP Connection Error: {e}")
        return None
