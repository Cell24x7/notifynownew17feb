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
    cursor = conn.cursor()
    cursor.execute("DESCRIBE campaigns")
    cols = [c[0] for c in cursor.fetchall()]
    print('CAMPAIGNS COLS: ' + ', '.join(cols))
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
