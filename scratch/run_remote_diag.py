import paramiko
import sys

HOSTNAME = "64.227.183.240"
PORT = 22
USERNAME = "veloxadmin"
PASSWORD = "0dgoldimagecf38532"

def execute_remote_command(ssh, cmd, require_sudo=False):
    if require_sudo:
        full_cmd = f"echo '{PASSWORD}' | sudo -S {cmd}"
    else:
        full_cmd = cmd
        
    print(f"\nExecuting: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    print(f"Exit status: {exit_status}")
    if out:
        sys.stdout.buffer.write(f"Stdout:\n{out}\n".encode('utf-8'))
    if err:
        sys.stdout.buffer.write(f"Stderr:\n{err}\n".encode('utf-8'))
    print("-" * 50)
    return out

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOSTNAME, PORT, USERNAME, PASSWORD)
    
    execute_remote_command(ssh, "cat /etc/nginx/nginx.conf")

    ssh.close()

if __name__ == "__main__":
    main()
