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
    
    cursor.execute("SELECT * FROM campaigns ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if row:
        print("COLUMNS:")
        for k in row.keys():
            print(f"  {k}")
        print("\nVALUES (Last Campaign):")
        for k, v in row.items():
            if k in ['variable_mapping', 'template_metadata']:
                try:
                    print(f"  {k}: {json.dumps(json.loads(v), indent=2)}")
                except:
                    print(f"  {k}: {v}")
            else:
                print(f"  {k}: {v}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
