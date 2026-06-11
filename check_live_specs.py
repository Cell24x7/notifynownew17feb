import os
import sys
import platform
import subprocess
import shutil
import json

def get_cpu_info():
    try:
        return {
            "cores": os.cpu_count(),
            "architecture": platform.machine(),
            "processor": platform.processor() or "Unknown"
        }
    except Exception as e:
        return {"error": str(e)}

def get_ram_info():
    try:
        if platform.system() == "Windows":
            output = subprocess.check_output("wmic computersystem get TotalPhysicalMemory", shell=True).decode()
            lines = output.strip().split("\n")
            if len(lines) > 1:
                bytes_mem = int(lines[1].strip())
                return {"total_gb": round(bytes_mem / (1024 ** 3), 2)}
        else:
            # Linux total memory
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    if "MemTotal" in line:
                        kb_mem = int(line.split()[1])
                        return {"total_gb": round(kb_mem / (1024 ** 2), 2)}
        return {"total_gb": "Unknown"}
    except Exception as e:
        return {"error": str(e)}

def get_disk_info():
    try:
        total, used, free = shutil.disk_usage(".")
        return {
            "total_gb": round(total / (1024 ** 3), 2),
            "free_gb": round(free / (1024 ** 3), 2),
            "used_percent": round((used / total) * 100, 2)
        }
    except Exception as e:
        return {"error": str(e)}

def read_db_creds():
    # Attempt to read from backend/.env.production first, then backend/.env
    creds = {}
    paths = [
        r"./backend/.env.production",
        r"./backend/.env",
        r"c:/SandeepYadav/NotifyProject/notifynownew17feb/backend/.env.production",
        r"c:/SandeepYadav/NotifyProject/notifynownew17feb/backend/.env"
    ]
    for path in paths:
        if os.path.exists(path):
            with open(path, 'r') as f:
                for line in f:
                    if "=" in line and not line.strip().startswith("#"):
                        k, v = line.strip().split("=", 1)
                        if k.strip() in ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"]:
                            creds[k.strip()] = v.strip()
            if creds:
                break
    return creds

def check_mysql(creds):
    if not creds:
        return {"status": "Unknown", "error": "No database credentials found"}
    
    host = creds.get("DB_HOST", "localhost")
    user = creds.get("DB_USER", "root")
    password = creds.get("DB_PASS", "")
    
    try:
        # Check mysql command availability and run a test query
        cmd = f'mysql -h {host} -u {user} -p"{password}" -e "SELECT version(), @@innodb_buffer_pool_size;"'
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode()
        lines = output.strip().split("\n")
        if len(lines) > 1:
            data = lines[1].split()
            version = data[0] if len(data) > 0 else "Unknown"
            buffer_pool_bytes = int(data[1]) if len(data) > 1 else 0
            return {
                "status": "connected",
                "mysql_version": version,
                "innodb_buffer_pool_gb": round(buffer_pool_bytes / (1024 ** 3), 2)
            }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }

def check_redis():
    try:
        # Check redis-cli availability
        cmd = "redis-cli info server"
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode()
        version = "Unknown"
        for line in output.split("\n"):
            if "redis_version:" in line:
                version = line.split(":")[1].strip()
                break
        
        # Check redis memory
        mem_output = subprocess.check_output("redis-cli info memory", shell=True).decode()
        used_memory = "Unknown"
        for line in mem_output.split("\n"):
            if "used_memory_human:" in line:
                used_memory = line.split(":")[1].strip()
                break
                
        return {
            "status": "connected",
            "redis_version": version,
            "used_memory": used_memory
        }
    except Exception as e:
        return {
            "status": "failed_or_missing",
            "error": str(e)
        }

def main():
    print("==================================================")
    print("SEARCHING: SERVER SYSTEM & DB SPECIFICATIONS DIAGNOSTIC")
    print("==================================================")
    
    creds = read_db_creds()
    system_info = {
        "operating_system": platform.system(),
        "os_release": platform.release(),
        "cpu": get_cpu_info(),
        "ram": get_ram_info(),
        "disk": get_disk_info()
    }
    
    print("\n[HARDWARE & OS DETAILS]")
    print(json.dumps(system_info, indent=4))
    
    print("\n[MYSQL CONFIG & STATUS]")
    print(json.dumps(check_mysql(creds), indent=4))
    
    print("\n[REDIS CACHE STATUS]")
    print(json.dumps(check_redis(), indent=4))
    print("==================================================")

if __name__ == "__main__":
    main()
