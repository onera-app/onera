"""
Note Model - Encrypted notes storage
"""

from sqlalchemy import Column, String, Text, BigInteger, Boolean
from database import Base
import time
import uuid


class Note(Base):
    __tablename__ = "note"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)

    # Encrypted content (always encrypted in Cortex)
    encrypted_title = Column(Text, nullable=False)
    title_nonce = Column(String, nullable=False)
    encrypted_content = Column(Text, nullable=False)
    content_nonce = Column(String, nullable=False)

    # Metadata
    folder_id = Column(String, nullable=True, index=True)
    pinned = Column(Boolean, default=False)
    archived = Column(Boolean, default=False)

    created_at = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(time.time() * 1000), onupdate=lambda: int(time.time() * 1000))


# Pydantic schemas
from pydantic import BaseModel
from typing import Optional


class NoteCreate(BaseModel):
    id: Optional[str] = None
    encrypted_title: str
    title_nonce: str
    encrypted_content: str
    content_nonce: str
    folder_id: Optional[str] = None


class NoteUpdate(BaseModel):
    encrypted_title: Optional[str] = None
    title_nonce: Optional[str] = None
    encrypted_content: Optional[str] = None
    content_nonce: Optional[str] = None
    folder_id: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None


class NoteResponse(BaseModel):
    id: str
    user_id: str
    encrypted_title: str
    title_nonce: str
    encrypted_content: str
    content_nonce: str
    folder_id: Optional[str]
    pinned: bool
    archived: bool
    created_at: int
    updated_at: int

    class Config:
        from_attributes = True
