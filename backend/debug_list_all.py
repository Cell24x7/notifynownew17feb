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
    
    # List all templates
    cursor.execute("SELECT id, name, user_id FROM message_templates")
    templates = cursor.fetchall()
    print('ALL TEMPLATES:')
    for t in templates:
        print(f"ID: {t['id']}, Name: {t['name']}, User: {t['user_id']}")
    
    # List recent campaigns
    cursor.execute("SELECT id, name, template_id, channel, variable_mapping FROM campaigns ORDER BY id DESC LIMIT 5")
    campaigns = cursor.fetchall()
    print('\nRECENT CAMPAIGNS:')
    for c in campaigns:
        print(f"ID: {c['id']}, Name: {c['name']}, TemplateID: {c['template_id']}, Channel: {c['channel']}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
