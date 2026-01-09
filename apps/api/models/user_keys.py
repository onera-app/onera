"""
UserKeys model - stores encrypted user encryption keys
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class UserKeys(Base):
    __tablename__ = "user_keys"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    
    # KEK derivation params
    kek_salt = Column(String, nullable=False)
    kek_ops_limit = Column(Integer, nullable=False)
    kek_mem_limit = Column(Integer, nullable=False)
    
    # Encrypted master key (encrypted by KEK)
    encrypted_master_key = Column(Text, nullable=False)
    master_key_nonce = Column(String, nullable=False)
    
    # Public/private key pair
    public_key = Column(String, nullable=False)
    encrypted_private_key = Column(Text, nullable=False)
    private_key_nonce = Column(String, nullable=False)
    
    # Recovery key (encrypted by master key)
    encrypted_recovery_key = Column(Text, nullable=False)
    recovery_key_nonce = Column(String, nullable=False)
    
    # Master key encrypted by recovery key (for account recovery)
    master_key_recovery = Column(Text, nullable=False)
    master_key_recovery_nonce = Column(String, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
