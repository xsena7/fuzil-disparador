#!/bin/bash
# Atualiza o servidor quando ha commit novo na branch de deploy e vigia se o sistema esta de pe.
# Roda a cada 1 minuto pelo cron (com flock: nunca duas ao mesmo tempo).
# Tudo dentro de main(): o bash le o arquivo inteiro antes de rodar. Sem isso, o "git reset" abaixo troca este
# proprio arquivo no meio da execucao e o bash pode executar pedacos misturados (e quebrar a atualizacao).
set -euo pipefail

main() {
  BRANCH="${1:-main}"
  cd "$(dirname "$0")/.."

  # Confere atualizacao a cada 1 minuto (antes era a cada 5)
  if [ -w /etc/cron.d ] && grep -q '^\*/5 .*auto-update.sh' /etc/cron.d/fuzil 2>/dev/null; then
    sed -i 's#^\*/5 \(.*auto-update.sh\)#* \1#' /etc/cron.d/fuzil
  fi
  # Porta 25 aberta no firewall da VM (os e-mails do dominio chegam no servico "mail")
  if command -v iptables >/dev/null 2>&1 && [ "$(id -u)" = "0" ] && ! iptables -C INPUT -p tcp --dport 25 -j ACCEPT 2>/dev/null; then
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 25 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 25 -j ACCEPT
    command -v netfilter-persistent >/dev/null 2>&1 && netfilter-persistent save >/dev/null 2>&1 || true
  fi
  ensure_swap

  git fetch -q origin "$BRANCH"
  TARGET="$(git rev-parse "origin/$BRANCH")"
  # Ultima versao que subiu de verdade (se uma montagem falhar, tenta de novo no proximo minuto)
  DEPLOYED="$(cat .deployed 2>/dev/null || true)"
  if [ "$DEPLOYED" != "$TARGET" ]; then
    # Espera 2 minutos sem commit novo: varias atualizacoes seguidas viram uma montagem so (cada montagem pesa na VM)
    COMMIT_TS="$(git log -1 --format=%ct "$TARGET")"
    if [ $(( $(date +%s) - COMMIT_TS )) -lt 120 ]; then
      echo "[$(date)] commit novo ha menos de 2 min: espera juntar"
    else
      deploy "$DEPLOYED" "$TARGET"
    fi
  fi
  watchdog
}

deploy() {
  local DEPLOYED="$1" TARGET="$2"
  echo "[$(date)] atualizando para $(git rev-parse --short "$TARGET")"
  # O Caddy so reinicia se o Caddyfile mudou (reiniciar derruba o HTTPS por alguns segundos)
  local CADDY_CHANGED=1
  if [ -n "$DEPLOYED" ] && git cat-file -e "$DEPLOYED" 2>/dev/null && git diff --quiet "$DEPLOYED" "$TARGET" -- deploy/Caddyfile; then CADDY_CHANGED=0; fi
  git reset -q --hard "$TARGET"
  git rev-parse --short HEAD > VERSION
  chmod +x deploy/*.sh
  # Monta a imagem nova ANTES de mexer no que esta rodando: se a montagem falhar, o sistema antigo continua no ar
  if ! docker compose build app; then
    echo "[$(date)] montagem com cache falhou, tentando sem cache"
    sed -E 's/--mount=type=cache,target=[^ ]+ //' Dockerfile > Dockerfile.simple
    if ! docker build -f Dockerfile.simple -t fuzil-disparador:latest .; then
      echo "[$(date)] montagem falhou: o sistema antigo continua no ar. Tenta de novo no proximo minuto"
      return 0
    fi
  fi
  docker compose up -d
  echo "$TARGET" > .deployed
  if [ "$CADDY_CHANGED" = "1" ]; then docker compose restart caddy; fi
  docker image prune -f >/dev/null || true
  echo "[$(date)] pronto"
}

# Vigia: se o painel travou (sem responder) ou algum servico parou, reinicia sozinho
watchdog() {
  local s
  for svc in db app worker caddy mail; do
    s="$(docker compose ps -q "$svc" 2>/dev/null || true)"
    if [ -z "$s" ] || [ "$(docker inspect -f '{{.State.Running}}' "$s" 2>/dev/null || echo false)" != "true" ]; then
      echo "[$(date)] vigia: $svc parado, subindo de novo"
      docker compose up -d "$svc" || true
    fi
  done
  s="$(docker compose ps -q app 2>/dev/null || true)"
  if [ -n "$s" ] && [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$s" 2>/dev/null)" = "unhealthy" ]; then
    echo "[$(date)] vigia: painel sem responder, reiniciando"
    docker compose restart app || true
  fi
}

# Memoria de reserva (swap): a montagem da atualizacao pesa e, sem swap, o sistema pode matar o banco ou o painel
ensure_swap() {
  [ "$(id -u)" = "0" ] || return 0
  if [ "$(swapon --show --noheadings 2>/dev/null | wc -l)" = "0" ] && [ ! -f /swapfile-fuzil ]; then
    local mem_kb
    mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
    if [ "$mem_kb" -lt 8000000 ]; then
      echo "[$(date)] criando 2 GB de swap"
      (fallocate -l 2G /swapfile-fuzil || dd if=/dev/zero of=/swapfile-fuzil bs=1M count=2048) \
        && chmod 600 /swapfile-fuzil && mkswap /swapfile-fuzil >/dev/null && swapon /swapfile-fuzil \
        && (grep -q swapfile-fuzil /etc/fstab || echo '/swapfile-fuzil none swap sw 0 0' >> /etc/fstab) || echo "[$(date)] nao deu para criar o swap"
    fi
  fi
}

main "$@"
exit 0
