#!/bin/bash
# Volta o banco para um backup. Uso (como root, na pasta do Fuzil):
#   deploy/restore.sh backups/fuzil-2026-10-22.sql.gz
# ATENCAO: apaga o banco atual e coloca o do backup no lugar.
set -euo pipefail
cd "$(dirname "$0")/.."
FILE="${1:-}"
[ -f "$FILE" ] || { echo "Arquivo nao encontrado. Backups disponiveis:"; ls -1 backups/ 2>/dev/null; exit 1; }
read -r -p "Isso APAGA o banco atual e volta para $FILE. Digite SIM para continuar: " OK </dev/tty
[ "$OK" = "SIM" ] || { echo "Cancelado."; exit 1; }
docker compose stop app worker
docker compose exec -T db psql -U fuzil -d postgres -c "DROP DATABASE IF EXISTS fuzil WITH (FORCE);" -c "CREATE DATABASE fuzil OWNER fuzil;"
gzip -dc "$FILE" | docker compose exec -T db psql -q -U fuzil -d fuzil
docker compose up -d app worker
echo "Pronto: banco restaurado de $FILE"
