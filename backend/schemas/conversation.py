import uuid
from typing import List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field

class MessageBase(BaseModel):
    role: str = "user"
    content: str
    citations: Optional[List[dict]] = None
    metadata_json: Optional[dict] = None

class MessageCreate(BaseModel):
    role: Optional[str] = "user"
    content: str
    metadata_json: Optional[dict] = None

class MessageResponse(MessageBase):
    id: uuid.UUID
    conversation_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    title: Optional[str] = None
    space_id: Union[uuid.UUID, str]

class ConversationCreate(ConversationBase):
    pass

class ConversationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str] = None
    space_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ConversationWithMessagesResponse(ConversationResponse):
    messages: List[MessageResponse] = []
