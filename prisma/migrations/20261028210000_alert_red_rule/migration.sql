-- Vermelho só para template que virou marketing, template excluído e banimento; o resto fica amarelo
UPDATE "Alert" SET "severity" = 'WARNING'
WHERE "severity" = 'CRITICAL'
  AND NOT (
    "title" ~* 'recategorizado: .*→\s*MARKETING'
    OR "title" ~* 'virou MARKETING'
    OR "title" ~* 'foi exclu[ií]do'
    OR ("title" ~* 'banid[oa]s?' AND "title" !~* 'voltou')
    OR "title" ~ ': (DISABLED_UPDATE|ACCOUNT_VIOLATION|ACCOUNT_DELETED|ACCOUNT_OFFBOARDED)$'
  );
UPDATE "Alert" SET "severity" = 'CRITICAL'
WHERE "severity" <> 'CRITICAL' AND "title" ~* 'foi para .*banidas' AND "title" !~* 'voltou';
