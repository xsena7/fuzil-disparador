-- Boas-vindas do gerador de links: texto mais simples (a versão com emoji foi rejeitada pela Meta) e reenvio onde foi rejeitado
UPDATE "TemplateBlueprint"
SET "components" = '[{"type":"BODY","text":"Olá, {{1}}. Seu cadastro no gerador de links foi concluído.\n\nOs avisos de acesso à sua conta serão enviados para este número. Toque em \"Recebi\" para confirmar o recebimento.","example":{"body_text":[["Maria"]]}},{"type":"BUTTONS","buttons":[{"type":"QUICK_REPLY","text":"Recebi"}]}]'::jsonb,
    "updatedAt" = NOW()
WHERE "name" LIKE 'fzlinks_boasvindas_%';

UPDATE "TemplateDeployment" d
SET "status" = 'RETRY', "attempts" = 0, "error" = NULL
FROM "TemplateBlueprint" b
WHERE d."blueprintId" = b."id" AND b."name" LIKE 'fzlinks_boasvindas_%' AND d."status" IN ('REJECTED', 'ERROR', 'MARKETING_ON_CREATE');

-- O aviso de "novo acesso" ficou no grupo antigo quando o grupo do funil foi trocado: acompanha o funil
UPDATE "TemplateBlueprint" b
SET "groupId" = f."groupId", "active" = true, "updatedAt" = NOW()
FROM "Funnel" f
WHERE b."id" = f."loginBlueprintId" AND f."groupId" IS NOT NULL AND b."groupId" IS DISTINCT FROM f."groupId";
