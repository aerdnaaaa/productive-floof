import calendar
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import nullslast
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Task, Tag, RecurringTemplate, TaskStatus
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse, RecurrenceResolution

router = APIRouter(prefix="/tasks", tags=["tasks"])

def calculate_next_date(start_date: date, recurrence: str) -> date:
    if recurrence == "Daily":
        return start_date + timedelta(days=1)
    elif recurrence == "Weekly":
        return start_date + timedelta(weeks=1)
    elif recurrence == "Monthly":
        # Advance by 1 month
        month = start_date.month
        year = start_date.year
        month += 1
        if month > 12:
            month = 1
            year += 1
        # Handle month day overflow (e.g. Jan 31 -> Feb 28)
        last_day = calendar.monthrange(year, month)[1]
        day = min(start_date.day, last_day)
        return date(year, month, day)
    return start_date


@router.get("", response_model=List[TaskResponse])
def read_tasks(
    tag_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tasks."
        )
    query = db.query(Task).filter(Task.user_id == current_user.id)
    if tag_id is not None:
        query = query.filter(Task.tags.any(id=tag_id))
    # Order by due_date ascending (NULL values sorted last)
    return query.order_by(nullslast(Task.due_date.asc()), Task.id.asc()).all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot create tasks."
        )
    # Fetch tags and ensure they belong to current_user
    db_tags = []
    if task_in.tag_ids:
        db_tags = db.query(Tag).filter(Tag.id.in_(task_in.tag_ids), Tag.user_id == current_user.id).all()

    # Create task instance
    task = Task(
        title=task_in.title,
        status=task_in.status or TaskStatus.PENDING,
        due_date=task_in.due_date,
        start_time=task_in.start_time,
        end_time=task_in.end_time,
        user_id=current_user.id,
        tags=db_tags
    )

    # Check for recurrence settings
    if task_in.recurrence and task_in.recurrence in ["Daily", "Weekly", "Monthly"]:
        if not task_in.due_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Due date is required for recurring tasks."
            )
        # Create a new RecurringTemplate
        next_due = calculate_next_date(task_in.due_date, task_in.recurrence)
        template = RecurringTemplate(
            user_id=current_user.id,
            title=task_in.title,
            recurrence=task_in.recurrence,
            next_due_date=next_due,
            last_generated_date=task_in.due_date,
            start_time=task_in.start_time,
            end_time=task_in.end_time,
            tags=db_tags
        )
        db.add(template)
        db.flush()  # populate template.id
        
        task.template_id = template.id

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{id}", response_model=TaskResponse)
def update_task(
    id: int,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tasks."
        )
    task = db.query(Task).filter(Task.id == id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    is_status_only = (
        "status" in update_data and
        len(update_data) == 1
    )

    if is_status_only:
        task.status = task_in.status
        db.commit()
        db.refresh(task)
        return task

    # Intercept edits to a task that has a template_id (recurrence conflict)
    has_template = (task.template_id is not None)
    
    # Check if they are actually modifying details
    modifying_details = (
        ("title" in update_data and update_data["title"] != task.title) or
        ("due_date" in update_data and update_data["due_date"] != task.due_date) or
        ("start_time" in update_data and update_data["start_time"] != task.start_time) or
        ("end_time" in update_data and update_data["end_time"] != task.end_time) or
        ("tag_ids" in update_data) or
        ("recurrence" in update_data)
    )

    if has_template and modifying_details:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Modifications to a recurring task require selecting application scope."
        )

    # Validate due date for recurring task template updates if recurrence is enabled
    if has_template or (task_in.recurrence and task_in.recurrence != "None"):
        if "due_date" in update_data and update_data["due_date"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Due date is required for recurring tasks."
            )

    # Otherwise, update standard fields (for one-off tasks)
    if "title" in update_data:
        task.title = task_in.title
    if "status" in update_data:
        task.status = task_in.status
    if "due_date" in update_data:
        task.due_date = task_in.due_date
    if "start_time" in update_data:
        task.start_time = task_in.start_time
    if "end_time" in update_data:
        task.end_time = task_in.end_time
    if "tag_ids" in update_data:
        db_tags = db.query(Tag).filter(Tag.id.in_(task_in.tag_ids), Tag.user_id == current_user.id).all()
        task.tags = db_tags

    db.commit()
    db.refresh(task)
    return task


@router.put("/{id}/recurrence", response_model=TaskResponse)
def resolve_recurrence_conflict(
    id: int,
    resolution: RecurrenceResolution,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tasks."
        )
    task = db.query(Task).filter(Task.id == id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.template_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is not associated with a recurring schedule")

    # Fetch tags
    db_tags = db.query(Tag).filter(Tag.id.in_(resolution.tag_ids), Tag.user_id == current_user.id).all()

    if resolution.choice == "instance":
        # Apply to This Instance Only:
        # Orphan this row by setting template_id = NULL
        task.template_id = None
        task.title = resolution.title
        task.due_date = resolution.due_date
        task.start_time = resolution.start_time
        task.end_time = resolution.end_time
        task.tags = db_tags
        
        db.commit()
        db.refresh(task)
        return task

    elif resolution.choice == "future":
        # Apply to All Future Tasks:
        # 1. Update the template
        template = db.query(RecurringTemplate).filter(RecurringTemplate.id == task.template_id).first()
        if template:
            template.title = resolution.title
            template.tags = db_tags
            template.start_time = resolution.start_time
            template.end_time = resolution.end_time
            
            # If recurrence changed, update next_due_date calculation
            if resolution.recurrence and resolution.recurrence != template.recurrence:
                template.recurrence = resolution.recurrence
                if not resolution.due_date:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Due date is required for recurring tasks."
                    )
                template.next_due_date = calculate_next_date(resolution.due_date, resolution.recurrence)

        # 2. Cascade changes to all linked PENDING tasks
        pending_tasks = db.query(Task).filter(
            Task.template_id == task.template_id,
            Task.status == TaskStatus.PENDING,
            Task.due_date >= task.due_date
        ).all()

        for pt in pending_tasks:
            pt.title = resolution.title
            pt.tags = db_tags
            pt.start_time = resolution.start_time
            pt.end_time = resolution.end_time

        # 3. Explicitly update current task (even if not PENDING)
        task.title = resolution.title
        task.due_date = resolution.due_date
        task.start_time = resolution.start_time
        task.end_time = resolution.end_time
        task.tags = db_tags

        db.commit()
        db.refresh(task)
        return task

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid choice option")


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators do not have access to tasks."
        )
    task = db.query(Task).filter(Task.id == id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return
