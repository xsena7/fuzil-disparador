#!/bin/bash
# Configura uma chave de leitura (Deploy key) para o servidor baixar as
# atualizacoes do repositorio privado sozinho. Rodar uma vez, como root.
set -e
DIR=/opt/fuzil-disparador
KEY=/root/.ssh/fuzil_deploy
REPO=xsena7/fuzil-disparador

mkdir -p /root/.ssh && chmod 700 /root/.ssh
[ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N "" -f "$KEY" -C fuzil-servidor
ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
cat > /root/.ssh/config <<CFG
Host github.com
  IdentityFile $KEY
  IdentitiesOnly yes
CFG

echo
echo "================ COPIE A LINHA ABAIXO ================"
cat "$KEY.pub"
echo "======================================================"
echo
echo "1. Abra: https://github.com/$REPO/settings/keys/new"
echo "2. Title: servidor-oracle"
echo "3. Key: cole a linha acima (comeca com ssh-ed25519)"
echo "4. NAO marque 'Allow write access'. Clique em Add key."
echo
read -r -p "Depois de adicionar a chave no GitHub, aperte Enter aqui... " _ </dev/tty

cd "$DIR"
git remote set-url origin "git@github.com:$REPO.git"
if git fetch -q origin; then
  echo
  echo "OK! Atualizacao automatica ativada. Pode deixar o repositorio privado."
else
  echo
  echo "Ainda nao funcionou. Confira se a chave foi adicionada e rode este comando de novo."
fi
