#!/usr/bin/env python3
"""
Script to apply database functions to Supabase PostgreSQL
"""
import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment variables from root .env
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / ".env")

def apply_sql_file(cursor, sql_file_path):
    """Apply a SQL file to the database"""
    print(f"Applying {sql_file_path.name}...")

    with open(sql_file_path, 'r') as f:
        sql = f.read()

    cursor.execute(sql)
    print(f"✅ {sql_file_path.name} applied successfully")

def main():
    # Get database connection string
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        print("❌ DATABASE_URL not found in environment variables")
        sys.exit(1)

    print("Connecting to Supabase database...")

    try:
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        print("✅ Connected to database\n")

        # Apply all SQL files in database/functions/
        functions_dir = Path(__file__).parent.parent / "database" / "functions"
        sql_files = sorted(functions_dir.glob("*.sql"))

        if not sql_files:
            print("No SQL files found in database/functions/")
            return

        for sql_file in sql_files:
            apply_sql_file(cursor, sql_file)

        print(f"\n✅ All {len(sql_files)} function(s) applied successfully!")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
