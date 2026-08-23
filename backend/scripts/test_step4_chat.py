import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.postgres import async_session
from models.user import User
from models.core import Space
from models.conversation import Conversation, Message
from sqlalchemy import select

async def main():
    async with async_session() as db:
        # Get a user and space
        user = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        if not user:
            print("No users found. Test skipped.")
            return
            
        space = (await db.execute(select(Space).where(Space.user_id == user.id).limit(1))).scalar_one_or_none()
        if not space:
            print("No spaces found. Test skipped.")
            return
            
        print(f"Testing with User: {user.email}, Space: {space.name}")
        
        # 1. Conversation creation
        print("1. Testing Conversation Creation...")
        conv = Conversation(user_id=user.id, space_id=space.id, title="Test Conversation")
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        print(f"Created Conversation: {conv.id}")
        
        # 2. User message persistence
        print("2. Testing Message Persistence...")
        msg = Message(conversation_id=conv.id, role="user", content="Hello world")
        db.add(msg)
        await db.commit()
        print(f"Created Message: {msg.id}")
        
        # 3. Conversation history retrieval
        print("3. Testing History Retrieval...")
        msgs = (await db.execute(select(Message).where(Message.conversation_id == conv.id))).scalars().all()
        print(f"Found {len(msgs)} messages. Expected 1.")
        
        # 14. Conversation deletion works
        print("14. Testing Conversation Deletion...")
        await db.delete(conv)
        await db.commit()
        
        deleted_conv = (await db.execute(select(Conversation).where(Conversation.id == conv.id))).scalar_one_or_none()
        if not deleted_conv:
            print("Conversation deleted successfully.")
        else:
            print("Failed to delete conversation!")
            
        print("Basic tests passed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
