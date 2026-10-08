#!/bin/sh
# Backup diário do banco. Agende no crontab da VM:
#   0 4 * * * /home/ubuntu/fuzil-disparador/deploy/backup.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose exec -T db pg_dump -U fuzil fuzil | gzip > "backups/fuzil-$(date +%F).sql.gz"
# Mantém os últimos 14 dias
find backups -name 'fuzil-*.sql.gz' -mtime +14 -delete
