# CTW Admin

CyberTrustWorks' own tool for onboarding clients and generating, for each client, the database and the
Docker image (UI + API) it runs. CTW staff use it in the browser; it keeps every client, contract, licence
and build in CTW's central database. Nothing in this folder ships to a client: `Dockerfile.dockerignore`
keeps it out of client images.

```
 CTW Admin (this folder)                                          Client (one per client)
 ───────────────────────                                          ───────────────────────
 Browser ─► UI + API :4500 ─► CTW database :5440                  docker load  vciso-platform-<cust>.tar.gz
                │              (clients, licences, builds, audit) docker compose up -d
                │                                                   ├ db   PostgreSQL ← 001_client_init.sql (first start)
                └─ Generate Docker Image                            └ api  UI + API :4000, links itself to db on
                     spec → validate → seal → schema (Python)              first start; link.json + evidence on /data
                     → docker build → docker save | gzip
                     → files to hand over  ──────────────────────►  (+ one-time passwords, sent separately)
```

Contents: [First-time setup](#first-time-setup) · [Daily use](#daily-use) · [Updates and changes](#updates-and-changes)
· [Operations](#operations) · [Configuration](#configuration) · [Troubleshooting](#troubleshooting) ·
[Security](#security) · [Tests](#tests) · [API](#api) · [Database](#database) · [Known gaps](#known-gaps)

---

## First-time setup

Needs Docker Desktop (running), Node.js 22+, and the project's Python environment (from the project folder:
`python -m venv .venv` and `.venv/Scripts/pip install openpyxl bcrypt`, or `.venv/bin/pip` on Linux / macOS).

**1. Configuration.** From `ctw-admin/`:

```bash
cp .env.example .env
```

Fill in `.env`. Every key is random; make each one with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`:

| Variable | What to put |
|---|---|
| `CTW_DB_PASSWORD` | Database password; the same one inside `CTW_DATABASE_URL` |
| `CTW_SESSION_SECRET` | Random key: signs admin sessions |
| `CTW_DATA_KEY` | Random key: encrypts admins' MFA secrets |
| `CTW_LICENSE_SECRET` | Random key: seals every client licence. **Use the same key for the whole life of the tool** |

Put the three keys in CTW's password manager now (see [Keys](#keys)).

**2. Database, admin, UI.**

```bash
npm install
npm run db:up            # CTW Postgres on port 5440; db/*.sql runs on the empty volume
npm run seed             # catalogues, the first admin (temporary password printed once), the sample client
npm run db:geo           # countries, states, cities and phone codes/lengths for the form (country-state-city, libphonenumber-js)
npm run ui:install
npm run ui:build
npm run dev              # http://localhost:4500
```

**3. First sign-in.** Open http://localhost:4500 and sign in as `ctw.admin` with the temporary password the
seed printed. CTW Admin opens *My account* and nothing else until you have:

1. chosen your own password (12+ characters, not containing your login ID);
2. set up multi-factor sign-in: scan the QR code with an authenticator app (Microsoft Authenticator, Google
   Authenticator, 1Password…), enter the 6-digit code, and save the 10 recovery codes it shows once.

Every later sign-in asks for the password and the app's code. Then add your colleagues under **Admins**.

---

## Daily use

### Onboard a client

1. **Clients → + New client.** Fill in the nine sections: organisation, offices, contacts, contract, licence
   limits, frameworks, modules, integrations & sign-in policy, initial users. The *Checks* panel lists what
   is still wrong in the step on screen; *Save* keeps unfinished work as a draft.
2. **Save & validate** (on the last step, enabled once every step's checks pass). The intake validator (`intake/client_intake.py`) checks the client; when it passes,
   the client is *Ready*.

Customer IDs cannot change once saved. The licence limits are sealed into the client's database: the client
cannot exceed them, and changing them later needs a full build (see below).

### Generate the client's image

On the client's page, **Generate Docker Image → Generate full build**. The build page shows each step and the
log live; a build takes 10–60 seconds once Docker has its cache (the first one, a few minutes).

When it says *Image ready*:

1. **Show passwords** (once) and copy the initial users' one-time passwords into the handover. CTW Admin
   does not keep them; if they are lost, only a new full build makes new ones.
2. Download the files for the client: `vciso-platform-<customer>.tar.gz` (the image), `001_client_init.sql`,
   `docker-compose.yml`, `README.md`.

### Hand over

- Send the four files to the client's IT through CTW's file transfer.
- Send the one-time passwords **separately** (another channel, ideally to each user directly).
- The client follows the `README.md` that came with the files:

  ```bash
  docker load -i vciso-platform-<customer>.tar.gz
  export POSTGRES_PASSWORD='<their own strong password>'
  docker compose up -d
  curl http://localhost:4000/api/health        # "linked": true
  ```

  On its first start the platform links itself to that database; from then on it serves only that
  database, and a second copy is refused.
- Set the client to *Live* when they run it (today in the database:
  `UPDATE ctw_client SET status = 'live' WHERE customer_id = '…'`; there is no button yet).

---

## Updates and changes

| What changed | Build | At the client |
|---|---|---|
| New platform version (code), nothing in the client's record | **Update image only** | `docker load`, new `docker-compose.yml`, `docker compose up -d api` (see `UPGRADE.md`). Database, users and data kept |
| Contacts, offices, users, tools, policies (things kept in the client's database) | Image-only does **not** carry them | They need a full build today, or changing them inside the client's platform |
| Licence: limits, frameworks, modules, validity (renewal) | **Full build** (image-only is refused) | New database from the new SQL: data in the old one is lost unless migrated |
| Platform database schema version changed | **Full build** (image-only is refused) | As above |

The client page shows which of the two builds is possible, why not, and for image-only which recorded
changes it would not carry. A full build of a client that already has one asks you to type the customer ID:
it makes a new instance, and the client's current database will refuse the new image until it is recreated.

There is no way yet to apply a licence renewal or a schema change to a live client's database without
recreating it (see [Known gaps](#known-gaps)).

---

## Operations

### Run it as a service

`npm start` (no file watching) under the service manager of the CTW host (systemd, NSSM on Windows, pm2…).
It listens on `127.0.0.1:4500` only: staff reach it over CTW's VPN, or through a TLS reverse proxy on the same
host that forwards to `http://127.0.0.1:4500`. Never expose port 4500 directly.

The machine needs Docker for builds. Builds run one at a time inside the API process; if the process stops
during a build, the build is marked failed at the next start and can simply be run again.

### Keys

| Key | If it is lost | If it leaks |
|---|---|---|
| `CTW_LICENSE_SECRET` | New builds get seals that do not match delivered licences; image-only updates of delivered clients are refused | Anyone with the code could seal licences: replace it, and plan full builds for every client |
| `CTW_DATA_KEY` | Every admin sets up MFA again (Admins → Reset MFA, from an admin who can still sign in, or in the database) | Rotate it and have every admin set up MFA again |
| `CTW_SESSION_SECRET` | Everyone signs in again | Replace it: every session ends |

Keep all three, and the database password, in CTW's password manager. `.env` is git-ignored.

### Back up

What to keep, together:

| What | How |
|---|---|
| CTW database | `docker exec ctw-admin-db-1 pg_dump -U ctw_admin -d ctw -Fc > ctw-YYYYMMDD.dump` |
| Build files | The folder `ctw-admin/builds/` (`CTW_BUILDS_DIR`): image-only updates start from the last full build's files |
| Keys | `.env` (or the password-manager entries) |

Restore into an empty CTW database:

```bash
npm run db:up    # new, empty volume
docker exec -i ctw-admin-db-1 pg_restore -U ctw_admin -d ctw --clean --if-exists --no-owner < ctw-YYYYMMDD.dump
```

then put `builds/` and `.env` back and start the API. (Both commands checked: a restore brings back every
client, build, admin and audit entry.)

### Upgrade CTW Admin itself

After pulling new code: `npm install`, `npm run ui:install && npm run ui:build`, `npm run db:migrate`, `npm run db:geo`
(applies new `db/NNN_*.sql` files to the existing database; safe to run any time), restart.

### Disk

Each build keeps about 60 MB (mostly the image). On a client's page, **Free disk space** removes the files of
older builds; the last full build and the latest build are always kept, and every build's record and log stay.

---

## Configuration

All in `ctw-admin/.env` (template: `.env.example`).

| Variable | Default | Meaning |
|---|---|---|
| `CTW_DB_USER`, `CTW_DB_PASSWORD`, `CTW_DB_NAME`, `CTW_DB_PORT` | `ctw_admin`, —, `ctw`, `5440` | The CTW Postgres container (`docker-compose.yml`) |
| `CTW_DATABASE_URL` | — | Connection string the API, seed and migrations use |
| `CTW_ADMIN_HOST`, `CTW_ADMIN_PORT` | `127.0.0.1`, `4500` | Where the API and UI listen |
| `CTW_SESSION_SECRET` | — (required) | Signs admin sessions (32+ characters) |
| `CTW_SESSION_TTL_SECONDS` | `28800` | Session length (8 hours) |
| `CTW_DATA_KEY` | — (required) | Encrypts admins' MFA secrets (32+ characters) |
| `CTW_REQUIRE_MFA` | `true` | Every admin must use an authenticator app. `false` only for local development |
| `CTW_LICENSE_SECRET` | — (required for builds) | Seals client licences (32+ characters) |
| `CTW_BUILDS_DIR` | `ctw-admin/builds` | Where bundles and image files are kept |
| `CTW_IMAGE_REPO` | `cybertrustworks/vciso-platform` | Name of the client images (`<repo>:<customer>-v<n>`) |
| `CTW_PYTHON` | the project's `.venv` | Python with `openpyxl` and `bcrypt` |
| `CTW_ADMIN_LOGIN`, `CTW_ADMIN_NAME`, `CTW_ADMIN_EMAIL` | `ctw.admin`, … | The first admin `npm run seed` creates (only while there is none) |

---

## Troubleshooting

| You see | Meaning and fix |
|---|---|
| API does not start: `CTW_SESSION_SECRET must be set` / `CTW_DATA_KEY must be set` | A key is missing or shorter than 32 characters in `.env` |
| Full build fails: `bundle refused at seal: CTW_LICENSE_SECRET must be set` | Set `CTW_LICENSE_SECRET` in `.env` and restart |
| Build fails: `docker build failed (exit 125)` or `cannot run docker` | Docker Desktop is not running on the CTW host |
| Build fails: `bundle refused at validate: …` | The client's record changed outside the form, or a date passed (licence end): edit and *Save & validate* |
| *Update image only* is disabled: `The licence changed since vN` | Limits, frameworks, modules or validity differ from the delivered build: a full build is needed, or put the delivered values back |
| *Update image only* is disabled: `The platform's database schema changed` | This code expects another client database shape: a full build is needed |
| `Too many failed attempts. Try again in 15 minutes.` | Five wrong passwords (or codes) for that login. Waiting is the only way (or restarting the API) |
| Lost phone | Sign in with a recovery code; then ask another admin for *Reset MFA* and set up the new phone |
| Lost phone **and** recovery codes, and no other admin | In the database: `UPDATE ctw_admin_user SET mfa_enabled=false, mfa_secret_enc=NULL, mfa_last_step=NULL, recovery_codes='{}', session_version=session_version+1 WHERE login_id='…';` then set MFA up again at the next sign-in |
| `The one-time passwords were already shown, or expired` | They are shown once, within an hour, and not kept after an API restart. Only a new full build makes new ones |
| Cannot open CTW Admin from another computer | It listens on 127.0.0.1 by design: use the VPN / reverse proxy |
| Client: `NOT LINKED — this database is not Cust_…'s: database was generated for instance …` | The client runs an image from another full build than its database: use the image that belongs to that database, or recreate the database from the new build's SQL |
| Client: `automatic link refused: … already linked … by another installation` | A second copy of the platform on the same database (a new `/data` volume). Use the original volume, or `docker compose run --rm api node dist/cli/link.js --relink` if the original installation is gone |
| Client users cannot sign in: the sign-in stops at the code | See [Known gaps](#known-gaps): MFA codes cannot be sent by mail yet |

---

## Security

| What | How |
|---|---|
| Sign-in | Password, then a 6-digit code from an authenticator app (TOTP, `src/totp.js`), or a one-time recovery code. Required for every admin while `CTW_REQUIRE_MFA` is `true` |
| First sign-in | Temporary password (seed, new admin, reset): the admin must choose their own (12+ characters), then set up MFA, before anything else opens |
| Secrets at rest | Passwords bcrypt (pgcrypto); TOTP secrets AES-256-GCM under `CTW_DATA_KEY` (`src/secrets.js`); recovery codes SHA-256. Client one-time passwords: bcrypt hashes in the SQL, plain text only once on screen |
| Sessions | Signed with `CTW_SESSION_SECRET`, 8 hours, tied to the admin's session version: a password change, deactivation, MFA reset or *Sign out everywhere* ends them all |
| Brute force | 5 wrong passwords or codes lock that login for 15 minutes; a TOTP code is accepted once |
| Network | Listens on `127.0.0.1`. CSP, frame and no-sniff headers; `/api` responses are not cached |
| Client images | Built from an allow-list of files (`Dockerfile.dockerignore`): no bundles, passwords, `.env`, `ctw-admin/`; `instance.json` read-only inside; code obfuscated |
| Audit | Every sign-in, account change, client change, build, password reveal and download, in `ctw_audit_log` (Audit page) |

---

## Tests

```bash
npm run test:unit     # ~1 s: TOTP (RFC 6238 vectors), encryption, the form's checks and spec helpers. No DB, no Docker
npm test              # ~30 s: unit + integration: auth / MFA / sessions, clients, admins, audit, build rules, bundle builder
npm run test:e2e      # ~1-2 min: real build, docker load + compose up like a client, sign-in, image-only upgrade,
                      #           full rebuild refused by the old database, nothing private in the image
```

Tests never touch the real CTW database or `.env`. Each integration / e2e file starts its own Postgres
container on a random port (`test/helpers/harness.js`) loaded from `db/*.sql`, seeds it, runs the API as a child
process with test-only keys and a temporary builds folder, and removes all of it afterwards. They need Docker
(skipped with a reason when it is not running) and the project `.venv` with `openpyxl` and `bcrypt`. The
sample client's dates are moved to today (`test/helpers/fixtures.js`), so the tests do not expire with it.

---

## API

Everything except `/api/health` and the sign-in calls needs `Authorization: Bearer <token>`. Until an admin has
finished first sign-in, other calls answer `403 { code: "password_change_required" | "mfa_setup_required" }`.

**Sign-in and own account** (`src/routes/auth.js`)

| Route | What |
|---|---|
| `POST /api/auth/login` | `{ login_id, password }` → `{ token, admin, pending }`, or `{ mfa_required, challenge }` when the admin has MFA |
| `POST /api/auth/login/mfa` | `{ challenge, code }` or `{ challenge, recovery_code }` → `{ token, admin, pending }` |
| `GET /api/auth/me` | The admin, `pending` set-up steps, MFA state, recovery codes left |
| `POST /api/auth/password` | `{ current_password, new_password }` → new token (other sessions end) |
| `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/confirm` | New TOTP secret + `otpauth://` URI; then `{ code }` → recovery codes (once) and a new token |
| `POST /api/auth/logout-all` | Ends every session of this admin |

**Clients** (`src/routes/clients.js`, `catalogue.js`) — a client is read and written as one spec in the shape of
`intake/intake_schema.json`

| Route | What |
|---|---|
| `GET /api/frameworks`, `/api/modules`, `/api/options` | Choices for the form |
| `GET /api/clients`, `GET /api/clients/:id` | List (status, contract end, licence expiry, last build); one client with its `spec` |
| `POST /api/clients`, `PUT /api/clients/:id` | Create (`draft`) / replace the spec (ID fixed; `ready` drops back to `draft`) |
| `POST /api/clients/:id/validate` | The intake validator; `draft` → `ready` when it passes |
| `DELETE /api/clients/:id` | Only a client that was never built |

**Builds** (`src/routes/builds.js`, pipeline `src/builds.js`)

| Route | What |
|---|---|
| `GET /api/clients/:id/build-options` | Whether `full` / `image_only` is allowed, why not, warnings, changes image-only would not carry |
| `POST /api/clients/:id/builds` | `{ build_type, confirm_new_instance }` → `202 { build_id, version, queue_position }` |
| `GET /api/clients/:id/builds` | History with disk use and which builds are kept |
| `GET /api/builds/:id?log_from=n` | Status, result, log from character `n`, downloadable files |
| `POST /api/builds/:id/credentials` | One-time passwords: once, within an hour (then `410`) |
| `GET /api/builds/:id/files/:name` | One of the build's files (fixed list of names) |
| `DELETE /api/builds/:id/files`, `POST /api/clients/:id/builds/cleanup` | Remove a build's files / all but the kept ones |

**Admins and audit** (`src/routes/admins.js`, `audit.js`)

| Route | What |
|---|---|
| `GET /api/admins`, `POST /api/admins` | List; add `{ login_id, full_name, email }` → temporary password (once) |
| `POST /api/admins/:id/deactivate` \| `activate` \| `reset-password` \| `reset-mfa` | Not on yourself; the last active admin stays active |
| `GET /api/audit?action=&customer_id=&before=&limit=` | Newest first; `action` is a prefix (`build.`); page with `next_before` |

---

## Database

`db/001_ctw_schema.sql`, `db/002_security.sql`; `npm run db:migrate` applies new files to an existing database.

| Table | What |
|---|---|
| `ctw_admin_user` | CTW staff: bcrypt password, encrypted TOTP secret, hashed recovery codes, session version |
| `ctw_framework`, `ctw_module` | Catalogues (from `intake/client_intake.py`) |
| `ctw_client` | Client: `draft` / `ready` / `generated` / `live` / `suspended` |
| `ctw_client_office`, `ctw_client_contact` | Offices and contacts |
| `ctw_contract` | Contracts; one `is_current` per client |
| `ctw_licence`, `ctw_licence_module`, `ctw_licence_framework`, `ctw_licence_framework_office` | Licence limits, modules, frameworks and the offices they apply to |
| `ctw_client_tool`, `ctw_client_security_policy`, `ctw_client_news_watch` | Integrations, sign-in policy, news-watch profile |
| `ctw_client_initial_user` | First users of the client; no passwords |
| `ctw_build` | Every build: type, status, instance ID, seal, image tag, spec snapshot, log, files removed |
| `ctw_audit_log` | Who did what |
| `ctw_migration` | Which `db/NNN_*.sql` files the database has had |

Column names follow `intake/intake_schema.json`, so a client's rows map one-to-one back to a spec
(`lib/spec-import.js`, `lib/spec-build.js`).

---

## Known gaps

- **Client sign-in with MFA.** The client platform cannot send mail yet, so a user whose MFA is on cannot
  receive the sign-in code: production sign-in stops after the password. Until mail delivery exists, untick
  *Multi-factor sign-in for every user* (client form → Integrations & security) before the full build: users
  then sign in with their password, and the login page fills the code in for them (it labels it "Dev mode
  code"). Checked against a production-mode platform. (Development: `CTW_DEV_MFA=true` does the same for
  every user.)
- **Changing a live client's database.** Image-only builds cannot carry licence renewals, schema changes or
  record changes (users, offices…) into a client's existing database; a full build means a new database.
  A migration path for live clients is not built.
- **Status *Live*** is set in the database by hand; there is no button.
- **Licensed modules without code.** `alerting`, `mobile_access`, `news_breach_watch`, `incidents`,
  `onprem_ai_assessment` can be licensed, but only `compliance` and `vulnerabilities` exist in `src/modules/`:
  the others are left out of the image with a warning in the build log.
- **Browser tests** of the CTW Admin UI were run by hand (headless Edge) and are not part of `npm test`.
