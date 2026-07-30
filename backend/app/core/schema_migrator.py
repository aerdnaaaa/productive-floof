import sqlite3
from typing import Dict, List, Any
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from app.core.database import Base, engine as active_engine
from app.models import models

def get_column_sql_type(column) -> str:
    """Helper to convert SQLAlchemy Column type to SQLite column definition string."""
    col_type = type(column.type).__name__.upper()
    col_name = column.name

    if "BOOLEAN" in col_type:
        default_val = "0" if column.default is None else ("1" if column.default.arg else "0")
        return f"BOOLEAN DEFAULT {default_val} NOT NULL"
    elif "INT" in col_type:
        return "INTEGER"
    elif "ENUM" in col_type or "VARCHAR" in col_type or "STRING" in col_type or "TEXT" in col_type:
        default_arg = getattr(column.default, "arg", None)
        if default_arg:
            default_str = str(default_arg.value if hasattr(default_arg, "value") else default_arg)
            return f"VARCHAR DEFAULT '{default_str}' NOT NULL"
        return "VARCHAR"
    elif "DATE" in col_type:
        return "DATE"
    else:
        return "VARCHAR"


def inspect_database_schema(db_path: str) -> Dict[str, Any]:
    """
    Introspects an SQLite database file and compares its schema against target Base.metadata.
    Returns diff summary with list of required migration changes and table statistics.
    """
    temp_engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(temp_engine)
    existing_tables = inspector.get_table_names()

    changes: List[str] = []

    # Check each target model table in Base.metadata
    for table_name, table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            changes.append(f"Create missing table '{table_name}'")
        else:
            existing_columns = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name not in existing_columns:
                    col_sql = get_column_sql_type(col)
                    changes.append(f"Add column '{col.name}' ({col_sql}) to table '{table_name}'")

    # Gather statistics
    users_count = 0
    tasks_count = 0
    tags_count = 0

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        if "users" in existing_tables:
            cursor.execute("SELECT COUNT(*) FROM users")
            users_count = cursor.fetchone()[0]
        if "tasks" in existing_tables:
            cursor.execute("SELECT COUNT(*) FROM tasks")
            tasks_count = cursor.fetchone()[0]
        if "tags" in existing_tables:
            cursor.execute("SELECT COUNT(*) FROM tags")
            tags_count = cursor.fetchone()[0]
        conn.close()
    except Exception:
        pass
    finally:
        temp_engine.dispose()

    return {
        "requires_migration": len(changes) > 0,
        "changes": changes,
        "users_count": users_count,
        "tasks_count": tasks_count,
        "tags_count": tags_count,
    }


def migrate_database_schema(target_engine=None, db_path: str = None):
    """
    Dynamically applies missing tables and missing columns to the SQLite database
    to match the current Base.metadata target schema.
    """
    if target_engine is None and db_path:
        target_engine = create_engine(f"sqlite:///{db_path}")
    elif target_engine is None:
        target_engine = active_engine

    inspector = inspect(target_engine)
    existing_tables = inspector.get_table_names()

    with target_engine.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                # Create missing table
                table.create(bind=conn)
                conn.commit()
            else:
                # Add missing columns
                existing_columns = {c["name"] for c in inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in existing_columns:
                        col_sql = get_column_sql_type(col)
                        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_sql}"
                        conn.execute(text(alter_query))
                        conn.commit()
