# CyberTrustWorks vCISO Platform — Client Deployment Guide

**Client:** Acme Financial Services International Ltd.  
**Tenant Code:** `Cust_00101`  
**Licensed Frameworks:** [102, 103]  
**Licensed Modules:** ['compliance', 'vulnerabilities', 'alerting', 'mobile_access', 'news_breach_watch', 'incidents']  

---

## License Entitlements & Hard Quotas
- **Total User Accounts:** Up to 25 active users
- **vCISO Quota:** Up to 2 vCISO account(s)
- **Organisation Owner Quota:** Up to 1 account(s)
- **Control Owners:** Up to 20 user(s)
- **Frameworks:** Up to 2
- **API Tool Integrations:** Up to 10 scanner connections
- **License Expiry:** 2027-03-31

*Note: The database refuses users, vCISOs, Organisation Owners, control owners, API integrations and frameworks beyond the licence, and any new entitlement after the licence expires.*

---

## Deployment Instructions

### 1. Load Docker Image
```bash
docker load -i vciso-platform-cust_00101.tar.gz
```

### 2. Configure Environment
Set your database password:
```bash
export POSTGRES_PASSWORD="YourSecurePassword123!"
```

### 3. Initialize & Start Services
Run Docker Compose:
```bash
docker compose up -d
```
The PostgreSQL container runs `001_client_init.sql` once, on first start with an empty data volume: it creates the
tables, the licence guard and the licensed catalogue, and the initial users. If it fails, the container stops and
`docker compose logs db` shows the error; fix it, then `docker compose down -v` and start again.

### 4. Verify Health & Sign In
- Health check: `curl http://localhost:4000/api/health`
- Open your browser at: `http://localhost:4000`
- Initial vCISO login: `priya.sharma`
- One-time passwords for every initial user are in `initial_credentials.txt` (shipped separately from
  this bundle). Each user must change it at first sign-in; delete the file once they have signed in.
