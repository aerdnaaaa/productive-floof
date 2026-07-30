import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.models import models
from app.routers import auth, tags, tasks, admin
from app.core.scheduler import recurrence_scheduler_loop

from app.core.schema_migrator import migrate_database_schema

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dynamically migrate database schema to match models
    migrate_database_schema(engine)

    # Create any missing tables on startup
    Base.metadata.create_all(bind=engine)

    # Seed admin user if it does not exist
    from app.core.database import SessionLocal
    from app.models.models import User
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            hashed_pwd = get_password_hash("admin123")
            new_admin = User(username="admin", hashed_password=hashed_pwd, is_admin=True)
            db.add(new_admin)
            db.commit()
            print("Admin user seeded: username 'admin', password 'admin123'")
    except Exception as e:
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()
    
    # Start background recurrence scheduler
    scheduler_task = asyncio.create_task(recurrence_scheduler_loop())
    
    yield
    
    # Cancel scheduler on shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Productive Floof API",
    description="Backend API for the ultra-minimalistic task manager",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for the local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(tags.router)
app.include_router(tasks.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Productive Floof API"}
