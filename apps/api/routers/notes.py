"""
Notes Router - CRUD operations for encrypted notes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List
import uuid

from database import get_db
from models.note import Note, NoteCreate, NoteUpdate, NoteResponse
from routers.deps import get_current_user
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[NoteResponse])
async def get_notes(
    folder_id: str = None,
    archived: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all notes for the current user"""
    query = select(Note).where(
        Note.user_id == user.id,
        Note.archived == archived
    )
    if folder_id:
        query = query.where(Note.folder_id == folder_id)

    query = query.order_by(Note.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get a specific note"""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return note


@router.post("/", response_model=NoteResponse)
async def create_note(
    form: NoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new encrypted note"""
    note = Note(
        id=form.id or str(uuid.uuid4()),
        user_id=user.id,
        encrypted_title=form.encrypted_title,
        title_nonce=form.title_nonce,
        encrypted_content=form.encrypted_content,
        content_nonce=form.content_nonce,
        folder_id=form.folder_id
    )

    db.add(note)
    await db.commit()
    await db.refresh(note)

    return note


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    form: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update an encrypted note"""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = form.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)

    await db.commit()
    await db.refresh(note)

    return note


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a note"""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.delete(note)
    await db.commit()

    return {"status": "success"}
