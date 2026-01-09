"""
Chat model - stores encrypted chat data
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid

from database import Base


class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Encryption metadata
    is_encrypted = Column(Boolean, default=True)
    encrypted_chat_key = Column(Text, nullable=True)
    chat_key_nonce = Column(String, nullable=True)
    
    # Encrypted content
    encrypted_title = Column(Text, nullable=True)
    title_nonce = Column(String, nullable=True)
    encrypted_chat = Column(Text, nullable=True)
    chat_nonce = Column(String, nullable=True)
    
    # Plaintext preview for locked state
    title_preview = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
