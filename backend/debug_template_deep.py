import mysql.connector
import os
import json
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(os.path.join(os.getcwd(), '.env'))

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'rcs_platform')
    )
    cursor = conn.cursor(dictionary=True)
    
    # Try multiple ways to find the template
    cursor.execute("SELECT * FROM message_templates WHERE name = 'image_v3_2' OR id='17'")
    rows = cursor.fetchall()
    
    if rows:
        for row in rows:
            print(f"--- TEMPLATE {row['id']} ---")
            print(f"NAME: {row['name']}")
            print(f"BODY: {repr(row['body'])}")
            print(f"METADATA: {row['metadata']}")
    else:
        print("Template not found by name or ID 17")
        cursor.execute("SELECT id, name FROM message_templates LIMIT 50")
        print("First 50 templates:")
        for r in cursor.fetchall():
            print(f"  {r['id']} - {r['name']}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
