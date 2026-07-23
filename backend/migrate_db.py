import os
import sys

# Add the parent directory to the path so python can find app package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from sqlalchemy import text
from app.core.database import Base, engine, SessionLocal
from app.models.models import User, Tag, RecurringTemplate, Task

from sqlalchemy import text, inspect

def migrate():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if "users" not in existing_tables:
        print("No users table found. Skipping migration (database will be created on startup).")
        return
        
    # Check if all new schema features are present
    has_is_admin = False
    if "users" in existing_tables:
        has_is_admin = "is_admin" in [c["name"] for c in inspector.get_columns("users")]
        
    has_parent_id = False
    if "tags" in existing_tables:
        has_parent_id = "parent_id" in [c["name"] for c in inspector.get_columns("tags")]
        
    has_start_time_tasks = False
    if "tasks" in existing_tables:
        has_start_time_tasks = "start_time" in [c["name"] for c in inspector.get_columns("tasks")]
        
    has_recurring_templates = "recurring_templates" in existing_tables

    if has_is_admin and has_parent_id and has_start_time_tasks and has_recurring_templates:
        print("Database already has the updated schema (all columns and tables present). Skipping migration.")
        return

    db = SessionLocal()
    print("Reading existing data via raw SQL...")
    
    # 1. Read existing data dynamically using inspect to query only existing columns
    # Users
    users_raw = []
    if "users" in existing_tables:
        user_cols = [c["name"] for c in inspector.get_columns("users")]
        q = "SELECT id, username, hashed_password"
        if "is_admin" in user_cols:
            q += ", is_admin"
        q += " FROM users"
        users_raw = db.execute(text(q)).fetchall()
        
    # Tags
    tags_raw = []
    if "tags" in existing_tables:
        tag_cols = [c["name"] for c in inspector.get_columns("tags")]
        q = "SELECT id, name, user_id"
        if "parent_id" in tag_cols:
            q += ", parent_id"
        q += " FROM tags"
        tags_raw = db.execute(text(q)).fetchall()
        
    # Tasks
    tasks_raw = []
    if "tasks" in existing_tables:
        task_cols = [c["name"] for c in inspector.get_columns("tasks")]
        q = "SELECT id, title, status, due_date, template_id, user_id"
        if "start_time" in task_cols:
            q += ", start_time"
        if "end_time" in task_cols:
            q += ", end_time"
        q += " FROM tasks"
        tasks_raw = db.execute(text(q)).fetchall()
        
    # Recurring Templates
    templates_raw = []
    if "recurring_templates" in existing_tables:
        temp_cols = [c["name"] for c in inspector.get_columns("recurring_templates")]
        q = "SELECT id, user_id, title, recurrence, next_due_date, last_generated_date"
        if "start_time" in temp_cols:
            q += ", start_time"
        if "end_time" in temp_cols:
            q += ", end_time"
        q += " FROM recurring_templates"
        templates_raw = db.execute(text(q)).fetchall()
        
    # Associations
    task_tags = []
    if "task_tag_association" in existing_tables:
        task_tags = db.execute(text("SELECT task_id, tag_id FROM task_tag_association")).fetchall()
        
    template_tags = []
    if "template_tag_association" in existing_tables:
        template_tags = db.execute(text("SELECT template_id, tag_id FROM template_tag_association")).fetchall()
        
    # Convert rows to dict mappings
    users = [dict(r._mapping) for r in users_raw]
    tags = [dict(r._mapping) for r in tags_raw]
    tasks = [dict(r._mapping) for r in tasks_raw]
    templates = [dict(r._mapping) for r in templates_raw]
    
    print(f"Backed up: {len(users)} users, {len(tags)} tags, {len(templates)} templates, {len(tasks)} tasks.")
    db.close()
    
    # 2. Drop all tables
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    # 3. Create all tables with new schema
    print("Recreating tables with the new schema...")
    Base.metadata.create_all(bind=engine)
    
    # helper to parse date strings
    def parse_date(d_val):
        if not d_val:
            return None
        if isinstance(d_val, str):
            return datetime.strptime(d_val.split()[0], "%Y-%m-%d").date()
        return d_val

    # 4. Restore data
    db = SessionLocal()
    try:
        print("Restoring users...")
        for u in users:
            db.add(User(
                id=u["id"],
                username=u["username"],
                hashed_password=u["hashed_password"],
                is_admin=u.get("is_admin", False)
            ))
        db.flush()
        
        print("Restoring tags...")
        for t in tags:
            db.add(Tag(
                id=t["id"],
                name=t["name"],
                user_id=t["user_id"],
                parent_id=t.get("parent_id")
            ))
        db.flush()
        
        print("Restoring templates...")
        for t in templates:
            db.add(RecurringTemplate(
                id=t["id"],
                user_id=t["user_id"],
                title=t["title"],
                recurrence=t["recurrence"],
                next_due_date=parse_date(t.get("next_due_date")),
                last_generated_date=parse_date(t.get("last_generated_date")),
                start_time=t.get("start_time"),
                end_time=t.get("end_time")
            ))
        db.flush()
        
        print("Restoring tasks...")
        for t in tasks:
            db.add(Task(
                id=t["id"],
                title=t["title"],
                status=t["status"],
                due_date=parse_date(t.get("due_date")),
                template_id=t.get("template_id"),
                user_id=t["user_id"],
                start_time=t.get("start_time"),
                end_time=t.get("end_time")
            ))
        db.flush()
        
        print("Restoring task-tag associations...")
        task_tag_table = Base.metadata.tables["task_tag_association"]
        for row in task_tags:
            db.execute(task_tag_table.insert().values(task_id=row[0], tag_id=row[1]))
            
        print("Restoring template-tag associations...")
        template_tag_table = Base.metadata.tables["template_tag_association"]
        for row in template_tags:
            db.execute(template_tag_table.insert().values(template_id=row[0], tag_id=row[1]))
            
        db.commit()
        print("Migration and data restoration completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during restoration: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
