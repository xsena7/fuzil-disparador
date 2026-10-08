#!/bin/bash
# Atualiza o servidor quando ha commit novo na branch de deploy.
set -euo pipefail
BRANCH="${1:-main}"
cd "$(dirname "$0")/.."
git fetch -q origin "$BRANCH"
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH")" ]; then
  echo "[$(date)] atualizando para $(git rev-parse --short "origin/$BRANCH")"
  git reset -q --hard "origin/$BRANCH"
  chmod +x deploy/*.sh
  docker compose up -d --build
  docker image prune -f >/dev/null
fi
