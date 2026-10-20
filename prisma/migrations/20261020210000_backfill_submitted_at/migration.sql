-- Templates padrão enviados antes de o Fuzil guardar o horário: usa a data em que o Fuzil criou a cópia
UPDATE "TemplateDeployment" SET "submittedAt" = "createdAt" WHERE "submittedAt" IS NULL AND "status" <> 'ERROR';

UPDATE "Template" t
SET "submittedAt" = d."submittedAt"
FROM "TemplateDeployment" d
JOIN "TemplateBlueprint" b ON b."id" = d."blueprintId"
WHERE t."submittedAt" IS NULL
  AND t."wabaId" = d."wabaId"
  AND t."name" = COALESCE(d."currentName", b."name")
  AND t."language" = b."language"
  AND d."submittedAt" IS NOT NULL;
