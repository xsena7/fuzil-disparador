#!/bin/bash
# Atualiza o servidor quando ha commit novo na branch de deploy.
set -euo pipefail
BRANCH="${1:-main}"
cd "$(dirname "$0")/.."
# Confere atualização a cada 1 minuto (antes era a cada 5)
if [ -w /etc/cron.d ] && grep -q '^\*/5 .*auto-update.sh' /etc/cron.d/fuzil 2>/dev/null; then
  sed -i 's#^\*/5 \(.*auto-update.sh\)#* \1#' /etc/cron.d/fuzil
fi
# Porta 25 aberta no firewall da VM (os e-mails do domínio chegam no serviço "mail")
if command -v iptables >/dev/null 2>&1 && [ "$(id -u)" = "0" ] && ! iptables -C INPUT -p tcp --dport 25 -j ACCEPT 2>/dev/null; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 25 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 25 -j ACCEPT
  command -v netfilter-persistent >/dev/null 2>&1 && netfilter-persistent save >/dev/null 2>&1 || true
fi
git fetch -q origin "$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
# Última versão que subiu de verdade (se uma montagem falhar, tenta de novo no próximo minuto)
DEPLOYED="$(cat .deployed 2>/dev/null || true)"
if [ "$DEPLOYED" != "$TARGET" ]; then
  echo "[$(date)] atualizando para $(git rev-parse --short "$TARGET")"
  git reset -q --hard "$TARGET"
  git rev-parse --short HEAD > VERSION
  chmod +x deploy/*.sh
  if ! docker compose up -d --build; then
    # Docker sem o cache de montagem (BuildKit): monta do jeito antigo
    echo "[$(date)] montagem com cache falhou, tentando sem cache"
    sed -E 's/--mount=type=cache,target=[^ ]+ //' Dockerfile > Dockerfile.simple
    docker build -f Dockerfile.simple -t fuzil-disparador:latest .
    docker compose up -d
  fi
  echo "$TARGET" > .deployed
  # Reinicia o Caddy para reler o Caddyfile da pasta deploy (ex.: domínio novo)
  docker compose restart caddy
  docker image prune -f >/dev/null
  echo "[$(date)] pronto"
fi
