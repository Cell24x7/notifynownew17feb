import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    hostname = "64.227.183.240"
    port = 22
    username = "veloxadmin"
    password = "0dgoldimagecf38532"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {hostname}:{port} as {username}...")
        ssh.connect(hostname, port, username, password, timeout=15)
        print("Connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    # Shell commands to clone and deploy
    # The echo password | sudo -S is handled inside deploy_new_server.sh when running commands
    deploy_cmd = (
        "if [ ! -d 'notifynow' ]; then "
        "  echo 'Cloning repository...'; "
        "  git clone https://github.com/Cell24x7/notifynownew17feb.git notifynow; "
        "else "
        "  echo 'Updating existing directory...'; "
        "  cd notifynow && git fetch origin main && git reset --hard origin/main; "
        "fi && "
        "cd ~/notifynow && "
        "chmod +x deploy_new_server.sh && "
        "./deploy_new_server.sh"
    )

    print("Starting deployment script on target server...")
    stdin, stdout, stderr = ssh.exec_command(deploy_cmd)
    
    # Read output in real time
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line, end="")
        
    err = stderr.read().decode('utf-8').strip()
    if err:
        print("\n--- STDERR / Warnings ---")
        print(err)

    ssh.close()
    print("Deployment execution finished!")

if __name__ == "__main__":
    main()
