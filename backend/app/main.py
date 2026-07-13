import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.models import models
from app.routers import auth, tags, tasks
from app.core.scheduler import recurrence_scheduler_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    
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

@app.get("/")
def read_root():
    return {"message": "Welcome to Productive Floof API"}
