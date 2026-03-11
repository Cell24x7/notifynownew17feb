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
    
    cursor.execute("SELECT id, name, metadata FROM message_templates WHERE name = 'image_v3_2'")
    row = cursor.fetchone()
    if row:
        print(f"ID: {row['id']}")
        print(f"NAME: {row['name']}")
        try:
            meta = json.loads(row['metadata'])
            print(f"METADATA JSON: {json.dumps(meta, indent=2)}")
        except:
            print(f"Metadata is not JSON: {row['metadata'][:100]}")
    else:
        print("Not found by name")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
