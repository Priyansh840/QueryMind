import asyncio
import os
import sys
import time
import uuid

# Add the backend directory to sys.path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Simple terminal colors for a nice presentation
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_step(title, description=""):
    print(f"\n{Colors.HEADER}{Colors.BOLD}===================================================={Colors.ENDC}")
    print(f"{Colors.CYAN}{Colors.BOLD}STEP: {title}{Colors.ENDC}")
    if description:
        print(f"{Colors.CYAN}{description}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}===================================================={Colors.ENDC}")

def pause():
    input(f"\n{Colors.WARNING}Press [ENTER] to continue to the next step...{Colors.ENDC}")

async def run_demo():
    print(f"{Colors.GREEN}{Colors.BOLD}Starting MYND Orchestrator Presentation...{Colors.ENDC}\n")
    
    # Imports inside to avoid loading overhead before the script starts
    from rag.ingestion import process_document
    from orchestrator.graph import get_orchestrator
    from database.postgres import async_session
    from models.user import User
    from models.core import Space
    from models.orchestrator import Objective
    from sqlalchemy import select
    from langchain_core.messages import HumanMessage
    import uuid as uuid_lib

    # Setup Mocks
    TEST_USER_ID = str(uuid_lib.uuid4())
    TEST_SPACE_ID = str(uuid_lib.uuid4())
    dummy_file_path = "demo_document.txt"
    dummy_content = """
    Project MYND - Core Architecture
    Project MYND is an advanced artificial intelligence system designed to act as a second brain for students and professionals.
    Its core architecture consists of three main pillars:
    1. Multi-agent orchestration using LangGraph. This allows different AI agents to collaborate on complex tasks.
    2. Vector storage using Qdrant. This ensures that documents are semantically searchable while maintaining strict user data isolation.
    3. Local LLM inference using Ollama. This guarantees privacy and allows the system to run locally without external API dependencies.
    The primary backend language is Python, specifically using the FastAPI framework for high-performance async endpoints.
    """
    
    with open(dummy_file_path, "w", encoding="utf-8") as f:
        f.write(dummy_content)

    print_step("1. Environment Initialization", "Setting up Mock User and Workspace in PostgreSQL database.")
    
    async with async_session() as session:
        # Create User
        user = User(id=uuid_lib.UUID(TEST_USER_ID), email=f"demo_{uuid_lib.uuid4().hex[:6]}@example.com")
        session.add(user)
        await session.flush()
        
        # Create Space
        space = Space(id=uuid_lib.UUID(TEST_SPACE_ID), user_id=user.id, name="Professor Demo Space")
        session.add(space)
        await session.commit()
        print(f"{Colors.GREEN}✔ User created (ID: {user.id}){Colors.ENDC}")
        print(f"{Colors.GREEN}✔ Workspace 'Professor Demo Space' created (ID: {space.id}){Colors.ENDC}")
    
    pause()

    print_step("2. Document Ingestion Pipeline", "Uploading a document, chunking it, embedding it, and storing in Qdrant.")
    print(f"{Colors.BOLD}Document Content being uploaded:{Colors.ENDC}\n{dummy_content.strip()}")
    
    async with async_session() as session:
        doc_record = await process_document(
            file_path=dummy_file_path,
            filename="Project_MYND_Architecture.txt",
            content_type="text/plain",
            user_id=TEST_USER_ID,
            space_id=TEST_SPACE_ID,
            db=session
        )
        print(f"\n{Colors.GREEN}✔ Document Chunked and Embedded!{Colors.ENDC}")
        print(f"{Colors.GREEN}✔ Vectors stored securely in Qdrant under User/Space isolation.{Colors.ENDC}")
    
    pause()

    print_step("3. User Query & Graph Initialization", "Setting up the LangGraph Orchestrator for an AI query.")
    query = "Explain the three main pillars of Project MYND's architecture."
    print(f"{Colors.BLUE}{Colors.BOLD}User Query:{Colors.ENDC} '{query}'")
    
    graph = get_orchestrator()
    print(f"{Colors.GREEN}✔ LangGraph Orchestrator Compiled{Colors.ENDC}")
    
    async with async_session() as session:
        objective = Objective(id=uuid_lib.uuid4(), user_id=user.id, raw_input=query)
        session.add(objective)
        await session.commit()
        
        inputs = {
            "messages": [HumanMessage(content=query)],
            "raw_query": query,
            "user_id": str(user.id),
            "space_id": TEST_SPACE_ID,
            "objective_id": str(objective.id)
        }
        config = {
            "configurable": {
                "thread_id": "demo_thread",
                "db": session
            }
        }
        
        pause()

        print_step("4. Agent Execution: The Researcher", "The Researcher agent queries the Vector DB and extracts raw facts using strict JSON constraints.")
        print(f"{Colors.CYAN}Waiting for Researcher Agent...{Colors.ENDC}")
        
        async for event in graph.astream(inputs, config=config):
            for node_name, node_state in event.items():
                if node_name == "researcher":
                    findings = node_state.get("research_findings", {})
                    print(f"\n{Colors.GREEN}✔ Researcher Completed!{Colors.ENDC}")
                    print(f"{Colors.BOLD}Raw Facts Extracted (JSON):{Colors.ENDC}")
                    import json
                    print(f"{Colors.BLUE}{json.dumps(findings, indent=2)}{Colors.ENDC}")
                    
                    pause()
                    print_step("5. Agent Execution: The Synthesizer", "The Synthesizer agent takes the raw JSON facts and writes a structured, human-friendly markdown response.")
                    print(f"{Colors.CYAN}Waiting for Synthesizer Agent...{Colors.ENDC}")
                    
                elif node_name == "synthesizer":
                    print(f"\n{Colors.GREEN}✔ Synthesizer Completed!{Colors.ENDC}")
                    print(f"{Colors.BOLD}Final AI Response:{Colors.ENDC}\n")
                    print(f"{node_state.get('final_synthesis')}")
                    
    # Cleanup
    if os.path.exists(dummy_file_path):
        os.remove(dummy_file_path)
        
    print(f"\n{Colors.HEADER}{Colors.BOLD}===================================================={Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}DEMO COMPLETED SUCCESSFULLY!{Colors.ENDC}")

if __name__ == "__main__":
    asyncio.run(run_demo())
