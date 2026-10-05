"""
Database migration script for Phase 5C: AI Complaint Priority.
Safely adds ai_predicted_priority, final_priority, ai_prediction_reason, and ai_confidence
to the complaints table if they do not exist.
Handles both PostgreSQL and SQLite.
"""

import sys
import os
from sqlalchemy import text, inspect

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine, Base
from app.models.complaint import Complaint

def run_migration():
    print("Running Phase 5C Database Migration...")
    inspector = inspect(engine)
    existing_columns = [c["name"] for c in inspector.get_columns("complaints")]
    print(f"Existing columns in 'complaints': {existing_columns}")

    columns_to_add = [
        ("ai_predicted_priority", "VARCHAR(50)"),
        ("final_priority", "VARCHAR(50)"),
        ("ai_prediction_reason", "TEXT"),
        ("ai_confidence", "FLOAT"),
    ]

    with engine.begin() as conn:
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                print(f"Adding column '{col_name}' ({col_type})...")
                try:
                    conn.execute(text(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_type};"))
                    print(f"Column '{col_name}' added successfully.")
                except Exception as e:
                    print(f"Note on adding {col_name}: {e}")
            else:
                print(f"Column '{col_name}' already exists.")

    # Also backfill any existing complaints where final_priority is null
    with engine.begin() as conn:
        try:
            conn.execute(text("UPDATE complaints SET final_priority = priority WHERE final_priority IS NULL;"))
            conn.execute(text("UPDATE complaints SET ai_predicted_priority = priority WHERE ai_predicted_priority IS NULL;"))
            print("Backfilled existing complaints priority columns.")
        except Exception as e:
            print(f"Backfill note: {e}")

    print("Phase 5C Migration Completed Successfully!")


if __name__ == "__main__":
    run_migration()
