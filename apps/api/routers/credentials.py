"""
Credentials router - handles encrypted LLM credentials storage
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.credential import Credential
from routers.deps import get_current_user

router = APIRouter()


class CreateCredentialRequest(BaseModel):
    provider: str
    name: str
    encrypted_data: str
    iv: str


class CredentialResponse(BaseModel):
    id: str
    provider: str
    name: str
    encrypted_data: str
    iv: str
    created_at: str
    updated_at: str


@router.get("", response_model=List[CredentialResponse])
async def list_credentials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Credential)
        .where(Credential.user_id == user.id)
        .order_by(Credential.created_at.desc())
    )
    credentials = result.scalars().all()
    
    return [
        CredentialResponse(
            id=cred.id,
            provider=cred.provider,
            name=cred.name,
            encrypted_data=cred.encrypted_data,
            iv=cred.iv,
            created_at=cred.created_at.isoformat(),
            updated_at=cred.updated_at.isoformat()
        )
        for cred in credentials
    ]


@router.post("", response_model=CredentialResponse)
async def create_credential(
    request: CreateCredentialRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    credential = Credential(
        user_id=user.id,
        provider=request.provider,
        name=request.name,
        encrypted_data=request.encrypted_data,
        iv=request.iv
    )
    db.add(credential)
    await db.commit()
    await db.refresh(credential)
    
    return CredentialResponse(
        id=credential.id,
        provider=credential.provider,
        name=credential.name,
        encrypted_data=credential.encrypted_data,
        iv=credential.iv,
        created_at=credential.created_at.isoformat(),
        updated_at=credential.updated_at.isoformat()
    )


@router.post("/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: str,
    request: CreateCredentialRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Credential).where(Credential.id == credential_id, Credential.user_id == user.id)
    )
    credential = result.scalar_one_or_none()
    
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
    
    credential.provider = request.provider
    credential.name = request.name
    credential.encrypted_data = request.encrypted_data
    credential.iv = request.iv
    
    await db.commit()
    await db.refresh(credential)
    
    return CredentialResponse(
        id=credential.id,
        provider=credential.provider,
        name=credential.name,
        encrypted_data=credential.encrypted_data,
        iv=credential.iv,
        created_at=credential.created_at.isoformat(),
        updated_at=credential.updated_at.isoformat()
    )


@router.delete("/{credential_id}")
async def delete_credential(
    credential_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Credential).where(Credential.id == credential_id, Credential.user_id == user.id)
    )
    credential = result.scalar_one_or_none()
    
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
    
    await db.delete(credential)
    await db.commit()
    
    return {"success": True}
