# vCISO Platform — setup and operating guide

How the pieces fit:

```
 CyberTrustWorks side                                         Client side (one per client)
 ───────────────────                                          ────────────────────────────
 CTW Admin (ctw-admin/, browser, :4500)                        docker load vciso-platform-<cust>.tar.gz
   clients, contracts, licences, builds, audit                docker compose up -d
   in the CTW database (:5440)                                  ├ db   PostgreSQL ← 001_client_init.sql (runs once)
        │ Generate Docker Image                                 └ api  Platform: UI + API (src/ + vciso-platform/vciso-app)
        ▼                                                              instance.json built in; links itself to db
 spec → intake validator → bundle builder ─► files ───────────►        on first start (link.json on /data)
 (intake/)    (scripts/, db/, master workbook)
              → docker build (Dockerfile) → .tar.gz           + one-time passwords, sent separately
```

A client runs **one database and one platform**. The platform is pinned to the database it first links to;
against any other database it refuses to serve data. That is what lets you run several client databases on
one machine without mixing them up.

**Who reads what**

| You are | Read |
|---|---|
| CTW staff onboarding clients and generating their images | [`ctw-admin/README.md`](ctw-admin/README.md): set-up, daily use, updates, back-ups, troubleshooting |
| A client's IT deploying the platform | The `README.md` that comes with the client's files (written by `scripts/build_client_bundle.py`) |
| A developer working on the platform or the generators | This guide: install, generate a bundle by hand, run a client from source |

---

## 0. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Docker Desktop (running) | any recent | `docker info` |
| Node.js | 22 or newer | `node -v` |
| Python | 3.10 or newer | `python3 --version` |

## 1. Install (once)

From the project folder:

```bash
python3 -m venv .venv
.venv/bin/pip install openpyxl bcrypt           # Windows: .venv\Scripts\pip install openpyxl bcrypt

npm install                                     # API dependencies
(cd vciso-platform/vciso-app && npm install)    # UI dependencies
```

Use `.venv/bin/python` (Windows: `.venv\Scripts\python`) wherever this guide says `python`.

## 2. Master schema (optional — only after changing the workbook or the DECISIONS)

```bash
.venv/bin/python db/generate_schema.py "docs/Master-Framework v13.0 Control-Framework Map.xlsx"
```

Writes `db/init/001_framework_tables.sql` (the 27 workbook tables, no data) and `db/SCHEMA_DIFF.md`
(every difference from the workbook, with the reason). The root `docker-compose.yml` loads that schema
into a development database; it is not needed for running a client.

## 3. Onboard a client (creates its bundle)

**For real clients use CTW Admin** ([`ctw-admin/README.md`](ctw-admin/README.md)): it keeps the client on
record, validates, seals, builds the image and hands over the files, with an audit trail. The ways below
make a bundle by hand, for development and for testing the generators.

Sealing a licence needs CTW's key, which is never in the code. Set it first (32+ characters; the same
key every time, or bundles made with different keys will not match):

```bash
export CTW_LICENSE_SECRET=<the key from ctw-admin/.env>
```

**Either** with the intake UI:

```bash
.venv/bin/python intake/server.py --port 5050
```

Open http://localhost:5050, fill in the client (or press **Load sample**), then **Generate schema**: the spec is validated, sealed and turned into a bundle.

**Or** from the command line, using a spec file (the sample is `intake/sample_client_spec.json`):

```bash
.venv/bin/python intake/client_intake.py --validate intake/sample_client_spec.json
.venv/bin/python scripts/build_client_bundle.py --spec intake/sample_client_spec.json --out dist_client/Cust_00101
```

The builder validates and seals the spec itself. A spec that already carries a `license_seal` that no
longer matches (edited after sealing, or sealed with another key) is refused; `--reseal` seals it again.
`--json --no-credentials-file` is the mode the CTW admin API uses: one JSON result on stdout, passwords
only in that result.

