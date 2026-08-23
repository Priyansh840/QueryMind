import uuid
from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class MessageBase(BaseModel):
    role: str
    content: str
    citations: Optional[List[dict]] = None
    metadata_json: Optional[dict] = None

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: uuid.UUID
    conversation_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    title: Optional[str] = None
    space_id: uuid.UUID

class ConversationCreate(ConversationBase):
    pass

class ConversationResponse(ConversationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ConversationWithMessagesResponse(ConversationResponse):
    messages: List[MessageResponse] = []
