# Fuzil Disparador

SaaS para gerenciar BMs do WhatsApp e disparar templates de utilidade em escala pela Cloud API oficial (multi-conta, créditos, chat, resposta automática).

## Como falar com o dono
- Sempre em português, simples e direto. Um passo de cada vez quando for guiar na Meta.
- Nunca pedir/aceitar tokens, App Secret ou senhas no chat. O repositório é PÚBLICO: nunca commitar segredos.

## Stack
Next.js 15 (App Router, server actions, `useActionState`) · Prisma 6 + Postgres · Tailwind 4 · worker em `src/worker/index.ts` (empacotado com esbuild em `dist/worker.mjs`).
Produção: VM Oracle grátis, Docker Compose (db, app, worker, caddy). O servidor puxa a branch `claude/fuzil-disparador-bm-manager-cfasqv` a cada 5 min (`deploy/auto-update.sh`) e remonta tudo.

## Onde fica cada coisa
- Disparo: `src/lib/dispatcher.ts` (rodízio, créditos, estorno, retry). Créditos: `src/lib/credits.ts`.
- Meta Graph API: `src/lib/meta.ts`. Sincronização de WABA/números/templates: `src/lib/sync.ts`. Webhook: `src/lib/webhook.ts`.
- Chat: `src/lib/chat.ts`, `src/app/(app)/chat/`. Templates padrão (com versões numeradas): `src/lib/blueprints.ts`.
- BMs com problema (grupo automático): `src/lib/bm-problems.ts`. O que falta para disparar: `src/lib/readiness.ts`.
- Logo: `src/components/brand.tsx`. Gaveta padrão: `src/components/drawer.tsx`.
- Server actions: `src/app/actions/*.ts`. Telas: `src/app/(app)/*`. Site público: `src/app/site/*`.

## Regras do projeto
- Toda mudança visível: subir a versão e adicionar o item em `src/version.ts` (lista de novidades, em português).
- Mudou o schema: criar migration em `prisma/migrations/<timestamp>_<nome>/migration.sql` (gerar com `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`). O app roda `migrate deploy` ao subir.
- Erros para o cliente: usar `friendlyError` (`src/lib/meta-errors.ts`).
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
