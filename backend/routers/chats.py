"""
Chats router - handles encrypted chat storage
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.chat import Chat
from routers.deps import get_current_user

router = APIRouter()


class ChatPayload(BaseModel):
    id: Optional[str] = None
    is_encrypted: bool = True
    encrypted_chat_key: Optional[str] = None
    chat_key_nonce: Optional[str] = None
    encrypted_title: Optional[str] = None
    title_nonce: Optional[str] = None
    encrypted_chat: Optional[str] = None
    chat_nonce: Optional[str] = None
    title: Optional[str] = None
    title_preview: Optional[str] = None


class CreateChatRequest(BaseModel):
    chat: ChatPayload


class ChatResponse(BaseModel):
    id: str
    chat: dict
    created_at: str
    updated_at: str


class ChatListItem(BaseModel):
    id: str
    title: str
    chat: dict
    created_at: str
    updated_at: str


@router.get("", response_model=List[ChatListItem])
async def list_chats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == user.id)
        .order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()
    
    return [
        ChatListItem(
            id=chat.id,
            title=chat.title_preview or "[Encrypted]",
            chat={
                "is_encrypted": chat.is_encrypted,
                "encrypted_chat_key": chat.encrypted_chat_key,
                "chat_key_nonce": chat.chat_key_nonce,
                "encrypted_title": chat.encrypted_title,
                "title_nonce": chat.title_nonce,
                "title_preview": chat.title_preview
            },
            created_at=chat.created_at.isoformat(),
            updated_at=chat.updated_at.isoformat()
        )
        for chat in chats
    ]


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    return ChatResponse(
        id=chat.id,
        chat={
            "is_encrypted": chat.is_encrypted,
            "encrypted_chat_key": chat.encrypted_chat_key,
            "chat_key_nonce": chat.chat_key_nonce,
            "encrypted_title": chat.encrypted_title,
            "title_nonce": chat.title_nonce,
            "encrypted_chat": chat.encrypted_chat,
            "chat_nonce": chat.chat_nonce,
            "title_preview": chat.title_preview
        },
        created_at=chat.created_at.isoformat(),
        updated_at=chat.updated_at.isoformat()
    )


@router.post("/new", response_model=ChatResponse)
async def create_chat(
    request: CreateChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    chat = Chat(
        id=request.chat.id,
        user_id=user.id,
        is_encrypted=request.chat.is_encrypted,
        encrypted_chat_key=request.chat.encrypted_chat_key,
        chat_key_nonce=request.chat.chat_key_nonce,
        encrypted_title=request.chat.encrypted_title,
        title_nonce=request.chat.title_nonce,
        encrypted_chat=request.chat.encrypted_chat,
        chat_nonce=request.chat.chat_nonce,
        title_preview=request.chat.title_preview or request.chat.title
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    
    return ChatResponse(
        id=chat.id,
        chat={
            "is_encrypted": chat.is_encrypted,
            "encrypted_chat_key": chat.encrypted_chat_key,
            "chat_key_nonce": chat.chat_key_nonce,
            "encrypted_title": chat.encrypted_title,
            "title_nonce": chat.title_nonce,
            "encrypted_chat": chat.encrypted_chat,
            "chat_nonce": chat.chat_nonce,
            "title_preview": chat.title_preview
        },
        created_at=chat.created_at.isoformat(),
        updated_at=chat.updated_at.isoformat()
    )


@router.post("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: str,
    request: CreateChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    # Update fields
    if request.chat.encrypted_chat_key:
        chat.encrypted_chat_key = request.chat.encrypted_chat_key
    if request.chat.chat_key_nonce:
        chat.chat_key_nonce = request.chat.chat_key_nonce
    if request.chat.encrypted_title:
        chat.encrypted_title = request.chat.encrypted_title
    if request.chat.title_nonce:
        chat.title_nonce = request.chat.title_nonce
    if request.chat.encrypted_chat:
        chat.encrypted_chat = request.chat.encrypted_chat
    if request.chat.chat_nonce:
        chat.chat_nonce = request.chat.chat_nonce
    if request.chat.title_preview or request.chat.title:
        chat.title_preview = request.chat.title_preview or request.chat.title
    
    await db.commit()
    await db.refresh(chat)
    
    return ChatResponse(
        id=chat.id,
        chat={
            "is_encrypted": chat.is_encrypted,
            "encrypted_chat_key": chat.encrypted_chat_key,
            "chat_key_nonce": chat.chat_key_nonce,
            "encrypted_title": chat.encrypted_title,
            "title_nonce": chat.title_nonce,
            "encrypted_chat": chat.encrypted_chat,
            "chat_nonce": chat.chat_nonce,
            "title_preview": chat.title_preview
        },
        created_at=chat.created_at.isoformat(),
        updated_at=chat.updated_at.isoformat()
    )


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    await db.delete(chat)
    await db.commit()
    
    return {"success": True}
