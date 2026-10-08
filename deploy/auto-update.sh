#!/bin/bash
# Atualiza o servidor quando ha commit novo na branch de deploy.
set -euo pipefail
BRANCH="${1:-main}"
cd "$(dirname "$0")/.."
git fetch -q origin "$BRANCH"
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH")" ]; then
  echo "[$(date)] atualizando para $(git rev-parse --short "origin/$BRANCH")"
  git reset -q --hard "origin/$BRANCH"
  git rev-parse --short HEAD > VERSION
  chmod +x deploy/*.sh
  docker compose up -d --build
  # Reinicia o Caddy para reler o Caddyfile da pasta deploy (ex.: domínio novo)
  docker compose restart caddy
  docker image prune -f >/dev/null
fi
