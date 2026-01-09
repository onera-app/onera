"""
Folders Router - CRUD operations for folder organization
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
import uuid

from database import get_db
from models.folder import Folder, FolderCreate, FolderUpdate, FolderResponse
from routers.deps import get_current_user
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[FolderResponse])
async def get_folders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all folders for the current user"""
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == user.id)
        .order_by(Folder.name)
    )
    return result.scalars().all()


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get a specific folder"""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user.id)
    )
    folder = result.scalar_one_or_none()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return folder


@router.post("/", response_model=FolderResponse)
async def create_folder(
    form: FolderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new folder"""
    folder = Folder(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=form.name,
        parent_id=form.parent_id
    )

    db.add(folder)
    await db.commit()
    await db.refresh(folder)

    return folder


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: str,
    form: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update a folder"""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user.id)
    )
    folder = result.scalar_one_or_none()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    update_data = form.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(folder, key, value)

    await db.commit()
    await db.refresh(folder)

    return folder


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a folder (does not delete contents)"""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user.id)
    )
    folder = result.scalar_one_or_none()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    await db.delete(folder)
    await db.commit()

    return {"status": "success"}
