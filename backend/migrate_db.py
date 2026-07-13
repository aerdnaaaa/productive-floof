import os
import sys

# Add the parent directory to the path so python can find app package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from sqlalchemy import text
from app.core.database import Base, engine, SessionLocal
from app.models.models import User, Tag, RecurringTemplate, Task

def migrate():
    db = SessionLocal()
    
    print("Reading existing data via raw SQL...")
    try:
        # 1. Read existing data using raw SQL to avoid ORM columns mismatch
        users_raw = db.execute(text("SELECT id, username, hashed_password FROM users")).fetchall()
        tags_raw = db.execute(text("SELECT id, name, user_id FROM tags")).fetchall()
        templates_raw = db.execute(text("SELECT id, user_id, title, recurrence, next_due_date, last_generated_date, start_time, end_time FROM recurring_templates")).fetchall()
        tasks_raw = db.execute(text("SELECT id, title, status, due_date, template_id, user_id FROM tasks")).fetchall()
        
        task_tags = db.execute(text("SELECT task_id, tag_id FROM task_tag_association")).fetchall()
        template_tags = db.execute(text("SELECT template_id, tag_id FROM template_tag_association")).fetchall()
    except Exception as e:
        print(f"Error reading existing tables (they may not exist yet): {e}")
        users_raw, tags_raw, templates_raw, tasks_raw, task_tags, template_tags = [], [], [], [], [], []
    
    # helper to parse date strings from SQLite if returned as string
    def parse_date(d_val):
        if not d_val:
            return None
        if isinstance(d_val, str):
            return datetime.strptime(d_val.split()[0], "%Y-%m-%d").date()
        return d_val

    # Convert raw rows to memory dictionaries
    users = [{"id": r[0], "username": r[1], "hashed_password": r[2]} for r in users_raw]
    tags = [{"id": r[0], "name": r[1], "user_id": r[2]} for r in tags_raw]
    templates = [{
        "id": r[0],
        "user_id": r[1],
        "title": r[2],
        "recurrence": r[3],
        "next_due_date": parse_date(r[4]),
        "last_generated_date": parse_date(r[5]),
        "start_time": r[6],
        "end_time": r[7]
    } for r in templates_raw]
    
    tasks = [{
        "id": r[0],
        "title": r[1],
        "status": r[2],
        "due_date": parse_date(r[3]),
        "template_id": r[4],
        "user_id": r[5],
        "start_time": None,
        "end_time": None
    } for r in tasks_raw]
    
    print(f"Backed up: {len(users)} users, {len(tags)} tags, {len(templates)} templates, {len(tasks)} tasks.")
    
    db.close()
    
    # 2. Drop all tables
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    # 3. Create all tables with new schema
    print("Recreating tables with the new schema...")
    Base.metadata.create_all(bind=engine)
    
    # 4. Restore data
    db = SessionLocal()
    try:
        print("Restoring users...")
        for u in users:
            db.add(User(id=u["id"], username=u["username"], hashed_password=u["hashed_password"]))
        db.flush()
        
        print("Restoring tags...")
        for t in tags:
            db.add(Tag(id=t["id"], name=t["name"], user_id=t["user_id"]))
        db.flush()
        
        print("Restoring templates...")
        for t in templates:
            db.add(RecurringTemplate(
                id=t["id"],
                user_id=t["user_id"],
                title=t["title"],
                recurrence=t["recurrence"],
                next_due_date=t["next_due_date"],
                last_generated_date=t["last_generated_date"],
                start_time=t["start_time"],
                end_time=t["end_time"]
            ))
        db.flush()
        
        print("Restoring tasks...")
        for t in tasks:
            db.add(Task(
                id=t["id"],
                title=t["title"],
                status=t["status"],
                due_date=t["due_date"],
                template_id=t["template_id"],
                user_id=t["user_id"],
                start_time=t["start_time"],
                end_time=t["end_time"]
            ))
        db.flush()
        
        print("Restoring task-tag associations...")
        task_tag_table = Base.metadata.tables["task_tag_association"]
        for row in task_tags:
            t_id = row[0]
            tg_id = row[1]
            db.execute(task_tag_table.insert().values(task_id=t_id, tag_id=tg_id))
            
        print("Restoring template-tag associations...")
        template_tag_table = Base.metadata.tables["template_tag_association"]
        for row in template_tags:
            tm_id = row[0]
            tg_id = row[1]
            db.execute(template_tag_table.insert().values(template_id=tm_id, tag_id=tg_id))
            
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
