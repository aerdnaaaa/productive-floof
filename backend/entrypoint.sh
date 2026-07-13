#!/bin/sh
set -e

DB_FILE="/app/data/productive_floof.db"
BACKUP_FILE="/app/data/productive_floof.db.bak"

echo "=== Starting database migration checks ==="

if [ -f "$DB_FILE" ]; then
    echo "Existing database found. Creating backup at $BACKUP_FILE..."
    cp "$DB_FILE" "$BACKUP_FILE"
    
    echo "Running database migration script..."
    if python migrate_db.py; then
        echo "Migration completed successfully!"
        # Remove backup to save space if successful
        rm -f "$BACKUP_FILE"
    else
        echo "ERROR: Migration failed! Reverting back to original database..."
        cp "$BACKUP_FILE" "$DB_FILE"
        echo "Database successfully rolled back."
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo "No existing database found. Migration skipped (database will be created on startup)."
fi

echo "=== Starting Productive Floof Backend ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
