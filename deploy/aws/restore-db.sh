#!/usr/bin/env bash
# Replaces the server's CTW database with a copy of the laptop's (an .sql file from Anis "Download SQL"
# or pg_dump). Everything in the server's CTW database is lost. Run from the project folder:
#
#   bash deploy/aws/restore-db.sh ~/ctw.sql
#
# Client licences stay valid only if ctw-admin/.env has the laptop's CTW_LICENSE_SECRET (and CTW_DATA_KEY).
set -euo pipefail
FILE="${1:?usage: bash deploy/aws/restore-db.sh <file.sql>}"
[ -f "$FILE" ] || { echo "No such file: $FILE"; exit 1; }
cd "$(cd "$(dirname "$0")/../.." && pwd)/ctw-admin"

read -r -p "This deletes the server's CTW data and loads $FILE. Type YES to go on: " ok
[ "$ok" = "YES" ] || { echo "Stopped, nothing changed."; exit 1; }

sudo systemctl stop ctw-admin || true
psql_db() { sudo docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q "$@"' -- "$@"; }
psql_db -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
psql_db < "$FILE"
npm run db:migrate
sudo systemctl start ctw-admin
echo "Loaded. Clients: $(sudo docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT count(*) FROM ctw_client"')"
