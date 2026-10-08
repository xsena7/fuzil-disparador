#!/bin/bash
# =============================================================================
#  FUZIL DISPARADOR — instalação automática numa VM Ubuntu (Oracle Cloud)
#
#  Cole este script inteiro no campo "Cloud-init script" ao criar a VM
#  (Show advanced options → Management → Paste cloud-init script).
#  Preencha só as 2 linhas abaixo antes de colar.
# =============================================================================
GITHUB_TOKEN="COLE_AQUI_O_TOKEN_DO_GITHUB"
ADMIN_EMAIL="seu-email@exemplo.com"

DOMAIN="fuzildisparador.com.br"
APP_DOMAIN="app.${DOMAIN}"
LINK_DOMAIN="go.${DOMAIN}"
REPO="xsena7/fuzil-disparador"
BRANCH="claude/fuzil-disparador-bm-manager-cfasqv"
DIR="/opt/fuzil-disparador"
# =============================================================================

exec > >(tee -a /var/log/fuzil-install.log) 2>&1
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

# Libera HTTP/HTTPS no firewall interno da imagem Ubuntu da Oracle
apt-get update -y
apt-get install -y git curl iptables-persistent netfilter-persistent
iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

# Docker
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
id ubuntu >/dev/null 2>&1 && usermod -aG docker ubuntu || true

# Código
if [ ! -d "$DIR/.git" ]; then
  git clone --branch "$BRANCH" "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$DIR"
fi
cd "$DIR"

# Configuração (gerada uma vez, com segredos aleatórios)
if [ ! -f .env ]; then
  cat > .env <<ENV
APP_DOMAIN=${APP_DOMAIN}
LINK_DOMAIN=${LINK_DOMAIN}
APP_URL=https://${APP_DOMAIN}
REDIRECT_DOMAIN=${LINK_DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
POSTGRES_PASSWORD=$(openssl rand -hex 16)
ENCRYPTION_KEY=$(openssl rand -hex 32)
META_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 12)
META_GRAPH_VERSION=v23.0
META_GRAPH_URL=https://graph.facebook.com
META_REGISTER_PIN=$(shuf -i 100000-999999 -n 1)
UPLOAD_DIR=/data/uploads
ALLOW_SIGNUP=false
ENV
  chmod 600 .env
fi

docker compose up -d --build

# Backup diário (4h) e atualização automática (a cada 5 min, se houver versão nova)
chmod +x deploy/*.sh
cat > /etc/cron.d/fuzil <<CRON
0 4 * * * root ${DIR}/deploy/backup.sh >> /var/log/fuzil-backup.log 2>&1
*/5 * * * * root flock -n /tmp/fuzil-update.lock ${DIR}/deploy/auto-update.sh ${BRANCH} >> /var/log/fuzil-update.log 2>&1
CRON

echo "FUZIL DISPARADOR instalado. Aponte o DNS de ${APP_DOMAIN} e ${LINK_DOMAIN} para o IP desta VM."
