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
    
    # Check template image_v3_2
    cursor.execute("SELECT * FROM message_templates WHERE name = 'image_v3_2'")
    template = cursor.fetchone()
    print('TEMPLATE DETAILS:')
    if template:
        # Avoid printing heavy binary if any
        if 'metadata' in template and template['metadata']:
            try:
                template['metadata'] = json.loads(template['metadata'])
            except:
                pass
        print(json.dumps(template, indent=2))
    else:
        print('Not found')
    
    # Check recent campaign mapping
    cursor.execute("SELECT id, name, variable_mapping, template_id FROM campaigns ORDER BY id DESC LIMIT 1")
    campaign = cursor.fetchone()
    print('\nRECENT CAMPAIGN:')
    print(json.dumps(campaign, indent=2))

    # Check recent message in queue
    cursor.execute("SELECT * FROM campaign_queue ORDER BY id DESC LIMIT 1")
    queue_item = cursor.fetchone()
    print('\nRECENT QUEUE ITEM:')
    if queue_item:
        if 'variables' in queue_item and queue_item['variables']:
            try:
                queue_item['variables'] = json.loads(queue_item['variables'])
            except:
                pass
        print(json.dumps(queue_item, indent=2))
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
