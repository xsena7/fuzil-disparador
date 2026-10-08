# FUZIL DISPARADOR

Painel para gerir BMs do WhatsApp (API oficial / Cloud API) e fazer disparos de **templates de utilidade** distribuídos entre vários números de várias BMs.

## O que tem

- **Login e contas** (multi-cliente): cada conta vê só as suas BMs e campanhas. O primeiro usuário cadastrado vira admin da plataforma.
- **Saldo em créditos**: cada mensagem consome créditos (preço configurável por conta no Admin), falhas são estornadas e a campanha pausa sozinha quando o saldo acaba.
- **Conexões**: Embedded Signup (Cloud API e Coexistência) pelo app do Tech Provider, ou conexão manual por ID da WABA. Mostra qualidade, status e limite de cada número/BM, atualizados a cada 10 min e pelos webhooks da Meta.
- **Grupos de BM**: a campanha dispara por um grupo, com rodízio entre todos os números aptos. O painel mostra o limite somado do grupo e quanto ainda está disponível nas últimas 24h.
- **Templates**: puxa os templates de todas as WABAs e cria templates pelo painel (sempre como Utilidade) em várias WABAs de uma vez.
- **Templates padrão**: um template que sobe sozinho em toda BM da conta (ou de um grupo), inclusive nas conectadas depois. Se a Meta classificar como marketing, a cópia é **excluída** e o dono é avisado.
- **Trava anti-marketing**: o motor de disparo só usa cópias de template **APROVADAS e de UTILIDADE** e reconfere a categoria antes de cada leva de envios. Se um template for recategorizado (ou a Meta avisar que vai recategorizar), os números daquela WABA saem do disparo na hora e chega alerta crítico no painel.
- **Redirecionador de links**: aprove o botão como `https://go.fuzildisparador.com.br/{{1}}`. Na campanha você cola o link final, cada pessoa recebe um link único e o painel conta quem clicou (descartando robôs de pré-visualização).
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

## Colocar no ar de graça (sem terminal)

O único custo é o domínio. Painel, banco e disparos rodam numa VM gratuita da Oracle, e a instalação é automática.

### 1. Token do GitHub (para o servidor baixar o código)
1. Abra <https://github.com/settings/personal-access-tokens/new>.
2. Nome: `fuzil-servidor`. Validade: a maior disponível.
3. **Repository access → Only select repositories →** `xsena7/fuzil-disparador`.
4. **Permissions → Repository permissions → Contents → Read-only.**
5. Clique em **Generate token** e copie o token (começa com `github_pat_`).

### 2. Conta na Oracle Cloud
1. Acesse <https://www.oracle.com/cloud/free/> e clique em **Start for free**.
2. Na região (*Home Region*), escolha **Brazil East (Sao Paulo)**. Ela não pode ser trocada depois.
3. Eles pedem cartão só para verificar a identidade. O plano Always Free não cobra.

### 3. Criar o servidor
1. No menu ☰: **Compute → Instances → Create instance**. Nome: `fuzil`.
2. **Image and shape → Edit**:
   - *Change image*: **Canonical Ubuntu 24.04**
   - *Change shape*: **Ampere → VM.Standard.A1.Flex**, com **4 OCPUs** e **24 GB** de memória
3. **Networking**: deixe criar a rede nova e marque **Assign a public IPv4 address**.
4. **Add SSH keys**: escolha *Generate a key pair for me* e clique em **Save private key**. Guarde o arquivo, ele serve para emergências.
5. **Show advanced options → Management → Paste cloud-init script**: cole o conteúdo de [`deploy/install.sh`](deploy/install.sh), preenchendo antes as duas primeiras linhas (`GITHUB_TOKEN` e `ADMIN_EMAIL`).
6. Clique em **Create**. Se aparecer *Out of capacity*, troque o *Availability domain* ou tente com 2 OCPUs e 12 GB.

### 4. Liberar as portas 80 e 443
Na página da instância: **Primary VNIC → clique na Subnet → Security Lists → Default Security List → Add Ingress Rules**:
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `80,443`

### 5. DNS no registro.br
Copie o **Public IP address** da instância. No registro.br, abra o domínio e vá em **DNS → Editar zona** (se pedir, ative os servidores DNS do Registro.br). Crie duas entradas:

| Tipo | Nome | Valor |
|---|---|---|
| A | `app` | IP da VM |
| A | `go` | IP da VM |

### 6. Pronto
Depois de uns 15 minutos (instalação e propagação do DNS), abra <https://app.fuzildisparador.com.br/cadastro> e crie sua conta **com o mesmo e-mail colocado em `ADMIN_EMAIL`**. Ela vira a conta de administrador.

O servidor se atualiza sozinho a cada 5 minutos quando sai versão nova do código, e faz backup do banco todo dia às 4h.

## Configurar a Meta (quando chegarem as credenciais do Tech Provider)

No painel, em **Admin → Integração com a Meta** (não precisa mexer no servidor):

| Campo | Onde pegar |
|---|---|
| App ID / App Secret | App do Tech Provider → Configurações do app → Básico |
| Config ID | Facebook Login for Business → Configurações → configuração do WhatsApp Embedded Signup |
| Token do System User | Business Settings → Usuários do sistema → gerar token com `business_management`, `whatsapp_business_management`, `whatsapp_business_messaging` |

No app da Meta:

1. **Webhook**: não precisa alterar o webhook padrão do app (ele pode continuar apontando para outro sistema). Ao conectar cada BM, o Fuzil inscreve a WABA com uma URL própria (`override_callback_uri`) e recebe os eventos só dela. Se o app for exclusivo do Fuzil, também pode usar a URL e o token que aparecem na tela Admin. Assine os campos: `messages`, `message_template_status_update`, `template_category_update`, `message_template_quality_update`, `phone_number_quality_update`, `phone_number_name_update`, `account_update`, `account_review_update`, `business_capability_update`.
2. **Domínios permitidos** do Facebook Login for Business: adicione `app.fuzildisparador.com.br` (é por ele que roda o Embedded Signup).

A tela **Configurações** do painel mostra o que já está configurado e o que falta.


## Observações

- **Limite de envio**: a Meta conta o limite por portfólio (BM) em destinatários únicos nas últimas 24h. O motor respeita isso: quando o grupo atinge o limite, a campanha fica aguardando e continua sozinha quando o limite libera.
- **Bloqueios**: a Meta não informa quem bloqueou. Eles aparecem como "não entregue" (erro 131026), junto com números sem WhatsApp.
- **Leituras**: só são contadas para quem mantém a confirmação de leitura ligada.
- **Opt-out**: quem responde SAIR, PARAR, STOP, CANCELAR etc. é descadastrado e não recebe mais nenhuma campanha da conta.
