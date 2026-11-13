# Fuzil Disparador

SaaS para gerenciar BMs do WhatsApp e disparar templates de utilidade em escala pela Cloud API oficial (multi-conta, créditos, chat, resposta automática).

## Como falar com o dono
- Sempre em português, simples e direto. Um passo de cada vez quando for guiar na Meta.
- Nunca pedir/aceitar tokens, App Secret ou senhas no chat. O repositório é PÚBLICO: nunca commitar segredos.

## Stack
Next.js 15 (App Router, server actions, `useActionState`) · Prisma 6 + Postgres · Tailwind 4 · worker em `src/worker/index.ts` (empacotado com esbuild em `dist/worker.mjs`).
Produção: VM Oracle grátis, Docker Compose (db, app, worker, caddy). O servidor puxa a branch `claude/fuzil-disparador-bm-manager-cfasqv` a cada 1 min (`deploy/auto-update.sh`) e remonta tudo.

## Onde fica cada coisa
- Disparo: `src/lib/dispatcher.ts` (rodízio, créditos, estorno, retry; trava `DEAD_STREAK`: número com 15 falhas seguidas sem envio, fora as do contato, sai da campanha). Créditos: `src/lib/credits.ts`. Só admins (`src/lib/sender-cleanup.ts`): `Campaign.autoDeleteFailures` = número com X falhas na campanha sai do rodízio e é excluído (força) — `autoDeleteFailingForCampaign`, chamado no fim de cada tick do dispatcher e pelo worker a cada 1 min.
- Meta Graph API: `src/lib/meta.ts`. Sincronização de WABA/números/templates: `src/lib/sync.ts`. Webhook: `src/lib/webhook.ts`.
- Chat: `src/lib/chat.ts`, `src/app/(app)/chat/`. Templates padrão (com versões numeradas): `src/lib/blueprints.ts`.
- BMs com problema (grupos automáticos por tipo: Banidas, Pagamento, Template em análise, Qualidade baixa e desconhecido; entram e saem sozinhas): `src/lib/bm-problems.ts`. O que falta para disparar: `src/lib/readiness.ts`.
- Fluxos (conversa em blocos que roda quando o contato responde um disparo; a campanha escolhe o fluxo em `Campaign.flowId`): formato e regras em `src/lib/flow-types.ts`, motor em `src/lib/flows.ts` (chamado no webhook antes da resposta automática; tempos no worker), editor em `src/app/(app)/fluxos/[id]/flow-editor.tsx`, ações em `src/app/actions/flows.ts`.
- Aquecimento (aba `/aquecimento`, `src/app/(app)/aquecimento/page.tsx`): é uma `Campaign` com `kind = "WARMUP"` (campanha normal é `"CAMPAIGN"`); a lista de Campanhas e a home filtram `kind: "CAMPAIGN"`. Criada por `createWarmupAction`, que pega o `leadToken` do aquecimento anterior (`takeSiteLink`: o link do site é um só por conta e passa para o mais novo); o quadro do webhook só aparece em aquecimento.
- Cadastro pelo site (webhook): `Campaign.leadToken` → POST `/api/leads/<token>` (`src/lib/leads.ts`): telefone, nome, indicado_por; entra na campanha (que fica sempre aberta) e quem indicou recebe `leadConfirmText` se falou com o número nas últimas 24h. Quadro em `src/app/(app)/campanhas/[id]/lead-webhook.tsx`.
- Links externos (código fixo na variável do botão, para disparar por outra plataforma): site público em `src/app/site/links/` (fuzildisparador.com.br/links), conta própria com e-mail e senha (`LinksAccount`, sessão em `src/lib/links-auth.ts`; cada conta vê só os próprios links; o login antigo por WhatsApp e o Aquecimento foram removidos), `src/app/actions/links.ts`, resolvido em `src/app/r/[token]/route.ts`.
- Relatório do cliente (métricas + valor + chaves Pix): `src/app/relatorio/report-view.tsx` (logado em `/relatorio/[id]`, público em `/relatorio/p/[token]`, 12h no ar), chaves em `src/lib/pix-keys.ts`, aba em `src/app/(app)/campanhas/[id]/client-report.tsx`. Visual escuro em `src/app/relatorio/report.css` (cor da marca em `--rb-a/--rb-b`); diz "Entregues" (as Métricas dizem Enviadas). Planilha de cliques: `src/lib/clicks-export.ts` (Métricas e, no link público, `/api/relatorio/<token>/cliques`, só enquanto o link está no ar; sempre os cliques reais). Marca do revendedor (`ReportBrand`: nome, logo, cores) escolhida por campanha em `Campaign.reportBrandId`; o relatório troca logo/cores e o rodapé diz "gerado pelo Fuzil Disparador".
- Números BR (SMSBear e SMS24h, só WhatsApp Brasil; comprar e registrar na WABA sozinho, troca de número se o SMS não chegar em 2,5 min, modo manual): serviços em `src/lib/sms-providers.ts`, registro automático em `src/lib/smsbear.ts` (roda no worker), painel em `src/app/(app)/conexoes/smsbear-panel.tsx`, simuladores `scripts/mock-smsbear.ts` e `scripts/mock-sms24h.ts`.
- Pix (recargas e loja): `src/lib/pix.ts` escolhe o gateway (Mercado Pago `src/lib/mercadopago.ts` ou SyncPay `src/lib/syncpay.ts`, Admin → Vendas). Pix da SyncPay fica salvo como `sp:<identifier>` em `mpPaymentId`; aviso em `/api/vendas/syncpay` (sem assinatura: só confere na API). Teste: `npx tsx scripts/test-syncpay.ts`.
- Instagram do Fuzil (só admin, `/instagram`): sobe o .zip dos posts (1-1.png… = carrossel, 2.png = único, story-1.png… = story, LEGENDAS.txt; sobe em rascunho e só agenda ao confirmar), agenda um por horário e o worker publica pela Instagram Graph API: `src/lib/instagram.ts`, ações em `src/app/actions/instagram.ts`. Imagens viram JPG em uploads e a Meta baixa por `/media/`. Pausa: `INSTAGRAM_PAUSED_AT` (PlatformSetting, lido direto do banco no `instagramTick`); `resumeInstagram` empurra a fila em dias inteiros.
- Foto de perfil automática do número novo (mulher/homem, escolhida ao adicionar; o worker coloca quando conecta): `src/lib/profile-photos.ts`, fotos padrão em `public/perfil/`, seletor em `src/app/(app)/conexoes/photo-pick.tsx`.
- Visual da plataforma: peças em `src/app/app-theme.css` (`.fz-card` com brilho do mouse via `src/components/app-effects.tsx`, `.fz-btn-fire`, `.fz-stat`, selo do `PageHeader`). Tema escuro é o PADRÃO (botão no menu troca para o claro, cookie `fz_theme=light`, classe `dk` no `<html>`): `src/app/app-dark.css` é GERADO por `python3 scripts/gen-app-dark.py .` a partir das classes claras usadas (rode de novo ao criar tela com cor clara nova); o menu lateral tem `.dk-off`. O mesmo arquivo tem a grade do fundo e a fonte dos títulos (Inter Tight) nos dois temas.
- Logo: `src/components/brand.tsx`. Gaveta padrão: `src/components/drawer.tsx`.
- Server actions: `src/app/actions/*.ts`. Telas: `src/app/(app)/*`. Site público: `src/app/site/*`, todo no visual escuro em `src/app/site/(v2)` (layout com menu e menu do celular; componentes, seções e CSS em `src/app/site/_v2/`, tudo dentro de `.v2`). A inicial é curta; cada item do topo é uma página: `/como-funciona`, `/solucoes`, `/precos`, `/sobre`, `/contato` (`/disparos` mostra a inicial, para os anúncios antigos).
- Pixel da Meta no site (só com cookies aceitos, cookie `fz_px`): `src/components/meta-pixel.tsx` (PageView, ViewContent ao ver #preco, AddToCart em `data-px="AddToCart"`, Contact em link do WhatsApp) + servidor `/api/px` e `src/lib/meta-capi.ts` (mesmo event_id; CompleteRegistration no cadastro do painel e do site de links). ID e token em Admin → Plataforma (`META_PIXEL_ID`, `META_CAPI_TOKEN`); teste com `META_CAPI_TEST_CODE` no servidor.
- Cliques no WhatsApp do site (contador próprio, anônimo, sem cookie): `src/app/site/_v2/wa-click.tsx` → POST `/api/site-click` → tabela `SiteClick` (dia, página, botão, origem pelo utm/referrer); quadro em Admin (`src/app/(app)/admin/site-clicks.tsx`).
- SEO do site: erros da Meta em `/erros` (`src/lib/seo-errors.ts`, usa `meta-errors-text.ts` e `explain.ts`: erro novo traduzido já vira página), guias em `/guias` (mesmo conteúdo de `src/lib/tutorials.ts`, então tutorial não pode ter nada interno), FAQ em `/perguntas`, `src/app/sitemap.ts` e `src/app/robots.ts`.

## Regras do projeto
- Toda mudança visível: subir a versão e adicionar o item em `src/version.ts` (lista de novidades, em português). Cliente vê só o resumo por área ("Melhorias em: ..."); item de ferramenta interna (ajuste do relatório, Financeiro, Admin, vendas do dono) começa com `[admin] `. Nunca importar `src/version.ts` em componente "use client".
- Mudou o schema: criar migration em `prisma/migrations/<timestamp>_<nome>/migration.sql` (gerar com `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`). O app roda `migrate deploy` ao subir.
- Erros para o cliente: usar `friendlyError`/`metaErrorText` (`src/lib/meta-errors.ts`). Todo erro da Meta aparece em português simples, para leigo: códigos e frases em inglês ficam traduzidos em `src/lib/meta-errors-text.ts` (roda no navegador também). Erro novo da Meta → adicionar lá.
- Alerta vermelho (CRITICAL) só para template que virou marketing, template excluído e banimento: a regra fica em `src/lib/alert-severity.ts` e vale para todo `createAlert`.
- Toda consulta filtra pelo `workspaceId` da conta logada (isolamento entre clientes).
- Visual: minimalista, gavetas com bolinha de status e resumo objetivo do lado de fora.

## Checar antes de subir
```
node_modules/.bin/tsc --noEmit -p .   # tipos
npm test                              # testes
npm run build && npm run build:worker # build de produção
```
Teste local: `pg_ctlcluster 16 main start` (Postgres), `npx tsx scripts/mock-meta.ts` (simulador da Meta na porta 4010), `next dev -p 3100`. Usuário de teste: teste@fuzil.dev / senha12345.
Cuidado: `pkill -f` com um padrão que aparece no próprio comando mata o shell (exit 144); rode pkill num comando separado.

## Commits
Push direto na branch acima (não abrir PR). Rodapé:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <link da sessão>
```
