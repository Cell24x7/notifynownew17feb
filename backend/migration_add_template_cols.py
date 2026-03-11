import mysql.connector
import os
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
    
    # Check if columns already exist to avoid errors
    cursor.execute("DESCRIBE campaigns")
    cols = [c[0] for c in cursor.fetchall()]
    
    if 'template_metadata' not in cols:
        print("Adding template_metadata...")
        cursor.execute("ALTER TABLE campaigns ADD COLUMN template_metadata JSON NULL AFTER variable_mapping")
    
    if 'template_body' not in cols:
        print("Adding template_body...")
        cursor.execute("ALTER TABLE campaigns ADD COLUMN template_body TEXT NULL AFTER template_metadata")
    
    conn.commit()
    print('SUCCESS: Database columns checked/added')
    conn.close()
except Exception as e:
    print(f"Error: {e}")
