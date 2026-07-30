import os
import sys

# Add the parent directory to the path so python can find app package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from app.core.schema_migrator import migrate_database_schema

def migrate():
    print("Running dynamic database schema migration...")
    migrate_database_schema(engine)
    print("Dynamic database migration complete!")

if __name__ == "__main__":
    migrate()

