"""
Test script for MYND Document Ingestion Pipeline.
Uploads a dummy document to the API, then tests the RAG retriever to see if it finds it.
"""

import httpx
import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import uuid
import uuid as uuid_lib

API_URL = "http://api:8000/api/v1"
TEST_USER_ID = str(uuid_lib.uuid4())
TEST_SPACE_ID = str(uuid_lib.uuid4())

async def run_test():
    global TEST_USER_ID, TEST_SPACE_ID
    print("--- Testing Document Ingestion Pipeline ---")
    
    # 1. Create a dummy text file
    dummy_filepath = "test_document_ai.txt"
    with open(dummy_filepath, "w") as f:
        f.write("Project MYND is an advanced artificial intelligence system designed to act as a second brain. ")
        f.write("Its core architecture uses LangGraph for multi-agent orchestration, Qdrant for vector storage, ")
        f.write("and Ollama for local LLM inference. It was created in August 2026. ")
        f.write("The primary engineer on the backend is an AI agent named Antigravity.")
    
    print(f"Created dummy file: {dummy_filepath}")
    print(f"Mock User ID: {TEST_USER_ID}")
    print(f"Mock Space ID: {TEST_SPACE_ID}")
    
    try:
        # Pre-requisite: Insert mock user and space
        print("Initializing mock User and Space in Database...")
        from database.postgres import async_session
        from models.user import User
        from models.core import Space
        from sqlalchemy import select
        
        async with async_session() as session:
            # Check if user exists
            result = await session.execute(select(User).where(User.email == "test_ingest@example.com"))
            user = result.scalar_one_or_none()
            if not user:
                user = User(id=uuid_lib.UUID(TEST_USER_ID), email="test_ingest@example.com")
                session.add(user)
                await session.flush()
            else:
                TEST_USER_ID = str(user.id) # use the existing user ID
                
            # Check if space exists
            result = await session.execute(select(Space).where(Space.name == "Test Space"))
            space = result.scalar_one_or_none()
            if not space:
                space = Space(id=uuid_lib.UUID(TEST_SPACE_ID), user_id=user.id, name="Test Space")
                session.add(space)
                await session.flush()
            else:
                TEST_SPACE_ID = str(space.id) # use the existing space ID
                
            await session.commit()
            
        # 2. Upload the document via API
        print("\nUploading document to API...")
        async with httpx.AsyncClient(timeout=120.0) as client:
            with open(dummy_filepath, "rb") as f:
                files = {"file": ("test_document_ai.txt", f, "text/plain")}
                data = {
                    "user_id": TEST_USER_ID,
                    "space_id": TEST_SPACE_ID
                }
                response = await client.post(f"{API_URL}/documents/upload", files=files, data=data)
                
                if response.status_code != 200:
                    print(f"[ERROR] Failed to upload document: {response.text}")
                    return
                    
                result = response.json()
                print(f"Upload successful! Document ID: {result['document_id']}")
                
        # 3. Test Retrieval via Graph directly
        print("\nTesting RAG Retriever via Graph...")
        
        query = "What is the core architecture of Project MYND?"
        print(f"Querying Orchestrator Graph: '{query}'")
        
        from orchestrator.graph import get_orchestrator
        graph = get_orchestrator()
        from langchain_core.messages import HumanMessage
        from database.postgres import async_session
        from models.orchestrator import Objective
        
        async with async_session() as session:
            # We need to mock a user and objective since graph expects them in DB
            from models.user import User
            user = await session.get(User, uuid_lib.UUID(TEST_USER_ID))
            if not user:
                user = User(id=uuid_lib.UUID(TEST_USER_ID), email="test_ingest@example.com")
                session.add(user)
                await session.flush()
                
            objective = Objective(id=uuid_lib.uuid4(), user_id=user.id, raw_input="Test Ingestion")
            session.add(objective)
            await session.commit()
            
            inputs = {
                "messages": [HumanMessage(content=query)],
                "raw_query": query,
                "user_id": str(user.id),
                "space_id": TEST_SPACE_ID,
                "objective_id": str(objective.id)
            }
            
            # Run graph
            config = {
                "configurable": {
                    "thread_id": "test_ingestion_thread",
                    "db": session
                }
            }
            
            print("Invoking Orchestrator Graph...")
            async for event in graph.astream(inputs, config=config):
                for node_name, node_state in event.items():
                    print(f"--- Node: {node_name} ---")
                    if node_name == "synthesizer" and "final_synthesis" in node_state:
                        print("\nFinal Synthesis:")
                        print(node_state["final_synthesis"])
                        
            print("\nPipeline Test Completed Successfully!")
            
            if "LangGraph" in node_state.get("final_synthesis", "") or "Qdrant" in node_state.get("final_synthesis", ""):
                print("\n[SUCCESS] The AI successfully retrieved facts from the uploaded document!")
            else:
                print("\n[WARNING] The AI responded, but didn't seem to include the facts from the document.")

    finally:
        if os.path.exists(dummy_filepath):
            os.remove(dummy_filepath)
            print(f"Cleaned up {dummy_filepath}")

if __name__ == "__main__":
    asyncio.run(run_test())