Either way you get `dist_client/<CustomerID>/`:

| File | What it is |
|---|---|
| `client_spec.json` | The sealed spec the bundle was built from |
| `001_client_init.sql` | The client's whole database: tables, licence guard, licensed catalogue, users |
| `instance.json` | Which client / licence this platform instance is |
| `initial_credentials.txt` | One-time passwords of the initial users (keep private) |
| `docker-compose.yml` | Starts the client's PostgreSQL and loads the SQL |
| `README.md` | The client's own deployment notes |

Generating again for the same customer replaces the bundle (new passwords, new instance ID): the
database must then be recreated (step 4, with `down -v`) and linked again (step 5).

## 4. Start the client's database

```bash
cd dist_client/Cust_00101
POSTGRES_PASSWORD=devpass123 POSTGRES_PORT=5432 docker compose up -d db
docker compose logs -f db        # wait for "database system is ready to accept connections"; Ctrl+C
cd ../..
```

- For development start **only `db`** and run the platform from source (steps 5–6). To run the client's
  own image instead (`api` service), build it first: see section 7b.
- The SQL runs only on an **empty** data volume. To start over: `docker compose down -v`, then `up -d db` again.
- If the log shows `ERROR:` the container stops; fix the cause, `down -v`, start again.
- Port 5432 taken (e.g. a local Postgres)? Use another, e.g. `POSTGRES_PORT=5433`.

The database is called `vciso_<customer id in lower case>`, user `vciso_admin`, password as set above.

## 5. Link the platform to that database (once per database)

```bash
export CTW_INSTANCE_DIR=dist_client/Cust_00101
export DATABASE_URL=postgres://vciso_admin:devpass123@localhost:5432/vciso_cust_00101
npm run link
```

This checks the database was generated for this client and licence and writes `link.json` next to
`instance.json`. Keep `link.json` with the database: it holds the session key and the key that encrypts
stored secrets (tool API keys, SMTP / Jira secrets).

| Message | Meaning |
|---|---|
| `linked to database ...` | Done |
| `already linked to database X` | This instance is pinned to another database; `npm run link -- --relink` moves it |
| `this database is not Cust_...'s` | You pointed at another client's database |
| `not a vCISO client database` | Empty database or the dev master schema — load the client SQL first |

## 6. Run the platform (UI + API in one process)

```bash
(cd vciso-platform/vciso-app && npm run build)     # builds the UI into vciso-platform/vciso-app/dist

export CTW_INSTANCE_DIR=dist_client/Cust_00101
export DATABASE_URL=postgres://vciso_admin:devpass123@localhost:5432/vciso_cust_00101
export CTW_DEV_MFA=true
npm run dev                                         # http://localhost:4000
```

