#!/bin/bash
# Backup diario do banco e dos arquivos enviados (imagens, planilhas). O cron da VM roda as 4h:
#   0 4 * * * root /opt/fuzil-disparador/deploy/backup.sh >> /var/log/fuzil-backup.log 2>&1
# Guarda 14 dias na propria VM. Se BACKUP_UPLOAD_URL estiver no .env (link de envio de um bucket
# do Oracle Object Storage, gratis), manda uma copia para fora da VM tambem.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
DAY=$(date +%F)
DB="backups/fuzil-$DAY.sql.gz"
FILES="backups/arquivos-$DAY.tar.gz"

docker compose exec -T db pg_dump -U fuzil fuzil | gzip > "$DB.tmp"
# Backup vazio ou quebrado nunca substitui um bom
if [ "$(gzip -dc "$DB.tmp" | head -c 200000 | grep -c 'PostgreSQL database dump')" -lt 1 ]; then
  rm -f "$DB.tmp"
  echo "[$(date)] ERRO: backup do banco saiu vazio" >&2
  exit 1
fi
mv "$DB.tmp" "$DB"
docker compose exec -T app tar -czf - -C /data uploads > "$FILES" 2>/dev/null || rm -f "$FILES"

find backups -name 'fuzil-*.sql.gz' -mtime +14 -delete
find backups -name 'arquivos-*.tar.gz' -mtime +14 -delete
echo "[$(date)] backup ok: $(du -h "$DB" | cut -f1) banco, $( [ -f "$FILES" ] && du -h "$FILES" | cut -f1 || echo 0) arquivos"

URL=$(grep -E '^BACKUP_UPLOAD_URL=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -n "$URL" ]; then
  for f in "$DB" "$FILES"; do
    [ -f "$f" ] || continue
    curl -sf -T "$f" "${URL%/}/$(basename "$f")" && echo "[$(date)] enviado para fora da VM: $(basename "$f")" || echo "[$(date)] ERRO ao enviar $(basename "$f")" >&2
  done
fi
