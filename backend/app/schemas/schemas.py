from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.models import TaskStatus

# User schemas
class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)

class PasswordResetRequest(BaseModel):
    username: str
    new_password: str


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Tag schemas
class TagCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class TagUpdate(BaseModel):
    name: str

class TagResponse(BaseModel):
    id: int
    name: str
    user_id: int
    parent_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

# Recurring Template schemas
class RecurringTemplateResponse(BaseModel):
    id: int
    title: str
    recurrence: str
    next_due_date: date
    last_generated_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    tags: List[TagResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Task schemas
class TaskCreate(BaseModel):
    title: str
    due_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.PENDING
    recurrence: Optional[str] = "None"  # 'Daily', 'Weekly', 'Monthly', 'None'
    tag_ids: Optional[List[int]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    tag_ids: Optional[List[int]] = None
    recurrence: Optional[str] = None  # to update recurrence option if applicable

class TaskResponse(BaseModel):
    id: int
    title: str
    status: TaskStatus
    due_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    template_id: Optional[int] = None
    user_id: int
    tags: List[TagResponse] = []
    template: Optional[RecurringTemplateResponse] = None
    model_config = ConfigDict(from_attributes=True)

# Conflict Resolution schemas
class RecurrenceResolution(BaseModel):
    choice: str  # "instance" or "future"
    # Fields that should be updated
    title: str
    due_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    tag_ids: List[int]
    recurrence: str
