"""
Folder Model - Chat and note organization
"""

from sqlalchemy import Column, String, Text, BigInteger
from database import Base
import time
import uuid


class Folder(Base):
    __tablename__ = "folder"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(String, nullable=True, index=True)

    created_at = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(time.time() * 1000), onupdate=lambda: int(time.time() * 1000))


# Pydantic schemas
from pydantic import BaseModel
from typing import Optional


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None


class FolderResponse(BaseModel):
    id: str
    user_id: str
    name: str
    parent_id: Optional[str]
    created_at: int
    updated_at: int

    class Config:
        from_attributes = True
