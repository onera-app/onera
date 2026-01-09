"""
Credential model - stores encrypted LLM API credentials
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid

from database import Base


class Credential(Base):
    __tablename__ = "credentials"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    provider = Column(String, nullable=False)
    name = Column(String, nullable=False)
    
    # Encrypted credential data
    encrypted_data = Column(Text, nullable=False)
    iv = Column(String, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