Sign in with an **email** and password from `dist_client/Cust_00101/initial_credentials.txt`
(the sample's vCISO is `priya.sharma@acmefinance.com`). The 6-digit code is filled in for you because of
`CTW_DEV_MFA=true`: the platform cannot send mail yet, so without it users with MFA on cannot sign in.

The log line `[instance] Cust_00101 linked to database "..."` means all is well. `NOT LINKED — ...`
explains what is wrong; until then only `/api/health` and `/api/instance` answer.

### UI development (hot reload)

Keep `npm run dev` (step 6) running, then in a second terminal:

```bash
cd vciso-platform/vciso-app && npm run dev          # http://localhost:5173, API calls go to :4000
```

`VITE_API_TARGET=http://localhost:4100 npm run dev` points it at an API on another port.

## 7. Several clients on one machine

Give each client its own database port (step 4), its own folder, and its own API port:

```bash
CTW_INSTANCE_DIR=dist_client/Cust_00101 DATABASE_URL=postgres://...:5432/vciso_cust_00101 PORT=4000 CTW_DEV_MFA=true npm run dev
CTW_INSTANCE_DIR=dist_client/Cust_00202 DATABASE_URL=postgres://...:5433/vciso_cust_00202 PORT=4100 CTW_DEV_MFA=true npm run dev
```

Each platform accepts only its own database and its own sign-ins.

## 7b. The client's Docker image (UI + API)

One image per client: its `instance.json` is built in, and only the modules its licence lists (and this
code base has) are included; the code is obfuscated. The build context is limited by
`Dockerfile.dockerignore`, so bundles, `.env` files and `ctw-admin/` never reach an image.

```bash
docker build --build-context instance=dist_client/Cust_00101 --build-arg BUILD_VERSION=1   -t cybertrustworks/vciso-platform:cust_00101 .
cd dist_client/Cust_00101
POSTGRES_PASSWORD=devpass123 docker compose up -d       # db + api, http://localhost:4000
```

The image links itself to the database on its first start (`CTW_AUTO_LINK`) and keeps `link.json` and
evidence on the `/data` volume (`vciso_data` in the compose file); a second copy with its own volume is
refused. A licensed module with no folder in `src/modules/` yet is left out with a WARNING in the build
log. `--relink` inside the image: `docker compose run --rm api node dist/cli/link.js --relink`.
In production MFA is on and there is no mail delivery yet, so sign-in stops at the code step unless the
container gets `CTW_DEV_MFA=true` (development only).

## 8. Settings reference

| Variable | Used by | Meaning |
|---|---|---|
| `CTW_INSTANCE_DIR` | API, link | Folder with the client's `instance.json` (link.json is written there unless `CTW_LINK_FILE` says otherwise) |
| `CTW_LINK_FILE` | API, link | Where link.json lives (image: `/data/link.json`) |
| `CTW_AUTO_LINK` | API | `true` = link on first start when there is no link.json yet (set in the image) |
| `DATABASE_URL` | API, link | The client's database |
| `PORT` | API | Default 4000 |
| `CTW_DEV_MFA` | API | `true` = show the sign-in code on the login page (development) |
| `CTW_EVIDENCE_DIR` | API | Where uploaded evidence files go (default `<CTW_INSTANCE_DIR>/evidence`) |
| `UI_DIR` | API | Built UI to serve (default `vciso-platform/vciso-app/dist`) |
| `CTW_LICENSE_SECRET` | intake, bundle builder | Key that seals the licence (required, 32+ characters, no default); keep it the same for every build |
| `VITE_API_TARGET` | UI dev server | API to proxy to (default http://localhost:4000) |
| `VITE_SKIP_LOGIN` | UI | `true` = demo user, no sign-in (no data loads without a session) |

## 9. Where to read more

- `ctw-admin/README.md` — CTW Admin: onboarding, builds, updates, back-ups, keys, troubleshooting, API
- `README.md` — which screens use which database tables, and what is not built yet
- `db/SCHEMA_DIFF.md` — every difference between the database and the workbook
- `db/generate_client_schema.py` — what goes into a client database (CLIENT DECISIONS, SECTION 2b platform tables)
- `docs/architecture/` — architecture explained and Scope of Work (v1.1 is current)

## 10. Not built yet

Scanner connectors and Tenable, scan-file import, sending email (sign-in codes, password reset),
implementation-step storage, and the modules `alerting`, `mobile_access`, `news_breach_watch`, `incidents`,
`onprem_ai_assessment` (they can be licensed; a client image leaves them out with a warning).

Because email cannot be sent, users whose MFA is on cannot get their sign-in code in production. Until then,
generate clients with multi-factor sign-in off (CTW Admin: client form → Integrations & security): users then
sign in with their password and the login page fills the code in. Changing a live client's database (licence
renewal, schema change) needs a new database today; see "Known gaps" in `ctw-admin/README.md`.

## 11. Tests

CTW Admin, the bundle builder and the client image have automated tests: in `ctw-admin/`, `npm test`
(~30 s) and `npm run test:e2e` (~1–2 min, builds and runs a client image). See `ctw-admin/README.md`.
