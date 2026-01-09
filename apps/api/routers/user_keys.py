"""
User Keys router - handles E2EE key storage
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.user_keys import UserKeys
from routers.deps import get_current_user

router = APIRouter()


class UserKeysRequest(BaseModel):
    kek_salt: str
    kek_ops_limit: int
    kek_mem_limit: int
    encrypted_master_key: str
    master_key_nonce: str
    public_key: str
    encrypted_private_key: str
    private_key_nonce: str
    encrypted_recovery_key: str
    recovery_key_nonce: str
    master_key_recovery: str
    master_key_recovery_nonce: str


class UserKeysUpdateRequest(BaseModel):
    kek_salt: Optional[str] = None
    kek_ops_limit: Optional[int] = None
    kek_mem_limit: Optional[int] = None
    encrypted_master_key: Optional[str] = None
    master_key_nonce: Optional[str] = None


class UserKeysResponse(BaseModel):
    kek_salt: str
    kek_ops_limit: int
    kek_mem_limit: int
    encrypted_master_key: str
    master_key_nonce: str
    public_key: str
    encrypted_private_key: str
    private_key_nonce: str
    encrypted_recovery_key: str
    recovery_key_nonce: str
    master_key_recovery: str
    master_key_recovery_nonce: str


class HasKeysResponse(BaseModel):
    has_keys: bool


@router.get("/check", response_model=HasKeysResponse)
async def check_user_has_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user has E2EE keys set up"""
    result = await db.execute(
        select(UserKeys).where(UserKeys.user_id == user.id)
    )
    keys = result.scalar_one_or_none()
    return HasKeysResponse(has_keys=keys is not None)


@router.get("", response_model=Optional[UserKeysResponse])
async def get_user_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserKeys).where(UserKeys.user_id == user.id)
    )
    keys = result.scalar_one_or_none()
    
    if not keys:
        return None
    
    return UserKeysResponse(
        kek_salt=keys.kek_salt,
        kek_ops_limit=keys.kek_ops_limit,
        kek_mem_limit=keys.kek_mem_limit,
        encrypted_master_key=keys.encrypted_master_key,
        master_key_nonce=keys.master_key_nonce,
        public_key=keys.public_key,
        encrypted_private_key=keys.encrypted_private_key,
        private_key_nonce=keys.private_key_nonce,
        encrypted_recovery_key=keys.encrypted_recovery_key,
        recovery_key_nonce=keys.recovery_key_nonce,
        master_key_recovery=keys.master_key_recovery,
        master_key_recovery_nonce=keys.master_key_recovery_nonce
    )


@router.post("", response_model=UserKeysResponse)
async def create_user_keys(
    request: UserKeysRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if keys already exist
    result = await db.execute(
        select(UserKeys).where(UserKeys.user_id == user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User keys already exist"
        )
    
    keys = UserKeys(
        user_id=user.id,
        kek_salt=request.kek_salt,
        kek_ops_limit=request.kek_ops_limit,
        kek_mem_limit=request.kek_mem_limit,
        encrypted_master_key=request.encrypted_master_key,
        master_key_nonce=request.master_key_nonce,
        public_key=request.public_key,
        encrypted_private_key=request.encrypted_private_key,
        private_key_nonce=request.private_key_nonce,
        encrypted_recovery_key=request.encrypted_recovery_key,
        recovery_key_nonce=request.recovery_key_nonce,
        master_key_recovery=request.master_key_recovery,
        master_key_recovery_nonce=request.master_key_recovery_nonce
    )
    db.add(keys)
    await db.commit()
    await db.refresh(keys)
    
    return UserKeysResponse(
        kek_salt=keys.kek_salt,
        kek_ops_limit=keys.kek_ops_limit,
        kek_mem_limit=keys.kek_mem_limit,
        encrypted_master_key=keys.encrypted_master_key,
        master_key_nonce=keys.master_key_nonce,
        public_key=keys.public_key,
        encrypted_private_key=keys.encrypted_private_key,
        private_key_nonce=keys.private_key_nonce,
        encrypted_recovery_key=keys.encrypted_recovery_key,
        recovery_key_nonce=keys.recovery_key_nonce,
        master_key_recovery=keys.master_key_recovery,
        master_key_recovery_nonce=keys.master_key_recovery_nonce
    )


@router.post("/update", response_model=UserKeysResponse)
async def update_user_keys(
    request: UserKeysUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserKeys).where(UserKeys.user_id == user.id)
    )
    keys = result.scalar_one_or_none()
    
    if not keys:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User keys not found"
        )
    
    # Update only provided fields (for password change)
    if request.kek_salt:
        keys.kek_salt = request.kek_salt
    if request.kek_ops_limit:
        keys.kek_ops_limit = request.kek_ops_limit
    if request.kek_mem_limit:
        keys.kek_mem_limit = request.kek_mem_limit
    if request.encrypted_master_key:
        keys.encrypted_master_key = request.encrypted_master_key
    if request.master_key_nonce:
        keys.master_key_nonce = request.master_key_nonce
    
    await db.commit()
    await db.refresh(keys)
    
    return UserKeysResponse(
        kek_salt=keys.kek_salt,
        kek_ops_limit=keys.kek_ops_limit,
        kek_mem_limit=keys.kek_mem_limit,
        encrypted_master_key=keys.encrypted_master_key,
        master_key_nonce=keys.master_key_nonce,
        public_key=keys.public_key,
        encrypted_private_key=keys.encrypted_private_key,
        private_key_nonce=keys.private_key_nonce,
        encrypted_recovery_key=keys.encrypted_recovery_key,
        recovery_key_nonce=keys.recovery_key_nonce,
        master_key_recovery=keys.master_key_recovery,
        master_key_recovery_nonce=keys.master_key_recovery_nonce
    )
