# FUZIL DISPARADOR

Painel para gerir BMs do WhatsApp (API oficial / Cloud API) e fazer disparos de **templates de utilidade** distribuídos entre vários números de várias BMs.

## O que tem

- **Login e contas** (multi-cliente): cada conta vê só as suas BMs e campanhas. O primeiro usuário cadastrado vira admin da plataforma.
- **Saldo em créditos**: cada mensagem consome créditos (preço configurável por conta no Admin), falhas são estornadas e a campanha pausa sozinha quando o saldo acaba.
- **Conexões**: Embedded Signup (Cloud API e Coexistência) pelo app do Tech Provider, ou conexão manual por ID da WABA. Mostra qualidade, status e limite de cada número/BM, atualizados a cada 10 min e pelos webhooks da Meta.
- **Grupos de BM**: a campanha dispara por um grupo, com rodízio entre todos os números aptos. O painel mostra o limite somado do grupo e quanto ainda está disponível nas últimas 24h.
- **Templates**: puxa os templates de todas as WABAs e cria templates pelo painel (sempre como Utilidade) em várias WABAs de uma vez.
- **Templates padrão**: um template que sobe sozinho em toda BM da conta (ou de um grupo), inclusive nas conectadas depois. Se a Meta classificar como marketing, a cópia é **excluída** e o dono é avisado.
- **Trava anti-marketing**: o motor de disparo só usa cópias de template **APROVADAS e de UTILIDADE** e reconfere a categoria antes de cada leva de envios. Se um template for recategorizado (ou a Meta avisar que vai recategorizar), os números daquela WABA saem do disparo na hora e chega alerta crítico (no painel e no Telegram).
- **Redirecionador de links**: aprove o botão como `https://SEU_DOMINIO_DE_LINKS/{{1}}`. Na campanha você cola o link final, cada pessoa recebe um link único e o painel conta quem clicou (descartando robôs de pré-visualização).
- **Campanhas** em 5 etapas: Template → Conteúdo (variáveis, imagem, link do botão) → Audiência (CSV) → Envio (agora ou agendado, velocidade por número) → Métricas.
- **Métricas**: enviadas, entregues, lidas, cliques (únicos e totais), respostas, descadastros ("SAIR"), não entregues, falhas por motivo (com código da Meta), desempenho por número, evolução por hora, tempos medianos até entregar/ler/clicar e exportação em CSV.
- **Alertas**: recategorização, template rejeitado/pausado, queda de qualidade, mudança de limite, número retirado do disparo, campanha pausada etc.

## Rodar no computador (desenvolvimento)

Precisa de Node 22 e Postgres.

```bash
cp .env.example .env              # preencha DATABASE_URL e ENCRYPTION_KEY (openssl rand -hex 32)
npm install
npx prisma migrate deploy
npm run dev                       # painel em http://localhost:3000
npm run worker                    # em outro terminal: motor de disparo
```

Sem credenciais da Meta, dá pra testar tudo com o simulador:

```bash
npm run mock:meta                 # Graph API falsa na porta 4010
# no .env: META_GRAPH_URL=http://localhost:4010  e  META_SYSTEM_USER_TOKEN=qualquer
# conecte as WABAs 1001 e 1002 em Conexões > Configuração manual
```

Testes: `npm test`.

## Colocar no ar de graça (Oracle Cloud Always Free)

O único custo é o domínio (~R$40/ano no registro.br). Painel, banco e disparos rodam numa VM gratuita.

1. **Crie a conta** em <https://www.oracle.com/cloud/free/>. Eles pedem cartão só para verificar e não cobram nada no plano Always Free. Escolha a região **São Paulo** ou **Vinhedo**.
2. **Crie a VM**: *Compute → Instances → Create instance*.
   - Image: **Ubuntu 24.04**
   - Shape: **Ampere (VM.Standard.A1.Flex)** com 2 a 4 OCPUs e 12 a 24 GB de RAM (tudo dentro do gratuito)
   - Baixe a chave SSH que ele gera.
   - Se aparecer "out of capacity", tente outra Availability Domain ou tente de novo mais tarde.
3. **Libere as portas 80 e 443**: na VCN da instância, em *Security List → Add Ingress Rules*, adicione TCP 80 e TCP 443 a partir de `0.0.0.0/0`. Depois, dentro da VM:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
4. **DNS**: no painel do domínio, crie dois registros **A** apontando para o IP público da VM:
   - `painel.seudominio.com.br` (o painel)
   - `go.seudominio.com.br` (os links dos botões)
5. **Instale e suba**:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER && newgrp docker
   git clone https://github.com/xsena7/fuzil-disparador.git && cd fuzil-disparador
   cp .env.example .env && nano .env
   docker compose up -d --build
   ```
   No `.env`, preencha:
   - `APP_DOMAIN`, `LINK_DOMAIN`
   - `APP_URL=https://painel.seudominio.com.br`
   - `REDIRECT_DOMAIN=go.seudominio.com.br`
   - `POSTGRES_PASSWORD`, `ENCRYPTION_KEY` (gere com `openssl rand -hex 32`)
   - `META_WEBHOOK_VERIFY_TOKEN` (qualquer texto)
6. Acesse `https://painel.seudominio.com.br/cadastro` e crie sua conta (vira admin).
7. **Backup diário**: `crontab -e` e adicione `0 4 * * * /home/ubuntu/fuzil-disparador/deploy/backup.sh`.

Para atualizar depois: `git pull && docker compose up -d --build`.

## Configurar a Meta (quando chegarem as credenciais do Tech Provider)

No `.env`:

| Variável | Onde pegar |
|---|---|
| `META_APP_ID` / `META_APP_SECRET` | App do Tech Provider → Configurações do app → Básico |
| `META_CONFIG_ID` | Facebook Login for Business → Configurações → configuração do WhatsApp Embedded Signup |
| `META_SYSTEM_USER_TOKEN` | Business Settings → Usuários do sistema → gerar token com `business_management`, `whatsapp_business_management`, `whatsapp_business_messaging` |

No app da Meta:

1. **Webhook** (WhatsApp → Configuração): URL de callback `https://painel.seudominio.com.br/api/webhook` com o mesmo `META_WEBHOOK_VERIFY_TOKEN`. Assine os campos: `messages`, `message_template_status_update`, `template_category_update`, `message_template_quality_update`, `phone_number_quality_update`, `phone_number_name_update`, `account_update`, `account_review_update`, `business_capability_update`.
2. **Domínios permitidos** do Facebook Login for Business: adicione `painel.seudominio.com.br` (é por ele que roda o Embedded Signup).
3. Reinicie: `docker compose up -d`.

A tela **Configurações** do painel mostra o que já está configurado e o que falta.

## Alertas no Telegram

1. Crie um bot com o [@BotFather](https://t.me/BotFather) e coloque o token em `TELEGRAM_BOT_TOKEN`.
2. Mande uma mensagem pro bot, pegue seu Chat ID (ex.: com o @userinfobot) e salve em **Configurações** no painel.

## Observações

- **Limite de envio**: a Meta conta o limite por portfólio (BM) em destinatários únicos nas últimas 24h. O motor respeita isso: quando o grupo atinge o limite, a campanha fica aguardando e continua sozinha quando o limite libera.
- **Bloqueios**: a Meta não informa quem bloqueou. Eles aparecem como "não entregue" (erro 131026), junto com números sem WhatsApp.
- **Leituras**: só são contadas para quem mantém a confirmação de leitura ligada.
- **Opt-out**: quem responde SAIR, PARAR, STOP, CANCELAR etc. é descadastrado e não recebe mais nenhuma campanha da conta.
