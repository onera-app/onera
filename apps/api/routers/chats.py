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


class CreateChatRequest(BaseModel):
    id: Optional[str] = None
    encrypted_chat_key: str
    chat_key_nonce: str
    encrypted_title: str
    title_nonce: str
    encrypted_chat: str
    chat_nonce: str
    folder_id: Optional[str] = None


class UpdateChatRequest(BaseModel):
    encrypted_title: Optional[str] = None
    title_nonce: Optional[str] = None
    encrypted_chat: Optional[str] = None
    chat_nonce: Optional[str] = None
    folder_id: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None


class ChatResponse(BaseModel):
    id: str
    user_id: str
    encrypted_chat_key: str
    chat_key_nonce: str
    encrypted_title: str
    title_nonce: str
    encrypted_chat: str
    chat_nonce: str
    folder_id: Optional[str] = None
    pinned: bool = False
    archived: bool = False
    created_at: int
    updated_at: int


class ChatListItemResponse(BaseModel):
    id: str
    user_id: str
    encrypted_title: str
    title_nonce: str
    encrypted_chat_key: str
    chat_key_nonce: str
    folder_id: Optional[str] = None
    pinned: bool = False
    archived: bool = False
    created_at: int
    updated_at: int


@router.get("", response_model=List[ChatListItemResponse])
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
        ChatListItemResponse(
            id=chat.id,
            user_id=chat.user_id,
            encrypted_title=chat.encrypted_title or "",
            title_nonce=chat.title_nonce or "",
            encrypted_chat_key=chat.encrypted_chat_key or "",
            chat_key_nonce=chat.chat_key_nonce or "",
            folder_id=chat.folder_id,
            pinned=chat.pinned or False,
            archived=chat.archived or False,
            created_at=int(chat.created_at.timestamp()),
            updated_at=int(chat.updated_at.timestamp())
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
        user_id=chat.user_id,
        encrypted_chat_key=chat.encrypted_chat_key or "",
        chat_key_nonce=chat.chat_key_nonce or "",
        encrypted_title=chat.encrypted_title or "",
        title_nonce=chat.title_nonce or "",
        encrypted_chat=chat.encrypted_chat or "",
        chat_nonce=chat.chat_nonce or "",
        folder_id=chat.folder_id,
        pinned=chat.pinned or False,
        archived=chat.archived or False,
        created_at=int(chat.created_at.timestamp()),
        updated_at=int(chat.updated_at.timestamp())
    )


@router.post("/new", response_model=ChatResponse)
async def create_chat(
    request: CreateChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    chat_id = request.id or str(uuid.uuid4())

    chat = Chat(
        id=chat_id,
        user_id=user.id,
        is_encrypted=True,
        encrypted_chat_key=request.encrypted_chat_key,
        chat_key_nonce=request.chat_key_nonce,
        encrypted_title=request.encrypted_title,
        title_nonce=request.title_nonce,
        encrypted_chat=request.encrypted_chat,
        chat_nonce=request.chat_nonce,
        folder_id=request.folder_id
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)

    return ChatResponse(
        id=chat.id,
        user_id=chat.user_id,
        encrypted_chat_key=chat.encrypted_chat_key or "",
        chat_key_nonce=chat.chat_key_nonce or "",
        encrypted_title=chat.encrypted_title or "",
        title_nonce=chat.title_nonce or "",
        encrypted_chat=chat.encrypted_chat or "",
        chat_nonce=chat.chat_nonce or "",
        folder_id=chat.folder_id,
        pinned=chat.pinned or False,
        archived=chat.archived or False,
        created_at=int(chat.created_at.timestamp()),
        updated_at=int(chat.updated_at.timestamp())
    )


@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: str,
    request: UpdateChatRequest,
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
    if request.encrypted_title is not None:
        chat.encrypted_title = request.encrypted_title
    if request.title_nonce is not None:
        chat.title_nonce = request.title_nonce
    if request.encrypted_chat is not None:
        chat.encrypted_chat = request.encrypted_chat
    if request.chat_nonce is not None:
        chat.chat_nonce = request.chat_nonce
    if request.folder_id is not None:
        chat.folder_id = request.folder_id
    if request.pinned is not None:
        chat.pinned = request.pinned
    if request.archived is not None:
        chat.archived = request.archived

    await db.commit()
    await db.refresh(chat)

    return ChatResponse(
        id=chat.id,
        user_id=chat.user_id,
        encrypted_chat_key=chat.encrypted_chat_key or "",
        chat_key_nonce=chat.chat_key_nonce or "",
        encrypted_title=chat.encrypted_title or "",
        title_nonce=chat.title_nonce or "",
        encrypted_chat=chat.encrypted_chat or "",
        chat_nonce=chat.chat_nonce or "",
        folder_id=chat.folder_id,
        pinned=chat.pinned or False,
        archived=chat.archived or False,
        created_at=int(chat.created_at.timestamp()),
        updated_at=int(chat.updated_at.timestamp())
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
