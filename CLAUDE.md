# Fuzil Disparador

SaaS para gerenciar BMs do WhatsApp e disparar templates de utilidade em escala pela Cloud API oficial (multi-conta, créditos, chat, resposta automática).

## Como falar com o dono
- Sempre em português, simples e direto. Um passo de cada vez quando for guiar na Meta.
- Nunca pedir/aceitar tokens, App Secret ou senhas no chat. O repositório é PÚBLICO: nunca commitar segredos.

## Stack
Next.js 15 (App Router, server actions, `useActionState`) · Prisma 6 + Postgres · Tailwind 4 · worker em `src/worker/index.ts` (empacotado com esbuild em `dist/worker.mjs`).
Produção: VM Oracle grátis, Docker Compose (db, app, worker, caddy). O servidor puxa a branch `claude/fuzil-disparador-bm-manager-cfasqv` a cada 1 min (`deploy/auto-update.sh`) e remonta tudo.

## Onde fica cada coisa
- Disparo: `src/lib/dispatcher.ts` (rodízio, créditos, estorno, retry). Créditos: `src/lib/credits.ts`.
- Meta Graph API: `src/lib/meta.ts`. Sincronização de WABA/números/templates: `src/lib/sync.ts`. Webhook: `src/lib/webhook.ts`.
- Chat: `src/lib/chat.ts`, `src/app/(app)/chat/`. Templates padrão (com versões numeradas): `src/lib/blueprints.ts`.
- BMs com problema (grupos automáticos por tipo: Banidas, Pagamento, Template em análise, Qualidade baixa e desconhecido; entram e saem sozinhas): `src/lib/bm-problems.ts`. O que falta para disparar: `src/lib/readiness.ts`.
- Fluxos (conversa em blocos que roda quando o contato responde um disparo; a campanha escolhe o fluxo em `Campaign.flowId`): formato e regras em `src/lib/flow-types.ts`, motor em `src/lib/flows.ts` (chamado no webhook antes da resposta automática; tempos no worker), editor em `src/app/(app)/fluxos/[id]/flow-editor.tsx`, ações em `src/app/actions/flows.ts`.
- Links externos (código fixo na variável do botão, para disparar por outra plataforma): site público em `src/app/site/links/` (fuzildisparador.com.br/links), conta própria com e-mail e senha (`LinksAccount`, sessão em `src/lib/links-auth.ts`; cada conta vê só os próprios links; o login antigo por WhatsApp e o Aquecimento foram removidos), `src/app/actions/links.ts`, resolvido em `src/app/r/[token]/route.ts`.
- Relatório do cliente (métricas + valor + chaves Pix): `src/app/relatorio/report-view.tsx` (logado em `/relatorio/[id]`, público em `/relatorio/p/[token]`, 12h no ar), chaves em `src/lib/pix-keys.ts`, aba em `src/app/(app)/campanhas/[id]/client-report.tsx`.
- Números BR (SMSBear e SMS24h, só WhatsApp Brasil; comprar e registrar na WABA sozinho, troca de número se o SMS não chegar em 2,5 min, modo manual): serviços em `src/lib/sms-providers.ts`, registro automático em `src/lib/smsbear.ts` (roda no worker), painel em `src/app/(app)/conexoes/smsbear-panel.tsx`, simuladores `scripts/mock-smsbear.ts` e `scripts/mock-sms24h.ts`.
- Logo: `src/components/brand.tsx`. Gaveta padrão: `src/components/drawer.tsx`.
- Server actions: `src/app/actions/*.ts`. Telas: `src/app/(app)/*`. Site público: `src/app/site/*`.

## Regras do projeto
- Toda mudança visível: subir a versão e adicionar o item em `src/version.ts` (lista de novidades, em português).
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
