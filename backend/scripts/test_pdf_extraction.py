import asyncio
import httpx
import json

API_URL = "http://localhost:8000/api/v1"
SPACE_ID = "e788c2a5-6234-4697-9d6e-886f6f4d00bd"
USER_ID = "eea9d3bc-d38e-4abd-ae29-14878860e8af"
PDF_PATH = "dummy.txt"

async def test_pdf_extraction():
    async with httpx.AsyncClient() as client:
        print("1. Uploading PDF to API...")
        with open(PDF_PATH, "rb") as f:
            files = {"file": (PDF_PATH, f, "text/plain")}
            data = {"space_id": SPACE_ID, "user_id": USER_ID}
            response = await client.post(f"{API_URL}/documents/upload", data=data, files=files, timeout=60.0)
            
        if response.status_code != 200:
            print(f"Upload failed: {response.text}")
            return
            
        print(f"Upload Success: {response.json()}")
        
        print("\n2. Running Orchestrator with RAG query on the PDF...")
        chat_req = {
            "query": "What does the dummy PDF say?",
            "space_id": SPACE_ID,
            "user_id": USER_ID
        }
        
        chat_resp = await client.post(f"{API_URL}/chat/", json=chat_req, timeout=120.0)
        
        if chat_resp.status_code != 200:
            print(f"Chat failed: {chat_resp.text}")
            return
            
        chat_data = chat_resp.json()
        print("\n--- FINAL SYNTHESIS FROM RAG ---")
        print(chat_data["response"])
        
        print("\n3. Fetching Execution Trace...")
        trace_resp = await client.get(f"{API_URL}/objectives/{chat_data['objective_id']}/trace")
        trace_data = trace_resp.json()
        print("\n--- EXECUTION TRACE ---")
        for event in trace_data["trace"]:
            print(f"[{event['timestamp']}] {event['message']}")

if __name__ == "__main__":
    asyncio.run(test_pdf_extraction())
