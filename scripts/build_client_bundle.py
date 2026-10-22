#!/usr/bin/env python3
"""CyberTrustWorks Client Release Packaging Pipeline

Automates the complete workflow:
1. Validates the client intake specification and seals its licence (HMAC under CTW_LICENSE_SECRET).
2. Generates the client-specific PostgreSQL schema & seed script.
3. Produces a client docker-compose.yml ready for client-side execution.
4. Generates client deployment instructions.

Usage:
    CTW_LICENSE_SECRET=... python3 scripts/build_client_bundle.py --spec intake/sample_client_spec.json --out dist_client/Cust_00101

For the CTW admin API: --json prints one JSON object on stdout (progress on stderr) with the instance ID,
seal, files and the initial users' one-time passwords; --no-credentials-file keeps those passwords off disk.
Exit status 1 = the build was refused (JSON: ok false, stage, error, errors).
"""

import argparse
import contextlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from intake.client_intake import LicenseSecretError, spec_seal, validate_spec  # noqa: E402

EXCEL_PATH = os.path.join(ROOT, "docs/Master-Framework v13.0 Control-Framework Map.xlsx")


class BundleError(Exception):
    """A build that cannot go on; `stage` says where, `errors` lists validation messages."""

    def __init__(self, stage, message, errors=None):
        super().__init__(message)
        self.stage = stage
        self.errors = errors or []


def build_bundle(spec_path, out_dir, reseal=False, write_credentials=True, log=print, image_tag=None):
    """Validates and seals the spec, then writes the bundle to out_dir. Returns what was built,
    including the initial users' one-time passwords."""
    # Imported here: it loads openpyxl, which validating alone does not need.
    from db.generate_client_schema import bcrypt, build_client_schema, sql_file_name

    if not write_credentials and bcrypt is None:
        # Without bcrypt the passwords would sit in plain text in the client SQL file, so keeping them out
        # of initial_credentials.txt would protect nothing.
        raise BundleError("schema", "--no-credentials-file needs the bcrypt package (pip install bcrypt): "
                                    "without it the one-time passwords end up in plain text in the SQL file")

    with open(spec_path, "r", encoding="utf-8") as f:
        spec = json.load(f)

    cust_id = spec["organization"]["customer_id"]
    cust_name = spec["organization"]["customer_name"]

    log("=======================================================")
    log(f"  CyberTrustWorks Release Builder for: {cust_name}")
    log(f"  Customer ID: {cust_id}")
    log("=======================================================")

    # Step 1: Validate and seal
    log("[1/4] Validating and sealing the intake specification...")
    errors = validate_spec(spec)
    if errors:
        raise BundleError("validate", "the specification is not valid", errors)
    try:
        seal = spec_seal(spec)
    except LicenseSecretError as exc:
        raise BundleError("seal", str(exc))
    given = spec.get("license_seal")
    if given and given != seal and not reseal:
        raise BundleError("seal", "the spec's license_seal does not match its licence: it was changed after sealing, "
                                  "or sealed with another CTW_LICENSE_SECRET (pass --reseal to seal it again)")
    spec["license_seal"] = seal
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "client_spec.json"), "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)
        f.write("\n")
    log(f"  OK  Specification valid; licence sealed {seal[:16]}...")

    # Step 2: Generate schema
    log("[2/4] Generating tailored database schema & filtered seed...")
    if not os.path.exists(EXCEL_PATH):
        raise BundleError("schema", f"master workbook not found: {os.path.relpath(EXCEL_PATH, ROOT)}")
    sql_out = os.path.join(out_dir, sql_file_name(cust_id))
    try:
        # The generator reports on stdout; with a custom log (--json) that output must not reach stdout.
        with contextlib.redirect_stdout(sys.stdout if log is print else sys.stderr):
            schema = build_client_schema(spec, EXCEL_PATH, sql_out, write_credentials=write_credentials)
    except Exception as exc:
        raise BundleError("schema", f"schema generation failed: {exc}")
    log(f"  OK  Database schema created: {sql_out}")

    write_deployment_files(spec, out_dir, log=log, image_tag=image_tag)

    files = sorted(os.listdir(out_dir))
    log(f"[DONE] Client bundle generated at: {out_dir}")
    for f in files:
        log(f"  - {f}")
    return {
        "ok": True,
        "customer_id": cust_id,
        "customer_name": cust_name,
        "instance_id": schema["instance_id"],
        "license_seal": seal,
        "schema_version": schema["schema_version"],
        "out_dir": os.path.abspath(out_dir),
        "files": files,
        "credentials": schema["credentials"],
        "warnings": schema["warnings"],
        "image_tag": image_tag or default_image_tag(cust_id),
    }


def default_image_tag(cust_id):
    return f"cybertrustworks/vciso-platform:{cust_id.lower()}"


