#!/usr/bin/env bash
# Sets up CTW Admin on a fresh Ubuntu 24.04 server (AWS Lightsail or EC2), behind HTTPS.
# Run as the ubuntu user from the unpacked project folder:
#
#   bash deploy/aws/setup-server.sh <site name>
#
# <site name>: the address people open, e.g. admin.13-233-10-20.sslip.io (free, no domain needed)
#              or admin.yourdomain.com (its DNS A record must point at this server).
# Optional, before running: export CTW_LICENSE_SECRET=... CTW_DATA_KEY=... to keep the laptop's values
# (needed when the laptop's database is copied here, see restore-db.sh).
# Safe to run again.
set -euo pipefail
SITE="${1:?usage: bash deploy/aws/setup-server.sh <site name>}"
APP="$(cd "$(dirname "$0")/../.." && pwd)"
ADMIN="$APP/ctw-admin"
step() { printf '\n==> %s\n' "$*"; }
rand() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48; }

step "Swap: 2 GB, so image builds do not run out of memory"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

step "Packages: Docker, Node.js 22, Python, Caddy (HTTPS)"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg openssl python3-venv debian-keyring debian-archive-keyring apt-transport-https
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
if ! node -v 2>/dev/null | grep -qE '^v(2[2-9]|[3-9][0-9])'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y && sudo apt-get install -y caddy
fi

step "Python for the generators (.venv with openpyxl, bcrypt)"
[ -x "$APP/.venv/bin/python" ] || python3 -m venv "$APP/.venv"
"$APP/.venv/bin/pip" install --quiet openpyxl bcrypt

step "Settings: ctw-admin/.env (new random secrets unless given)"
if [ ! -f "$ADMIN/.env" ]; then
  DBPASS="$(rand)"
  cat > "$ADMIN/.env" <<EOF
CTW_DB_USER=ctw_admin
CTW_DB_PASSWORD=$DBPASS
CTW_DB_NAME=ctw
# The database is reachable from this server only.
CTW_DB_PORT=127.0.0.1:5440
CTW_DATABASE_URL=postgres://ctw_admin:$DBPASS@localhost:5440/ctw
CTW_ADMIN_LOGIN=${CTW_ADMIN_LOGIN:-ctw.admin}
CTW_ADMIN_NAME=CTW Administrator
CTW_ADMIN_EMAIL=${CTW_ADMIN_EMAIL:-admin@cybertrustworks.example}
CTW_ADMIN_PORT=4500
CTW_ADMIN_HOST=127.0.0.1
CTW_SESSION_SECRET=$(rand)
CTW_LICENSE_SECRET=${CTW_LICENSE_SECRET:-$(rand)}
CTW_DATA_KEY=${CTW_DATA_KEY:-$(rand)}
CTW_REQUIRE_MFA=${CTW_REQUIRE_MFA:-false}
EOF
  chmod 600 "$ADMIN/.env"
  echo "Created ctw-admin/.env"
else
  echo "Kept the existing ctw-admin/.env"
fi

step "CTW database (Docker)"
cd "$ADMIN"
sudo docker compose up -d db
until sudo docker compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; do sleep 2; done

step "CTW Admin: install and build the screens"
npm ci --no-audit --no-fund
npm --prefix ui ci --no-audit --no-fund
npm run ui:build
npm run db:migrate
if [ "$(sudo docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT count(*) FROM ctw_admin_user"')" = "0" ]; then
  npm run seed
  npm run db:geo
fi

step "Service: CTW Admin starts on boot and restarts if it stops"
sudo tee /etc/systemd/system/ctw-admin.service >/dev/null <<EOF
[Unit]
Description=CTW Admin (port 4500)
After=docker.service network-online.target
Requires=docker.service

[Service]
User=$USER
WorkingDirectory=$ADMIN
ExecStartPre=/usr/bin/docker compose up -d db
ExecStart=$(command -v node) src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now ctw-admin
sudo systemctl restart ctw-admin

step "HTTPS: https://$SITE -> CTW Admin"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$SITE {
	encode gzip
	reverse_proxy 127.0.0.1:4500
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

sleep 3
if curl -fsS http://127.0.0.1:4500/api/health >/dev/null; then
  printf '\nDone. Open https://%s/clients\n' "$SITE"
else
  printf '\nCTW Admin did not answer yet. See: sudo journalctl -u ctw-admin -n 50\n'
fi
