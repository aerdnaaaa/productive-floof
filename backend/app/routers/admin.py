from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
import os
import shutil
import sqlite3
from app.core.config import settings
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db, engine
from app.core.security import get_password_hash
from app.models.models import User, Task, Tag
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    print(current_user.is_admin)
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrator can perform this action"
        )
    return current_user

@router.get("/users")
def get_users_list(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    result = []
    for user in users:
        tasks_count = db.query(Task).filter(Task.user_id == user.id).count()
        tags_count = db.query(Tag).filter(Tag.user_id == user.id).count()
        result.append({
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "tasks_count": tasks_count,
            "tags_count": tags_count
        })
    return result

@router.put("/users/{user_id}/toggle-admin")
def toggle_user_admin(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot toggle your own admin status"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.is_admin = not user.is_admin
    db.commit()
    return {"message": "User admin status updated successfully", "is_admin": user.is_admin}

class AdminResetPasswordRequest(BaseModel):
    new_password: str

@router.put("/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, payload: AdminResetPasswordRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": f"Password for user {user.username} reset successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    db.delete(user)
    db.commit()
    return {"message": f"User {user.username} deleted successfully"}


@router.get("/download-db")
def download_database(current_admin: User = Depends(get_current_admin)):
    db_url = settings.DATABASE_URL
    if not db_url.startswith("sqlite"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SQLite database downloads are supported."
        )
    db_path = db_url.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database file not found."
        )
    return FileResponse(
        path=db_path,
        filename="productive_floof.db",
        media_type="application/x-sqlite3"
    )


@router.post("/restore-db")
def restore_database(file: UploadFile = File(...), current_admin: User = Depends(get_current_admin)):
    db_url = settings.DATABASE_URL
    if not db_url.startswith("sqlite"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SQLite database restoration is supported."
        )
    db_path = db_url.replace("sqlite:///", "")
    
    # Save uploaded file to a temporary file for validation
    temp_path = db_path + ".tmp_restore"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Check SQLite 3 magic header
        with open(temp_path, "rb") as f:
            header = f.read(16)
        if header != b"SQLite format 3\x00":
            raise Exception("Uploaded file is not a valid SQLite database (invalid header).")

        # Validate SQLite file integrity
        conn = None
        try:
            conn = sqlite3.connect(temp_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            check_result = cursor.fetchone()
            
            # Also verify that the critical tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
            has_users_table = cursor.fetchone()
        finally:
            if conn:
                conn.close()
        
        if not check_result or check_result[0] != "ok" or not has_users_table:
            raise Exception("Uploaded file is not a valid or healthy productive-floof SQLite database.")
            
        # Overwrite the active database file
        # 1. Dispose of the existing engine connections
        engine.dispose()
        # 2. Overwrite the file
        shutil.move(temp_path, db_path)
        
        return {"message": "Database restored successfully."}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to restore database: {str(e)}"
        )
