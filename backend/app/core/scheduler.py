import asyncio
from datetime import date
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import SessionLocal
from app.models.models import RecurringTemplate, Task, TaskStatus
from app.routers.tasks import calculate_next_date

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

async def recurrence_scheduler_loop():
    logger.info("Starting background recurrence scheduler...")
    while True:
        try:
            await generate_pending_tasks()
        except Exception as e:
            logger.error(f"Error in recurrence scheduler loop: {e}")
        # Run every 30 seconds
        await asyncio.sleep(30)


async def generate_pending_tasks():
    db: Session = SessionLocal()
    try:
        today = date.today()
        # Query templates that are due (next_due_date <= today)
        # Filter templates where recurrence is not "None"
        due_templates = db.query(RecurringTemplate).filter(
            RecurringTemplate.next_due_date <= today,
            RecurringTemplate.recurrence != "None"
        ).all()

        for template in due_templates:
            target_date = template.next_due_date
            logger.info(f"Generating task for template ID {template.id} ('{template.title}') for due date {target_date}")

            # Check if task already exists for this template and date (idempotency)
            existing_task = db.query(Task).filter(
                Task.template_id == template.id,
                Task.due_date == target_date
            ).first()

            if not existing_task:
                # Create the task instance
                new_task = Task(
                    title=template.title,
                    status=TaskStatus.PENDING,
                    priority=getattr(template, "priority", "Medium"),
                    due_date=target_date,
                    start_time=template.start_time,
                    end_time=template.end_time,
                    template_id=template.id,
                    user_id=template.user_id,
                    tags=template.tags  # Copies the tags from the template
                )
                db.add(new_task)

            # Advance the template schedule
            template.last_generated_date = target_date
            template.next_due_date = calculate_next_date(target_date, template.recurrence)
            
            try:
                db.commit()
                logger.info(f"Successfully generated/processed task for template {template.id}. Next due date: {template.next_due_date}")
            except IntegrityError:
                # Catch unique database constraint errors in case of parallel processes
                db.rollback()
                logger.warning(f"IntegrityError: Task for template {template.id} on date {target_date} already exists. Skipping.")
                # Force advance the template next_due_date to avoid getting stuck
                template.next_due_date = calculate_next_date(target_date, template.recurrence)
                db.commit()
    finally:
        db.close()
