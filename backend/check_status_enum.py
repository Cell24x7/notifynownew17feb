import mysql.connector
import os
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(os.path.join(os.getcwd(), '.env'))

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASS', ''),
        database=os.getenv('DB_NAME', 'rcs_platform')
    )
    cursor = conn.cursor()
    cursor.execute("SHOW COLUMNS FROM campaigns LIKE 'status'")
    row = cursor.fetchone()
    if row:
        print(f"Column 'status' Type: {row[1]}")
    else:
        print("Column 'status' not found.")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
