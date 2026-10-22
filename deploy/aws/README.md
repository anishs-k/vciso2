# CTW Admin on AWS Lightsail: step by step

Result: `https://admin.<server IP with dashes>.sslip.io/clients` (or your own domain) opens CTW Admin,
with "Generate Docker Image" working. Stuck anywhere? Put a screenshot in the `them` folder and say so.

---

## Step 1: Create the server (AWS console, about 5 minutes)

1. Open https://lightsail.aws.amazon.com and **Create instance**.
2. Region: **Mumbai (ap-south-1)**.
3. Platform **Linux/Unix**, blueprint **OS Only → Ubuntu 24.04 LTS**.
4. SSH key: keep the default key, and **Download** it (a `.pem` file). Put it in `C:\Users\ANISH\.ssh\`
   (create the folder if needed), for example `C:\Users\ANISH\.ssh\lightsail.pem`.
5. Plan: **$24 (4 GB RAM, 2 vCPU, 80 GB SSD)**. Name: `ctw-admin`. **Create instance**.
6. When it says *Running*: open it → **Networking** tab:
   - **Create static IP**, attach it to `ctw-admin`. Note the IP, e.g. `13.233.10.20`.
   - **IPv4 Firewall**: keep SSH (22), **add HTTP (80)** and **HTTPS (443)**. Nothing else.

Your site name is then `admin.13-233-10-20.sslip.io` (the IP with dashes). Own domain? Add an A record
`admin.yourdomain.com → 13.233.10.20` and use that name instead.

## Step 2: Make the package (laptop, PowerShell, 1 minute)

```powershell
cd C:\Anish\company\Ayush\test2\vciso-platform-share-2026-10-19\vciso-platform
powershell -ExecutionPolicy Bypass -File deploy\aws\make-package.ps1
```
It writes `Downloads\vciso-deploy.tar.gz` (about 15 MB; no secrets, no node_modules).

## Step 3: Copy it to the server (laptop, PowerShell)

The key file must be private first (one time):
```powershell
icacls "$env:USERPROFILE\.ssh\lightsail.pem" /inheritance:r /grant:r "$($env:USERNAME):R"
```
Then (put your IP):
```powershell
scp -i "$env:USERPROFILE\.ssh\lightsail.pem" "$env:USERPROFILE\Downloads\vciso-deploy.tar.gz" ubuntu@13.233.10.20:~
```
Type `yes` the first time it asks.

## Step 4: Log in to the server and unpack

```powershell
ssh -i "$env:USERPROFILE\.ssh\lightsail.pem" ubuntu@13.233.10.20
```
On the server:
```bash
mkdir -p ~/vciso && tar -xzf ~/vciso-deploy.tar.gz -C ~/vciso && cd ~/vciso
```

## Step 5: Choose the data

**A. Fresh, clean demo data (recommended for a client demo).** Go to step 6 as it is.

**B. Same data as the laptop (all current clients).** Before step 6, copy two values from the laptop's
`ctw-admin\.env` (open it in Notepad) and run on the server:
```bash
export CTW_LICENSE_SECRET='paste the laptop value'
export CTW_DATA_KEY='paste the laptop value'
```

## Step 6: Set everything up (server, about 10 minutes)

```bash
bash deploy/aws/setup-server.sh admin.13-233-10-20.sslip.io
```
It installs Docker, Node.js, Python and Caddy (HTTPS), starts the CTW database in Docker, builds CTW
Admin, starts it as a service (it comes back after a reboot), and prints at the end:
`Done. Open https://admin.13-233-10-20.sslip.io/clients`

With **A**, it also prints `Admin: created ctw.admin with temporary password ...`: copy it. That is the
first login (it asks for a new password).

## Step 7 (only for B): load the laptop's database

1. Laptop: start Anis (`anis\start.bat`), choose `ctw-admin-db-1` / `ctw`, untick "INSERT lines",
   click **Download SQL**. You get e.g. `Downloads\ctw_2026-10-22_1530.sql`.
2. Laptop, copy it up (put the real file name):
   ```powershell
   scp -i "$env:USERPROFILE\.ssh\lightsail.pem" "$env:USERPROFILE\Downloads\ctw_2026-10-22_1530.sql" ubuntu@13.233.10.20:~/ctw.sql
   ```
3. Server:
   ```bash
   cd ~/vciso && bash deploy/aws/restore-db.sh ~/ctw.sql
   ```
   Type `YES`. The laptop logins work afterwards (e.g. anish@gmail.com).

## Step 8: Open it

`https://admin.13-233-10-20.sslip.io/clients`

## Useful later

| What | Command (server) |
|---|---|
| Is it running? | `sudo systemctl status ctw-admin` |
| Last log lines | `sudo journalctl -u ctw-admin -n 50` |
| Restart | `sudo systemctl restart ctw-admin` |
| Database container | `cd ~/vciso/ctw-admin && sudo docker compose ps` |
| New code from the laptop | steps 2–4 again (unpack over the same folder), then `bash deploy/aws/setup-server.sh <site name>` |

The CTW database is reachable only from the server itself; port 4500 only through HTTPS (Caddy).
