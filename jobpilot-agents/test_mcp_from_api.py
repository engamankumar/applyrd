import httpx
import asyncio

async def test_api_mcp():
    url = "http://localhost:8000/agent/monitor-gmail"
    payload = {"company_domain": "vercel.com"}
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"🚀 Testing API -> MCP integration at {url}...")
            response = await client.post(url, json=payload, timeout=30.0)
            print("Status Code:", response.status_code)
            print("Response Data:", response.json())
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_api_mcp())
