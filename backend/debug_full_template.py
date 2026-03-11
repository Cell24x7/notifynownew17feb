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
    
    cursor.execute("SELECT * FROM message_templates WHERE name = 'image_v3_2'")
    row = cursor.fetchone()
    if row:
        print("FOUND TEMPLATE:")
        for k, v in row.items():
            if k == 'metadata':
                try:
                    print(f"{k}: {json.dumps(json.loads(v), indent=2)}")
                except:
                    print(f"{k}: {v}")
            else:
                print(f"{k}: {v}")
    else:
        print("TEMPLATE image_v3_2 NOT FOUND")
        cursor.execute("SELECT name FROM message_templates LIMIT 20")
        others = cursor.fetchall()
        print("Available names:", [r['name'] for r in others])

    conn.close()
except Exception as e:
    print(f"Error: {e}")
