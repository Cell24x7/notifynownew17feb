# System Specifications & Audit Report 🖥️

This report lists the current local development system specifications, compares them with the target production server specs required for high-volume campaigns, and details what metrics to audit.

---

## 1. Local Development System (Current Checked Specs)
These are the specifications of the machine you are running locally:

| Parameter | Value / Detail | Status |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 (AMD64 / Intel64 Architecture) | Development Local Host |
| **CPU Cores** | **4 Cores** (Intel Core Processor) | Good for local debugging |
| **Total Memory (RAM)**| **7.73 GB** | Low for high-concurrency simulation |
| **Disk Storage** | 219.14 GB Total (46.05 GB Free - 78.99% used) | Keep clean for logs generation |
| **Local Database Host**| `localhost` | Single node local database |
| **Local Redis Cache** | Offline / Missing (Local environment) | Local queues fall back to sequential mode |

---

## 2. Recommended Production Server Specs (For 5 Crore Campaign)
To handle 10 simultaneous users executing 50 Lakh campaigns each without hangs, crash, or delay, your **DigitalOcean (Ocean Cloud)** infrastructure should match this target setup:

| Server Tier | Target CPU | Target RAM | Storage / IOPS | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **1. Database Server** *(Managed MySQL)* | **8 Dedicated vCPUs** | **32 GB RAM** | NVMe SSD / Provisioned High IOPS | Prevents InnoDB database write locking. Memory keeps 100% of logs index in cache buffer. |
| **2. App / Worker Server** *(Dedicated Droplet)* | **8 Dedicated vCPUs** | **16 GB RAM** | SSD Storage | Runs PM2 in cluster mode (`-i max`) to parse CSV files and trigger API requests in parallel threads. |
| **3. Cache Queue Server** *(Managed Redis)* | **4 Dedicated vCPUs** | **8 GB RAM** | Fast Memory | Manages BullMQ active job payloads and locks without OOM crashes. |

---

## 3. How to check your Live DigitalOcean Server Specs?
To run the automated specs checking script on your production cloud server, follow these steps:

1. **Access your server via terminal/SSH:**
   ```bash
   ssh your-username@64.227.183.240
   ```
2. **Navigate to the NotifyNow project directory:**
   ```bash
   cd /path/to/notifynownew17feb
   ```
3. **Execute the diagnostic script:**
   ```bash
   python3 check_live_specs.py
   ```
   *This script will read your production `.env` and verify whether MySQL and Redis are running properly and show their configuration limits.*
