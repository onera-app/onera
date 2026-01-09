"""
Prompts Router - CRUD operations for prompt templates
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from database import get_db
from models.prompt import Prompt, PromptCreate, PromptUpdate, PromptResponse
from routers.deps import get_current_user
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[PromptResponse])
async def get_prompts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all prompts for the current user"""
    result = await db.execute(
        select(Prompt)
        .where(Prompt.user_id == user.id)
        .order_by(Prompt.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get a specific prompt"""
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    return prompt


@router.post("/", response_model=PromptResponse)
async def create_prompt(
    form: PromptCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new prompt"""
    prompt = Prompt(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=form.name,
        description=form.description,
        content=form.content
    )

    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)

    return prompt


@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: str,
    form: PromptUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update a prompt"""
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    update_data = form.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)

    await db.commit()
    await db.refresh(prompt)

    return prompt


@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a prompt"""
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    await db.delete(prompt)
    await db.commit()

    return {"status": "success"}
