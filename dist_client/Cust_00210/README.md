# CyberTrustWorks vCISO Platform — Client Deployment Guide

**Client:** Nimbus Logistics Pvt Ltd  
**Tenant Code:** `Cust_00210`  
**Licensed Frameworks:** [102, 103]  
**Licensed Modules:** ['compliance', 'vulnerabilities', 'alerting', 'news_breach_watch']  

---

## License Entitlements & Hard Quotas
- **Total User Accounts:** Up to 20 active users
- **vCISO Quota:** Up to 2 vCISO account(s)
- **Organisation Owner Quota:** Up to 1 account(s)
- **Control Owners:** Up to 10 user(s)
- **Frameworks:** Up to 2
- **API Tool Integrations:** Up to 5 scanner connections
- **License Expiry:** 2027-10-20

*Note: The database refuses users, vCISOs, Organisation Owners, control owners, API integrations and frameworks beyond the licence, and any new entitlement after the licence expires.*

---

## Deployment Instructions

### 1. Load Docker Image
```bash
docker load -i vciso-platform-cust_00210.tar.gz
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

On its first start the platform links itself to this database (`docker compose logs api` shows
`first start: linked to database`). From then on it serves only this database, and this database only it.
The link and the uploaded evidence are on the `vciso_data` volume: **back it up together with the database**.
A restored database on a new volume is linked again with:
```bash
docker compose run --rm api node dist/cli/link.js --relink
docker compose restart api
```

### 4. Verify Health & Sign In
- Health check: `curl http://localhost:4000/api/health` shows `"database": "connected"` and `"linked": true`
- Open your browser at: `http://localhost:4000`
- Initial vCISO login: `arjun.mehta`
- CyberTrustWorks sends each initial user's one-time password separately from these files. Each user must
  change it at first sign-in.
- If sign-in stops at the verification code: this platform version cannot send e-mail yet, so codes for
  multi-factor sign-in do not arrive. Contact CyberTrustWorks.

---

## Operating the Platform

### Back up (both, together)
- The database: `docker compose exec -T db pg_dump -U vciso_admin -d vciso_cust_00210 -Fc > vciso-YYYYMMDD.dump`
- The `vciso_data` volume: it holds the platform's link to this database (and the key that protects stored
  tool credentials) and the uploaded evidence. Without it, a restored database must be linked again and
  stored credentials entered again.

### Updates from CyberTrustWorks
A platform update comes as a new image with an `UPGRADE.md`: load the image, use the new
`docker-compose.yml`, `docker compose up -d api`. Your database and data are kept.

### If the platform reports "NOT LINKED"
`docker compose logs api` says why. The platform serves only the database it first linked to; after
restoring the database onto a new `vciso_data` volume, link again:
`docker compose run --rm api node dist/cli/link.js --relink`, then `docker compose restart api`.
