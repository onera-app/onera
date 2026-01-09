"""
Prompt Model - User prompt templates
"""

from sqlalchemy import Column, String, Text, BigInteger
from database import Base
import time
import uuid


class Prompt(Base):
    __tablename__ = "prompt"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)

    created_at = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(time.time() * 1000), onupdate=lambda: int(time.time() * 1000))


# Pydantic schemas
from pydantic import BaseModel
from typing import Optional


class PromptCreate(BaseModel):
    name: str
    description: Optional[str] = None
    content: str


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None


class PromptResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    content: str
    created_at: int
    updated_at: int

    class Config:
        from_attributes = True