def write_deployment_files(spec, out_dir, log=print, image_tag=None):
    """Writes the client docker-compose.yml and README.md for an already-validated spec.
    image_tag: the client image the compose file runs (default: default_image_tag)."""
    from db.generate_client_schema import sql_file_name  # loads openpyxl, as build_bundle does
    cust_id = spec['organization']['customer_id']
    cust_name = spec['organization']['customer_name']
    image = image_tag or default_image_tag(cust_id)
    limits = spec.get('licensing_limits', {})
    vciso = next((u for u in spec.get('initial_users', []) if u.get('role_type') == 'vCISO'), {})

    # Step 3: Generate client docker-compose.yml
    log("[3/4] Generating client docker-compose.yml...")
    compose_content = f"""# ==============================================================================
# CyberTrustWorks vCISO Platform - Client Deployment
# Client: {cust_name} ({cust_id})
# Licensed Users: {limits.get('max_users')} | Max vCISOs: {limits.get('max_vcisos')}
# ==============================================================================
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: vciso_admin
      POSTGRES_PASSWORD: ${{POSTGRES_PASSWORD:-ChangeThisSecureDbPassword2026!}}
      POSTGRES_DB: vciso_{cust_id.lower()}
    ports:
      - "${{POSTGRES_PORT:-5432}}:5432"
    volumes:
      - vciso_pgdata:/var/lib/postgresql/data
      # Turnkey initial schema runs automatically on empty volume:
      - ./{sql_file_name(cust_id)}:/docker-entrypoint-initdb.d/001_client_init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vciso_admin -d vciso_{cust_id.lower()}"]
      interval: 5s
      timeout: 5s
      retries: 10

  # UI + API, built for this client only (its instance.json and licensed modules are inside the image).
  # On first start it links itself to the database above; link.json (session and data keys) and
  # uploaded evidence are kept on vciso_data. Back up vciso_data together with vciso_pgdata.
  api:
    image: {image}
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://vciso_admin:${{POSTGRES_PASSWORD:-ChangeThisSecureDbPassword2026!}}@db:5432/vciso_{cust_id.lower()}
    volumes:
      - vciso_data:/data
    ports:
      - "${{API_PORT:-4000}}:4000"
    depends_on:
      db:
        condition: service_healthy

volumes:
  vciso_pgdata:
  vciso_data:
"""
    compose_out = os.path.join(out_dir, "docker-compose.yml")
    with open(compose_out, "w", encoding="utf-8") as f:
        f.write(compose_content)
    log(f"  OK  Client compose manifest written: {compose_out}")

    # Step 4: Write Client README
    log("[4/4] Writing client deployment guide...")
    readme_content = f"""# CyberTrustWorks vCISO Platform — Client Deployment Guide

**Client:** {cust_name}  
**Tenant Code:** `{cust_id}`  
**Licensed Frameworks:** {[f['framework_id'] for f in spec['selected_frameworks']]}  
**Licensed Modules:** {spec.get('enabled_modules')}  

---

## License Entitlements & Hard Quotas
- **Total User Accounts:** Up to {limits.get('max_users')} active users
- **vCISO Quota:** Up to {limits.get('max_vcisos')} vCISO account(s)
- **Organisation Owner Quota:** Up to {limits.get('max_org_owners')} account(s)
- **Control Owners:** Up to {limits.get('max_control_owners', limits.get('max_users'))} user(s)
- **Frameworks:** Up to {limits.get('max_frameworks')}
- **API Tool Integrations:** Up to {limits.get('max_api_integrations')} scanner connections
- **License Expiry:** {limits.get('valid_to')}

*Note: The database refuses users, vCISOs, Organisation Owners, control owners, API integrations and frameworks beyond the licence, and any new entitlement after the licence expires.*

---

## Deployment Instructions

### 1. Load Docker Image
```bash
docker load -i vciso-platform-{cust_id.lower()}.tar.gz
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
The PostgreSQL container runs `{sql_file_name(cust_id)}` once, on first start with an empty data volume: it creates the
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
- Initial vCISO login: `{vciso.get('login_id', 'admin')}`
- CyberTrustWorks sends each initial user's one-time password separately from these files. Each user must
  change it at first sign-in.
- If sign-in stops at the verification code: this platform version cannot send e-mail yet, so codes for
  multi-factor sign-in do not arrive. Contact CyberTrustWorks.

---

## Operating the Platform

### Back up (both, together)
- The database: `docker compose exec -T db pg_dump -U vciso_admin -d vciso_{cust_id.lower()} -Fc > vciso-YYYYMMDD.dump`
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
"""
    readme_out = os.path.join(out_dir, "README.md")
    with open(readme_out, "w", encoding="utf-8") as f:
        f.write(readme_content)
    log(f"  OK  Client deployment instructions written: {readme_out}")


def main():
    parser = argparse.ArgumentParser(description="CyberTrustWorks Client Release Builder")
    parser.add_argument("--spec", default="intake/sample_client_spec.json", help="Path to client intake spec")
    parser.add_argument("--out", default="dist_client/Cust_00101", help="Target output directory")
    parser.add_argument("--reseal", action="store_true",
                        help="Replace a license_seal that does not match the spec instead of refusing")
    parser.add_argument("--json", action="store_true",
                        help="Print only a JSON result on stdout (progress goes to stderr); for the CTW admin API")
    parser.add_argument("--image-tag", help="Client image the compose file runs (default cybertrustworks/vciso-platform:<customer id>)")
    parser.add_argument("--no-credentials-file", action="store_true",
                        help="Do not write initial_credentials.txt; the passwords are only in the --json result")
    args = parser.parse_args()

    # Progress text is ASCII, but paths and names may not be; a Windows console would otherwise be cp1252.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    log = (lambda *a: print(*a, file=sys.stderr)) if args.json else print
    try:
        result = build_bundle(args.spec, args.out, reseal=args.reseal,
                              write_credentials=not args.no_credentials_file, log=log, image_tag=args.image_tag)
    except BundleError as exc:
        if args.json:
            print(json.dumps({"ok": False, "stage": exc.stage, "error": str(exc), "errors": exc.errors}))
        else:
            print(f"[FAIL] {exc.stage}: {exc}", file=sys.stderr)
            for e in exc.errors:
                print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(result))
    elif args.no_credentials_file:
        print("One-time passwords (shown once; initial_credentials.txt was not written):")
        for c in result["credentials"]:
            print(f"  {c['login_id']}\t{c['role_type']}\t{c['password']}")


if __name__ == "__main__":
    main()
