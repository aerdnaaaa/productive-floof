from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Tag
from app.schemas.schemas import TagCreate, TagUpdate, TagResponse

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("", response_model=List[TagResponse])
def read_tags(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tags."
        )
    return db.query(Tag).filter(Tag.user_id == current_user.id).all()


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(tag_in: TagCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tags."
        )
    # Check if a tag with the same name and parent_id already exists for this user to avoid duplicates
    existing = db.query(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name == tag_in.name,
        Tag.parent_id == tag_in.parent_id
    ).first()
    if existing:
        return existing
    
    # Verify that the parent tag exists and belongs to the current user
    if tag_in.parent_id is not None:
        parent = db.query(Tag).filter(Tag.id == tag_in.parent_id, Tag.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent tag not found or does not belong to user"
            )
    
    tag = Tag(name=tag_in.name, user_id=current_user.id, parent_id=tag_in.parent_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{id}", response_model=TagResponse)
def update_tag(id: int, tag_in: TagUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tags."
        )
    tag = db.query(Tag).filter(Tag.id == id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    tag.name = tag_in.name
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tags."
        )
    tag = db.query(Tag).filter(Tag.id == id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return
