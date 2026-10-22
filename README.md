# vCISO Platform

**Getting started: see [SETUP.md](SETUP.md)** — install, onboard a client, start its database, link, run.
CTW staff onboarding real clients: **[ctw-admin/README.md](ctw-admin/README.md)**.

| Folder | What |
|---|---|
| `ctw-admin/` | **CTW Admin**: CTW's tool (browser UI + API + central database) to onboard clients and generate each client's database and Docker image. Never shipped to a client |
| `Dockerfile`, `Dockerfile.dockerignore` | The per-client image: UI + API, the client's `instance.json` built in, only its licensed modules |
| `intake/` | The intake validator (`client_intake.py`, used by CTW Admin) and the older stand-alone intake UI (`python3 intake/server.py`) |
| `db/` | Schema generators: `generate_schema.py` (workbook → master schema, `SCHEMA_DIFF.md`), `generate_client_schema.py` (one client's database) |
| `scripts/build_client_bundle.py` | Spec → `dist_client/<Cust>/`: `<Cust>_init.sql`, `instance.json`, `initial_credentials.txt`, compose file, README |
| `src/` | The client's API (Express); also serves the built UI |
| `vciso-platform/vciso-app/` | The UI (React / Vite) |

## Run a client instance

At a client, the platform comes as an image from CTW Admin: `docker load` it and `docker compose up -d`
with the files that came with it (their `README.md` says how). Below: running a client from source, for
development.

A client runs one database and one platform (UI + API). The platform is tied to that database:
`instance.json` (from the bundle) says which client and licence it is, and `npm run link` pins it to one
database. Against any other database — another client's, or a second copy of the same client's — the API
serves only `/api/health` and `/api/instance`, and says why in its log.

```bash
# 1. Database: load the client's SQL into an EMPTY database (the bundle's compose file does this)
cd dist_client/Cust_00101 && docker compose up -d db && cd ../..

# 2. Link this instance to that database (once; again with --relink to move it)
export CTW_INSTANCE_DIR=dist_client/Cust_00101
export DATABASE_URL=postgres://vciso_admin:<password>@localhost:5432/vciso_cust_00101
npm run link

# 3. UI + API
(cd vciso-platform/vciso-app && npm install && npm run build)
CTW_DEV_MFA=true npm run dev          # http://localhost:4000 — sign in with initial_credentials.txt
```

For UI work, run `npm run dev` in `vciso-platform/vciso-app` too (http://localhost:5173, proxied to the API on 4000).

Several clients on one machine: give each its own database, `CTW_INSTANCE_DIR`, `DATABASE_URL` and `PORT`.
Each instance only accepts its own database and its own sessions.

`CTW_DEV_MFA=true` hands the sign-in code back to the login page, because the platform cannot send mail
yet. Without it, users whose MFA is on (the intake default) cannot sign in.

## What the UI reads from the client database

| Screens | Tables |
|---|---|
| Sign-in, user menu, permissions | `customer_framework_users`, `customer_framework_role_user`, `ui_report_dashboard_list` |
| Dashboard, overview, company, contacts | `master_customer_details`, `master_customer_address_details`, `master_customer_contact_details`, `master_customer_contract_detail` |
| Sidebar frameworks, audit pages, control detail | `customer_contract_framework_map`, `master_framework`, `master_clause_control_map`, `customer_clause_control_map` |
| Evidence upload / review | `customer_transactions` (files under `CTW_EVIDENCE_DIR`) |
| Asset registry, asset owners | `customer_asset_owner` |
| Vulnerabilities, reports | `vulnerability_finding` (module `vulnerabilities`) |
| Integrations | `tool_api_map`, `customer_api_map` |
| Feature flags | `client_license.licensed_modules` |
| Questionnaires (ISO / DPDP / CSPM) and their review | `assessment`, `assessment_response` (proofs in `customer_transactions`) |
| Audit Management, CARs, report audit figures | `compliance_audit`, `compliance_audit_finding` |
| Tool integrations (Settings, Security Center) | `customer_tool_integration` (API key encrypted) |
| SMTP / Jira / OTX settings | `platform_setting` (secrets encrypted) |
| Threat Intelligence | `threat_intel_feed`, `threat_intel_match` |

The last five rows are platform tables every client gets; the workbook has no sheet for them (see SECTION 2b
of `db/generate_client_schema.py`). Secrets are encrypted with the instance's data
key in `link.json`, which `--relink` keeps: back `link.json` up with the database, or those secrets must
be entered again.

Not stored yet: implementation steps (the API answers `501 not_in_client_schema` on save). Not built yet
(`501 not_available`): scanner connectors, Tenable, scan-file import and schedules, email (MFA codes,
password reset).
