import enum
from sqlalchemy import Column, Integer, String, Enum as SQLEnum, Date, ForeignKey, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

# Many-to-many association tables
task_tag_association = Table(
    "task_tag_association",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

template_tag_association = Table(
    "template_tag_association",
    Base.metadata,
    Column("template_id", Integer, ForeignKey("recurring_templates.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


class RecurrenceType(str, enum.Enum):
    Daily = "Daily"
    Weekly = "Weekly"
    Monthly = "Monthly"
    NoneVal = "None"  # 'None' is a reserved keyword in some contexts, but 'None' is requested as string


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("RecurringTemplate", back_populates="user", cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="tags")
    tasks = relationship("Task", secondary=task_tag_association, back_populates="tags")
    templates = relationship("RecurringTemplate", secondary=template_tag_association, back_populates="tags")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    due_date = Column(Date, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    template_id = Column(Integer, ForeignKey("recurring_templates.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="tasks")
    template = relationship("RecurringTemplate", back_populates="tasks")
    tags = relationship("Tag", secondary=task_tag_association, back_populates="tasks")

    __table_args__ = (
        UniqueConstraint("template_id", "due_date", name="uq_task_template_due_date"),
    )


class RecurringTemplate(Base):
    __tablename__ = "recurring_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    recurrence = Column(String, default="None", nullable=False)  # 'Daily', 'Weekly', 'Monthly', 'None'
    next_due_date = Column(Date, nullable=False)
    last_generated_date = Column(Date, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)

    user = relationship("User", back_populates="templates")
    tasks = relationship("Task", back_populates="template")
    tags = relationship("Tag", secondary=template_tag_association, back_populates="templates")
